import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PRIVATE_DIR = path.resolve(
  process.cwd(),
  process.env.STORAGE_DIR ?? "storage",
);
const PUBLIC_DIR = path.resolve(process.cwd(), "public", "uploads");

// Blocks keys like "../../secret" from escaping the base folder.
function safeJoin(base: string, key: string) {
  const full = path.resolve(base, key);
  if (!full.startsWith(base + path.sep)) throw new Error("Invalid storage key");
  return full;
}

async function write(base: string, key: string, data: Buffer) {
  const full = safeJoin(base, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export const putPrivate = (key: string, data: Buffer) =>
  write(PRIVATE_DIR, key, data);
export const readPrivate = (key: string) =>
  readFile(safeJoin(PRIVATE_DIR, key));

export async function putPublic(key: string, data: Buffer) {
  await write(PUBLIC_DIR, key, data);
  return `/uploads/${key}`; // the URL stored in the database
}
