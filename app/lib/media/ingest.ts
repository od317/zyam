import { randomBytes } from "node:crypto";
import { prisma } from "../prisma";
import { Prisma } from "../../generated/prisma/client";
import { audit } from "../auth/audit";
import type { Actor } from "../auth/require-user";
import { putPrivate } from "../storage";
import { checkImage, ImageError } from "./validate";

export async function addProjectImage(
  actor: Actor,
  projectId: number,
  file: Buffer,
) {
  if (actor.role !== "admin" && actor.role !== "editor")
    throw new Error("Not allowed");

  const { ext } = await checkImage(file);

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new ImageError("Project not found");

  const originalKey = `originals/projects/${projectId}/${randomBytes(16).toString("hex")}.${ext}`;
  await putPrivate(originalKey, file);

  // sortOrder = last + 1. Two simultaneous uploads can collide on the unique pair, so retry.
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await prisma.projectImage.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    try {
      const image = await prisma.projectImage.create({
        data: {
          projectId,
          originalKey,
          sortOrder: (last._max.sortOrder ?? 0) + 1,
        },
      });
      await audit(actor.id, "project.image.add", "Project", projectId, {
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
