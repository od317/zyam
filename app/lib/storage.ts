import path from "node:path";
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  stat,
  unlink,
} from "node:fs/promises";
const PRIVATE_DIR = path.resolve(
  process.cwd(),
  process.env.STORAGE_DIR ?? "storage",
);
const PUBLIC_DIR = path.resolve(process.cwd(), "public", "uploads");

type Root = "private" | "public";
const baseOf = (root: Root) => (root === "private" ? PRIVATE_DIR : PUBLIC_DIR);

export async function listFiles(root: Root) {
  const base = baseOf(root);
  let entries;
  try {
    entries = await readdir(base, { recursive: true, withFileTypes: true });
  } catch {
    return []; // the folder doesn't exist yet
  }
  const out: { key: string; mtimeMs: number }[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const full = path.join(e.parentPath, e.name);
    const key = path.relative(base, full).split(path.sep).join("/");
    out.push({ key, mtimeMs: (await stat(full)).mtimeMs });
  }
  return out;
}

export const removeFile = (root: Root, key: string) =>
  unlink(safeJoin(baseOf(root), key));

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
