import "dotenv/config";
import { randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";
import { prisma } from "../app/lib/prisma";
import { encryptSecret } from "../app/lib/auth/crypto";
import { hashPassword } from "../app/lib/auth/password";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npx tsx prisma/setup-otp.ts <email>");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: "Zyam Design",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const plainCodes = Array.from({ length: 10 }, () =>
    randomBytes(6).toString("hex"),
  );
  const codeHashes = await Promise.all(plainCodes.map((c) => hashPassword(c)));

  await prisma.$transaction([
    prisma.backupCode.deleteMany({ where: { userId: user.id } }),
    prisma.backupCode.createMany({
      data: codeHashes.map((codeHash) => ({ userId: user.id, codeHash })),
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { otpSecret: encryptSecret(secret.base32), otpEnabled: true },
    }),
  ]);

  console.log(
    "Add this key in your authenticator app (enter manually):",
    secret.base32,
  );
  console.log("Or this URI:", totp.toString());
  console.log("Backup codes (shown once):\n" + plainCodes.join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
