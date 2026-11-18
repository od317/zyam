import { randomBytes } from "node:crypto";
import { prisma } from "../prisma";
import { Prisma } from "../../generated/prisma/client";
import { audit } from "../auth/audit";
import type { Actor } from "../auth/require-user";
import { putPrivate } from "../storage";
import { checkImage, ImageError } from "./validate";
import type { ImageKind } from "./process";

// One entry per kind, typed explicitly so Prisma checks every call.
const kinds = {
  project: {
    dir: "projects",
    entity: "Project",
    exists: (id: number) =>
      prisma.project.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      }),
    lastSort: (id: number) =>
      prisma.projectImage.aggregate({
        where: { projectId: id },
        _max: { sortOrder: true },
      }),
    create: (id: number, originalKey: string, sortOrder: number) =>
      prisma.projectImage.create({
        data: { projectId: id, originalKey, sortOrder },
      }),
  },
  product: {
    dir: "products",
    entity: "Product",
    exists: (id: number) =>
      prisma.product.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      }),
    lastSort: (id: number) =>
      prisma.productImage.aggregate({
        where: { productId: id },
        _max: { sortOrder: true },
      }),
    create: (id: number, originalKey: string, sortOrder: number) =>
      prisma.productImage.create({
        data: { productId: id, originalKey, sortOrder },
      }),
  },
  finish: {
    dir: "finishes",
    entity: "Finish",
    exists: (id: number) =>
      prisma.finish.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      }),
    lastSort: (id: number) =>
      prisma.finishImage.aggregate({
        where: { finishId: id },
        _max: { sortOrder: true },
      }),
    create: (id: number, originalKey: string, sortOrder: number) =>
      prisma.finishImage.create({
        data: { finishId: id, originalKey, sortOrder },
      }),
  },
} as const;

export async function addImage(
  actor: Actor,
  kind: ImageKind,
  ownerId: number,
  file: Buffer,
) {
  if (actor.role !== "admin" && actor.role !== "editor")
    throw new Error("Not allowed");
  const cfg = kinds[kind];

  const { ext } = await checkImage(file);
  if (!(await cfg.exists(ownerId))) throw new ImageError("Item not found");

  const originalKey = `originals/${cfg.dir}/${ownerId}/${randomBytes(16).toString("hex")}.${ext}`;
  await putPrivate(originalKey, file);

  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await cfg.lastSort(ownerId);
    try {
      const image = await cfg.create(
        ownerId,
        originalKey,
        (last._max.sortOrder ?? 0) + 1,
      );
      await audit(actor.id, `${kind}.image.add`, cfg.entity, ownerId, {
        imageId: image.id,
      });
      return { id: image.id, status: image.status };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      )
        continue;
      throw e;
    }
  }
  throw new ImageError("Could not save the image, please try again");
}

// Kept so the earlier test scripts still work.
export const addProjectImage = (
  actor: Actor,
  projectId: number,
  file: Buffer,
) => addImage(actor, "project", projectId, file);
