import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { prisma } from "../prisma";
import { putPrivate } from "../storage";
import { checkImage, ImageError, MAX_PIXELS } from "../media/validate";
import { inquiryInput } from "../validation/inquiry";

export const MAX_IMAGES = 5;

export type InquiryResult =
  | { ok: true; id: number }
  | { ok: false; errors: Record<string, string> };

const fail = (errors: Record<string, string>): InquiryResult => ({
  ok: false,
  errors,
});

export async function createInquiry(
  raw: unknown,
  files: Buffer[],
): Promise<InquiryResult> {
  const parsed = inquiryInput.safeParse(raw);
  if (!parsed.success) {
    return fail(
      Object.fromEntries(
        parsed.error.issues.map((i) => [
          i.path.join(".") || "_form",
          i.message,
        ]),
      ),
    );
  }
  const d = parsed.data;

  if (files.length > MAX_IMAGES)
    return fail({ images: `At most ${MAX_IMAGES} images` });

  // Validate and re-encode one at a time, so memory stays low.
  const encoded: Buffer[] = [];
  try {
    for (const file of files) {
      await checkImage(file);
      encoded.push(
        await sharp(file, { limitInputPixels: MAX_PIXELS })
          .rotate()
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      );
    }
  } catch (e) {
    if (e instanceof ImageError) return fail({ images: e.message });
    throw e;
  }

  // The visitor sends a slug; we look up the id, and quietly ignore unknown or unpublished projects.
  let projectId: number | null = null;
  if (d.projectSlug) {
    const p = await prisma.project.findFirst({
      where: { slug: d.projectSlug, isPublished: true, deletedAt: null },
      select: { id: true },
    });
    projectId = p?.id ?? null;
  }

  const keys: string[] = [];
  for (const buf of encoded) {
    const key = `inquiries/${randomBytes(16).toString("hex")}.webp`;
    await putPrivate(key, buf);
    keys.push(key);
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      type: d.type,
      name: d.name,
      phone: d.phone,
      email: d.email ?? null,
      title: d.title ?? null,
      message: d.message,
      projectId,
      images: { create: keys.map((url) => ({ url })) },
    },
  });
  return { ok: true, id: inquiry.id };
}
