import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

const ALLOWED = new Set([
  "projects",
  "products",
  "finishes",
  "categories",
  "services",
  "settings",
]);
const sha = (s: string) => createHash("sha256").update(s).digest();

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_SECRET;
  const given = req.headers.get("x-internal-secret") ?? "";
  // Comparing hashes keeps the comparison time constant and the lengths equal.
  if (!secret || !timingSafeEqual(sha(given), sha(secret)))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const tags: string[] = Array.isArray(body?.tags)
    ? body.tags.filter(
        (t: unknown): t is string => typeof t === "string" && ALLOWED.has(t),
      )
    : [];
  for (const tag of tags) revalidateTag(tag, { expire: 0 }); // expire now, not "stale while revalidating"
  return Response.json({ ok: true, tags });
}
