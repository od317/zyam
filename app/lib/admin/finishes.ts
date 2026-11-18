import { prisma } from "../prisma";
import { audit } from "../auth/audit";
import type { Actor } from "../auth/require-user";
import { finishInput } from "../validation/finish";
import { issuesToErrors } from "../validation/common";
import {
  assertAdmin,
  assertStaff,
  fail,
  mapDbError,
  type ActionResult,
} from "./common";

export async function createFinish(
  actor: Actor,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const parsed = finishInput.safeParse(input);
  if (!parsed.success) return fail(issuesToErrors(parsed.error.issues));
  const d = parsed.data;

  try {
    const finish = await prisma.$transaction(async (tx) => {
      const f = await tx.finish.create({
        data: {
          slug: d.slug,
          colorHex: d.colorHex ?? null,
          isPublished: d.isPublished,
          translations: {
            create: d.translations.map((t) => ({
              ...t,
              description: t.description ?? null,
            })),
          },
        },
      });
      await audit(
        actor.id,
        "finish.create",
        "Finish",
        f.id,
        { slug: f.slug },
        tx,
      );
      return f;
    });
    return { ok: true, id: finish.id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function updateFinish(
  actor: Actor,
  id: number,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const parsed = finishInput.safeParse(input);
  if (!parsed.success) return fail(issuesToErrors(parsed.error.issues));
  const d = parsed.data;

  const exists = await prisma.finish.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!exists) return fail({ _form: "Finish not found" });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.finishTranslation.deleteMany({ where: { finishId: id } });
      await tx.finish.update({
        where: { id },
        data: {
          slug: d.slug,
          colorHex: d.colorHex ?? null,
          isPublished: d.isPublished,
          translations: {
            create: d.translations.map((t) => ({
              ...t,
              description: t.description ?? null,
            })),
          },
        },
      });
      await audit(
        actor.id,
        "finish.update",
        "Finish",
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

export async function setFinishPublished(
  actor: Actor,
  id: number,
  published: boolean,
): Promise<ActionResult> {
  assertStaff(actor);
  const res = await prisma.finish.updateMany({
    where: { id, deletedAt: null },
    data: { isPublished: published },
  });
  if (res.count === 0) return fail({ _form: "Finish not found" });
  await audit(
    actor.id,
    published ? "finish.publish" : "finish.unpublish",
    "Finish",
    id,
  );
  return { ok: true, id };
}

export async function deleteFinish(
  actor: Actor,
  id: number,
): Promise<ActionResult> {
  assertAdmin(actor);
  const res = await prisma.finish.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isPublished: false },
  });
  if (res.count === 0) return fail({ _form: "Finish not found" });
  await audit(actor.id, "finish.delete", "Finish", id);
  return { ok: true, id };
}
