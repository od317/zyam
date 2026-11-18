import sharp from "sharp";

export const MAX_BYTES = 15 * 1024 * 1024;
export const MAX_PIXELS = 50_000_000;
const EXT = { jpeg: "jpg", png: "png", webp: "webp" } as const;

export class ImageError extends Error {}

export async function checkImage(buffer: Buffer) {
  if (buffer.length === 0) throw new ImageError("Empty file");
  if (buffer.length > MAX_BYTES)
    throw new ImageError("File is too large (max 15 MB)");

  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new ImageError("Not a valid image");
  }

  const ext = EXT[meta.format as keyof typeof EXT];
  if (!ext || !meta.width || !meta.height)
    throw new ImageError("Only JPEG, PNG or WebP images are allowed");
  if (meta.width * meta.height > MAX_PIXELS)
    throw new ImageError("Image dimensions are too large");

  return { ext };
}
