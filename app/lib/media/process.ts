import sharp from "sharp";
import { prisma } from "../prisma";
import { readPrivate, putPublic } from "../storage";
import { MAX_PIXELS } from "./validate";

const SIZES = { thumb: 400, medium: 800, large: 1600 } as const;
const MAX_ATTEMPTS = 3;

export type Job = {
  id: number;
  projectId: number;
  originalKey: string;
  attempts: number;
};

// Atomically claim one waiting image. SKIP LOCKED means two workers never take the same row,
// and a row locked more than 10 minutes ago (a crashed worker) becomes claimable again.
export async function claimJob(): Promise<Job | null> {
  const rows = await prisma.$queryRaw<Job[]>`
    UPDATE "ProjectImage"
    SET "lockedAt" = now(), "attempts" = "attempts" + 1
    WHERE "id" = (
      SELECT "id" FROM "ProjectImage"
      WHERE "status" = 'processing'
        AND ("lockedAt" IS NULL OR "lockedAt" < now() - interval '10 minutes')
      ORDER BY "createdAt"
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "projectId", "originalKey", "attempts"`;
  return rows[0] ?? null;
}

export async function processJob(job: Job) {
  try {
    const original = await readPrivate(job.originalKey);
    // rotate() applies the EXIF orientation; sharp drops metadata (GPS etc.) on output by default.
    const base = sharp(original, { limitInputPixels: MAX_PIXELS }).rotate();

    const urls: Record<string, string> = {};
    let width = 0;
    let height = 0;

    for (const [name, w] of Object.entries(SIZES)) {
      const { data, info } = await base
        .clone()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      urls[name] = await putPublic(
        `projects/${job.projectId}/${job.id}-${name}.webp`,
        data,
      );
      if (name === "large") ({ width, height } = info);
    }

    const blur = await base
      .clone()
      .resize({ width: 16 })
      .webp({ quality: 40 })
      .toBuffer();

    await prisma.projectImage.update({
      where: { id: job.id },
      data: {
        status: "ready",
        thumbUrl: urls.thumb,
        mediumUrl: urls.medium,
        largeUrl: urls.large,
        width,
        height,
        blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
        lastError: null,
        lockedAt: null,
      },
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message.slice(0, 500) : "unknown error";
    await prisma.projectImage.update({
      where: { id: job.id },
      data: {
        lastError: message,
        lockedAt: null,
        status: job.attempts >= MAX_ATTEMPTS ? "failed" : "processing",
      },
    });
  }
}
