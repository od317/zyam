import { getCurrentUser } from "@/app/lib/auth/session";
import { addImage } from "@/app/lib/media/ingest";
import { ImageError, MAX_BYTES } from "@/app/lib/media/validate";
import type { ImageKind } from "@/app/lib/media/process";

// A Map, not an object: a key like "constructor" must not match anything.
const KINDS = new Map<string, ImageKind>([
  ["projects", "project"],
  ["products", "product"],
  ["finishes", "finish"],
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const { kind: rawKind, id: rawId } = await params;
  const kind = KINDS.get(rawKind);
  const ownerId = Number(rawId);
  if (!kind || !Number.isInteger(ownerId))
    return Response.json({ error: "Bad request" }, { status: 400 });

  // Refuse early when the browser already says it is too big (the body is not read at all).
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 64 * 1024)
    return Response.json({ error: "File is too large" }, { status: 413 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return Response.json({ error: "File is too large" }, { status: 413 });

  try {
    const res = await addImage(
      user,
      kind,
      ownerId,
      Buffer.from(await file.arrayBuffer()),
    );
    return Response.json(res, { status: 201 });
  } catch (e) {
    if (e instanceof ImageError)
      return Response.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
