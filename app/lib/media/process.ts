import sharp from "sharp";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../prisma";
import { readPrivate, putPublic } from "../storage";
import { MAX_PIXELS } from "./validate";

export type ImageKind = "project" | "product" | "finish";

type Delegate = {
  update(args: {
    where: { id: number };
    data: Record<string, unknown>;
  }): Promise<unknown>;
};

// Table and column names come from this fixed list, never from user input,
// so putting them into raw SQL is safe.
export const IMAGE_KINDS = {
  project: {
    table: "ProjectImage",
    ownerCol: "projectId",
    dir: "projects",
    delegate: () => prisma.projectImage as unknown as Delegate,
  },
  product: {
    table: "ProductImage",
    ownerCol: "productId",
    dir: "products",
    delegate: () => prisma.productImage as unknown as Delegate,
  },
  finish: {
    table: "FinishImage",
    ownerCol: "finishId",
    dir: "finishes",
    delegate: () => prisma.finishImage as unknown as Delegate,
  },
} as const;

const SIZES = { thumb: 400, medium: 800, large: 1600 } as const;
const MAX_ATTEMPTS = 3;

export type Job = {
  kind: ImageKind;
  id: number;
  ownerId: number;
  originalKey: string;
  attempts: number;
};

// Atomically claim one waiting image from any of the three tables.
export async function claimJob(): Promise<Job | null> {
  for (const kind of Object.keys(IMAGE_KINDS) as ImageKind[]) {
    const cfg = IMAGE_KINDS[kind];
    const table = Prisma.raw(`"${cfg.table}"`);
    const owner = Prisma.raw(`"${cfg.ownerCol}"`);
    const rows = await prisma.$queryRaw<Omit<Job, "kind">[]>`
      UPDATE ${table}
      SET "lockedAt" = now(), "attempts" = "attempts" + 1
      WHERE "id" = (
        SELECT "id" FROM ${table}
        WHERE "status" = 'processing'
          AND ("lockedAt" IS NULL OR "lockedAt" < now() - interval '10 minutes')
        ORDER BY "createdAt"
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", ${owner} AS "ownerId", "originalKey", "attempts"`;
    if (rows[0]) return { kind, ...rows[0] };
  }
  return null;
}

export async function processJob(job: Job) {
  const cfg = IMAGE_KINDS[job.kind];
  const table = cfg.delegate();
  try {
    const original = await readPrivate(job.originalKey);
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
        `${cfg.dir}/${job.ownerId}/${job.id}-${name}.webp`,
        data,
      );
      if (name === "large") ({ width, height } = info);
    }

    const blur = await base
      .clone()
      .resize({ width: 16 })
      .webp({ quality: 40 })
      .toBuffer();

    await table.update({
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
    await table.update({
      where: { id: job.id },
      data: {
        lastError: message,
        lockedAt: null,
        status: job.attempts >= MAX_ATTEMPTS ? "failed" : "processing",
      },
    });
  }
}
