import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import * as OTPAuth from "otpauth";
import { prisma } from "@/app/lib/prisma";
import { findActiveUserByEmail } from "./users";
import { hashPassword, verifyPassword } from "./password";
import { createSession, hashToken } from "./session";
import { checkRateLimit } from "./rate-limit";
import { decryptSecret } from "./crypto";
import { audit } from "./audit";

const PENDING_COOKIE = "zyam_pending";
const PENDING_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const WINDOW = 15 * 60 * 1000;
const GENERIC_ERROR = "Invalid email or password";

type Meta = { ip?: string; userAgent?: string };
type Result = { ok: true } | { ok: false; error: string };

// A real argon2 hash of a random string, used so "unknown email" costs the same time as "wrong password".
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  return (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));
}

function verifyTotp(secretBase32: string, token: string) {
  const totp = new OTPAuth.TOTP({
    issuer: "Zyam Design",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  return totp.validate({ token, window: 1 }) !== null; // window 1 = tolerate 30s clock drift
}

async function consumeBackupCode(userId: number, code: string) {
  const codes = await prisma.backupCode.findMany({
    where: { userId, usedAt: null },
  });
  for (const c of codes) {
    if (await verifyPassword(c.codeHash, code)) {
      // The usedAt:null guard makes "use once" atomic, so two parallel requests can't both win.
      const res = await prisma.backupCode.updateMany({
        where: { id: c.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      return res.count === 1;
    }
  }
  return false;
}

// STEP 1: email + password
export async function startLogin(
  email: string,
  password: string,
  meta: Meta,
): Promise<Result> {
  const normalized = email.trim().toLowerCase();

  // 1. Rate limit before any expensive work.
  const ipOk = await checkRateLimit(
    `login:ip:${meta.ip ?? "unknown"}`,
    20,
    WINDOW,
  );
  const emailOk = await checkRateLimit(`login:email:${normalized}`, 5, WINDOW);
  if (!ipOk || !emailOk)
    return { ok: false, error: "Too many attempts. Try again later." };

  // 2-3. Find the user, and always run one argon2 verify.
  const user = await findActiveUserByEmail(normalized);
  const passwordOk = await verifyPassword(
    user?.passwordHash ?? (await getDummyHash()),
    password,
  );

  // 4. Same message for unknown email and wrong password.
  if (!user || !passwordOk) {
    await audit(user?.id ?? null, "login.failed", "User", user?.id, {
      email: normalized,
      ip: meta.ip,
    });
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!user.otpEnabled || !user.otpSecret) {
    return {
      ok: false,
      error: "Two-factor setup is required for this account.",
    };
  }

  // 5. Password passed: issue a pending token (NOT a session).
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PENDING_MINUTES * 60 * 1000);
  await prisma.pendingLogin.deleteMany({ where: { userId: user.id } });
  await prisma.pendingLogin.create({
    data: { id: hashToken(token), userId: user.id, expiresAt },
  });

  const jar = await cookies();
  jar.set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return { ok: true };
}

// STEP 2: OTP code or backup code
export async function finishLogin(
  rawCode: string,
  meta: Meta,
): Promise<Result> {
  const jar = await cookies();
  const token = jar.get(PENDING_COOKIE)?.value;
  const expired: Result = { ok: false, error: "Login expired. Start again." };
  if (!token) return expired;

  const pending = await prisma.pendingLogin.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (
    !pending ||
    pending.expiresAt < new Date() ||
    !pending.user.isActive ||
    !pending.user.otpSecret
  ) {
    if (pending)
      await prisma.pendingLogin.delete({ where: { id: pending.id } });
    jar.delete(PENDING_COOKIE);
    return expired;
  }

  // Count the attempt BEFORE checking the code, so parallel guesses can't dodge the limit.
  const updated = await prisma.pendingLogin.update({
    where: { id: pending.id },
    data: { attempts: { increment: 1 } },
  });
  if (updated.attempts > MAX_OTP_ATTEMPTS) {
    await prisma.pendingLogin.delete({ where: { id: pending.id } });
    jar.delete(PENDING_COOKIE);
    return { ok: false, error: "Too many wrong codes. Start again." };
  }

  const code = rawCode.replace(/[\s-]/g, "").toLowerCase();
  const valid = /^\d{6}$/.test(code)
    ? verifyTotp(decryptSecret(pending.user.otpSecret), code)
    : await consumeBackupCode(pending.userId, code);

  if (!valid) {
    await audit(pending.userId, "login.otp_failed", "User", pending.userId, {
      ip: meta.ip,
    });
    return { ok: false, error: "Invalid code" };
  }

  // Success: the pending token is spent; issue the real session.
  await prisma.pendingLogin.delete({ where: { id: pending.id } });
  jar.delete(PENDING_COOKIE);
  await createSession(pending.userId, meta);
  await prisma.user.update({
    where: { id: pending.userId },
    data: { lastLoginAt: new Date() },
  });
  await audit(pending.userId, "login.success", "User", pending.userId, {
    ip: meta.ip,
  });
  return { ok: true };
}
