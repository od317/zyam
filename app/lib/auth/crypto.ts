import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey() {
  const hex = process.env.OTP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64)
    throw new Error("OTP_ENCRYPTION_KEY must be 64 hex chars");
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string) {
  const [iv, tag, enc] = payload
    .split(".")
    .map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8",
  );
}
