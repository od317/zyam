import { getCurrentUser } from "../auth/session";
import { addImage } from "./ingest";
import type { ImageKind } from "./process";
import { ImageError, MAX_BYTES } from "./validate";

export async function handleImageUpload(
  req: Request,
  kind: ImageKind,
  rawId: string,
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const id = Number(rawId);
  if (!Number.isInteger(id))
    return Response.json({ error: "Bad id" }, { status: 400 });

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
      id,
      Buffer.from(await file.arrayBuffer()),
    );
    return Response.json(res, { status: 201 });
  } catch (e) {
    if (e instanceof ImageError)
      return Response.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
