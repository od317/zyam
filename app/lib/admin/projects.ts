import { prisma } from "../prisma";
import { Prisma } from "../../generated/prisma/client";
import { audit } from "../auth/audit";
import type { Actor } from "../auth/require-user";
import { ProjectInput, projectInput } from "../validation/project";

export type ActionResult =
  | { ok: true; id: number }
  | { ok: false; errors: Record<string, string> };

const fail = (errors: Record<string, string>): ActionResult => ({
  ok: false,
  errors,
});

// Turns known database errors into friendly field errors; rethrows anything else.
function mapDbError(e: unknown): ActionResult {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return fail({ slug: "This slug is already used" });
    if (e.code === "P2003")
      return fail({ serviceId: "Service does not exist" });
  }
  throw e;
}

async function checkLinks(
  d: ProjectInput,
): Promise<Record<string, string> | null> {
  const errors: Record<string, string> = {};
  const productIds = [...new Set(d.productIds)];
  const finishIds = [...new Set(d.finishIds)];
  if (
    productIds.length &&
    (await prisma.product.count({
      where: { id: { in: productIds }, deletedAt: null },
    })) !== productIds.length
  )
    errors.productIds = "One of the products does not exist";
  if (
    finishIds.length &&
    (await prisma.finish.count({
      where: { id: { in: finishIds }, deletedAt: null },
    })) !== finishIds.length
  )
    errors.finishIds = "One of the finishes does not exist";
  return Object.keys(errors).length ? errors : null;
}

const links = (d: ProjectInput) => ({
  products: {
    create: [...new Set(d.productIds)].map((productId) => ({ productId })),
  },
  finishes: {
    create: [...new Set(d.finishIds)].map((finishId) => ({ finishId })),
  },
});

export async function createProject(
  actor: Actor,
  input: unknown,
): Promise<ActionResult> {
  // 1. permission (the caller already checked; this is the second lock)
  if (actor.role !== "admin" && actor.role !== "editor")
    throw new Error("Not allowed");

  // 2. validate
  const parsed = projectInput.safeParse(input);
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
  const badLinks = await checkLinks(d);
  if (badLinks) return fail(badLinks);
  // 3 + 4. write and audit, together
  try {
    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          slug: d.slug,
          serviceId: d.serviceId,
          year: d.year ?? null,
          durationMonths: d.durationMonths ?? null,
          isPublished: d.isPublished,
          priceMode: d.priceMode,
          priceMin: d.priceMin ?? null,
          priceMax: d.priceMax ?? null,
          translations: {
            create: d.translations.map((t) => ({ ...t, city: t.city ?? null })),
          },
          ...links(d),
        },
      });
      await audit(
        actor.id,
        "project.create",
        "Project",
        p.id,
        { slug: p.slug },
        tx,
      );
      return p;
    });
    return { ok: true, id: project.id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function updateProject(
  actor: Actor,
  id: number,
  input: unknown,
): Promise<ActionResult> {
  if (actor.role !== "admin" && actor.role !== "editor")
    throw new Error("Not allowed");

  const parsed = projectInput.safeParse(input);
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

  const exists = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!exists) return fail({ _form: "Project not found" });

  try {
    await prisma.$transaction(async (tx) => {
      // Replace translations wholesale: simpler than diffing, and safe inside a transaction.
      await tx.projectTranslation.deleteMany({ where: { projectId: id } });
      await tx.projectProduct.deleteMany({ where: { projectId: id } });
      await tx.projectFinish.deleteMany({ where: { projectId: id } });
      await tx.project.update({
        where: { id },
        data: {
          slug: d.slug,
          serviceId: d.serviceId,
          year: d.year ?? null,
          durationMonths: d.durationMonths ?? null,
          isPublished: d.isPublished,
          priceMode: d.priceMode,
          priceMin: d.priceMin ?? null,
          priceMax: d.priceMax ?? null,
          translations: {
            create: d.translations.map((t) => ({ ...t, city: t.city ?? null })),
          },
        },
      });
      await audit(
        actor.id,
        "project.update",
        "Project",
        id,
        { slug: d.slug },
        tx,
      );
    });
    return { ok: true, id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function setPublished(
  actor: Actor,
  id: number,
  published: boolean,
): Promise<ActionResult> {
  if (actor.role !== "admin" && actor.role !== "editor")
    throw new Error("Not allowed");

  const res = await prisma.project.updateMany({
    where: { id, deletedAt: null },
    data: { isPublished: published },
  });
  if (res.count === 0) return fail({ _form: "Project not found" });

  await audit(
    actor.id,
    published ? "project.publish" : "project.unpublish",
    "Project",
    id,
  );
  return { ok: true, id };
}

// Soft delete, admin only.
export async function deleteProject(
  actor: Actor,
  id: number,
): Promise<ActionResult> {
  if (actor.role !== "admin") throw new Error("Only admins can delete");

  const res = await prisma.project.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isPublished: false },
  });
  if (res.count === 0) return fail({ _form: "Project not found" });

  await audit(actor.id, "project.delete", "Project", id);
  return { ok: true, id };
}
