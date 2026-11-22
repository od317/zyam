import { prisma } from "../prisma";
import type { Prisma } from "../../generated/prisma/client";
import { audit } from "../auth/audit";
import type { Actor } from "../auth/require-user";
import { removeFile } from "../storage";
import type { ImageKind } from "../media/process";
import { assertStaff } from "./common";

export type ImageResult = { ok: true } | { ok: false; error: string };

type Row = { ownerId: number; originalKey: string; urls: (string | null)[] };
type Tx = Prisma.TransactionClient;
const fileCols = {
  originalKey: true,
  thumbUrl: true,
  mediumUrl: true,
  largeUrl: true,
} as const;

// One entry per kind, written out so Prisma checks every call (same style as ingest.ts).
const ops = {
  project: {
    entity: "Project",
    find: async (id: number): Promise<Row | null> => {
      const r = await prisma.projectImage.findUnique({
        where: { id },
        select: { projectId: true, ...fileCols },
      });
      return (
        r && {
          ownerId: r.projectId,
          originalKey: r.originalKey,
          urls: [r.thumbUrl, r.mediumUrl, r.largeUrl],
        }
      );
    },
    remove: (id: number) => prisma.projectImage.deleteMany({ where: { id } }),
    ids: async (ownerId: number) =>
      (
        await prisma.projectImage.findMany({
          where: { projectId: ownerId },
          select: { id: true },
        })
      ).map((x) => x.id),
    setSort: (tx: Tx, id: number, sortOrder: number) =>
      tx.projectImage.update({ where: { id }, data: { sortOrder } }),
  },
  product: {
    entity: "Product",
    find: async (id: number): Promise<Row | null> => {
      const r = await prisma.productImage.findUnique({
        where: { id },
        select: { productId: true, ...fileCols },
      });
      return (
        r && {
          ownerId: r.productId,
          originalKey: r.originalKey,
          urls: [r.thumbUrl, r.mediumUrl, r.largeUrl],
        }
      );
    },
    remove: (id: number) => prisma.productImage.deleteMany({ where: { id } }),
    ids: async (ownerId: number) =>
      (
        await prisma.productImage.findMany({
          where: { productId: ownerId },
          select: { id: true },
        })
      ).map((x) => x.id),
    setSort: (tx: Tx, id: number, sortOrder: number) =>
      tx.productImage.update({ where: { id }, data: { sortOrder } }),
  },
  finish: {
    entity: "Finish",
    find: async (id: number): Promise<Row | null> => {
      const r = await prisma.finishImage.findUnique({
        where: { id },
        select: { finishId: true, ...fileCols },
      });
      return (
        r && {
          ownerId: r.finishId,
          originalKey: r.originalKey,
          urls: [r.thumbUrl, r.mediumUrl, r.largeUrl],
        }
      );
    },
    remove: (id: number) => prisma.finishImage.deleteMany({ where: { id } }),
    ids: async (ownerId: number) =>
      (
        await prisma.finishImage.findMany({
          where: { finishId: ownerId },
          select: { id: true },
        })
      ).map((x) => x.id),
    setSort: (tx: Tx, id: number, sortOrder: number) =>
      tx.finishImage.update({ where: { id }, data: { sortOrder } }),
  },
} as const;

async function removeFiles(row: Row) {
  // A missing file is fine (the maintenance job also sweeps orphans), so errors are ignored here.
  await removeFile("private", row.originalKey).catch(() => {});
  for (const url of row.urls)
    if (url?.startsWith("/uploads/"))
      await removeFile("public", url.slice("/uploads/".length)).catch(() => {});
}

export async function deleteImage(
  actor: Actor,
  kind: ImageKind,
  imageId: number,
): Promise<ImageResult> {
  assertStaff(actor);
  const o = ops[kind];
  const row = await o.find(imageId);
  if (!row) return { ok: false, error: "Image not found" };

  const res = await o.remove(imageId);
  if (res.count === 0) return { ok: false, error: "Image not found" };
  await audit(actor.id, `${kind}.image.delete`, o.entity, row.ownerId, {
    imageId,
  });

  await removeFiles(row); // last: if it fails, the row is already gone
  return { ok: true };
}

export async function reorderImages(
  actor: Actor,
  kind: ImageKind,
  ownerId: number,
  orderedIds: number[],
): Promise<ImageResult> {
  assertStaff(actor);
  const o = ops[kind];

  // The list must be exactly the owner's current images: nothing missing, nothing extra, no duplicates.
  const existing = await o.ids(ownerId);
  const same =
    orderedIds.length === existing.length &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => existing.includes(id));
  if (!same)
    return { ok: false, error: "The image list changed. Reload the page." };

  await prisma.$transaction(async (tx) => {
    // (owner, sortOrder) is unique, so images can't swap places directly.
    // Park them on negative numbers first, then give them their final positions.
    for (const [i, id] of orderedIds.entries())
      await o.setSort(tx, id, -(i + 1));
    for (const [i, id] of orderedIds.entries()) await o.setSort(tx, id, i + 1);
    await audit(
      actor.id,
      `${kind}.image.reorder`,
      o.entity,
      ownerId,
      { order: orderedIds },
      tx,
    );
  });
  return { ok: true };
}
