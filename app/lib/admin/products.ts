import { prisma } from "../prisma";
import { audit } from "../auth/audit";
import type { Actor } from "../auth/require-user";
import { productInput, type ProductInput } from "../validation/product";
import { issuesToErrors } from "../validation/common";
import {
  assertAdmin,
  assertStaff,
  fail,
  mapDbError,
  type ActionResult,
} from "./common";

// Rules that need the database: they can't live in the Zod schema.
async function checkRelations(
  d: ProductInput,
): Promise<Record<string, string> | null> {
  const errors: Record<string, string> = {};

  const category = await prisma.productCategory.findUnique({
    where: { id: d.categoryId },
    select: { id: true },
  });
  if (!category) errors.categoryId = "Category does not exist";

  if (d.seriesId != null) {
    const series = await prisma.productSeries.findUnique({
      where: { id: d.seriesId },
      select: { categoryId: true },
    });
    if (!series) errors.seriesId = "Series does not exist";
    else if (series.categoryId !== d.categoryId)
      errors.seriesId = "Series belongs to a different category";
  }

  const defIds = d.specs.map((s) => s.definitionId);
  if (new Set(defIds).size !== defIds.length)
    errors.specs = "The same spec appears twice";
  else if (defIds.length) {
    const defs = await prisma.specDefinition.findMany({
      where: { id: { in: defIds } },
    });
    const byId = new Map(defs.map((x) => [x.id, x]));
    d.specs.forEach((s, i) => {
      const def = byId.get(s.definitionId);
      if (!def) return void (errors[`specs.${i}`] = "Spec type does not exist");
      if (
        def.valueType === "number" &&
        (s.numberValue == null || s.textValue != null)
      )
        errors[`specs.${i}`] = `${def.key} needs a number value only`;
      if (def.valueType === "text" && (!s.textValue || s.numberValue != null))
        errors[`specs.${i}`] = `${def.key} needs a text value only`;
    });
  }

  const finishIds = [...new Set(d.finishIds)];
  if (finishIds.length) {
    const n = await prisma.finish.count({
      where: { id: { in: finishIds }, deletedAt: null },
    });
    if (n !== finishIds.length)
      errors.finishIds = "One of the finishes does not exist";
  }

  return Object.keys(errors).length ? errors : null;
}

const scalars = (d: ProductInput) => ({
  slug: d.slug,
  code: d.code,
  categoryId: d.categoryId,
  seriesId: d.seriesId ?? null,
  priceMode: d.priceMode,
  priceMin: d.priceMin ?? null,
  priceMax: d.priceMax ?? null,
  isPublished: d.isPublished,
});

const children = (d: ProductInput) => ({
  translations: { create: d.translations },
  specs: {
    create: d.specs.map((s) => ({
      definitionId: s.definitionId,
      numberValue: s.numberValue ?? null,
      textValue: s.textValue ?? null,
    })),
  },
  finishes: {
    create: [...new Set(d.finishIds)].map((finishId) => ({ finishId })),
  },
});

export async function createProduct(
  actor: Actor,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const parsed = productInput.safeParse(input);
  if (!parsed.success) return fail(issuesToErrors(parsed.error.issues));
  const d = parsed.data;

  const bad = await checkRelations(d);
  if (bad) return fail(bad);

  try {
    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: { ...scalars(d), ...children(d) },
      });
      await audit(
        actor.id,
        "product.create",
        "Product",
        p.id,
        { code: p.code },
        tx,
      );
      return p;
    });
    return { ok: true, id: product.id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function updateProduct(
  actor: Actor,
  id: number,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const parsed = productInput.safeParse(input);
  if (!parsed.success) return fail(issuesToErrors(parsed.error.issues));
  const d = parsed.data;

  const exists = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!exists) return fail({ _form: "Product not found" });

  const bad = await checkRelations(d);
  if (bad) return fail(bad);

  try {
    await prisma.$transaction(async (tx) => {
      // Replace the children wholesale: simpler than diffing, safe inside a transaction.
      await tx.productTranslation.deleteMany({ where: { productId: id } });
      await tx.productSpec.deleteMany({ where: { productId: id } });
      await tx.productFinish.deleteMany({ where: { productId: id } });
      await tx.product.update({
        where: { id },
        data: { ...scalars(d), ...children(d) },
      });
      await audit(
        actor.id,
        "product.update",
        "Product",
        id,
        { code: d.code },
        tx,
      );
    });
    return { ok: true, id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function setProductPublished(
  actor: Actor,
  id: number,
  published: boolean,
): Promise<ActionResult> {
  assertStaff(actor);
  const res = await prisma.product.updateMany({
    where: { id, deletedAt: null },
    data: { isPublished: published },
  });
  if (res.count === 0) return fail({ _form: "Product not found" });
  await audit(
    actor.id,
    published ? "product.publish" : "product.unpublish",
    "Product",
    id,
  );
  return { ok: true, id };
}

export async function deleteProduct(
  actor: Actor,
  id: number,
): Promise<ActionResult> {
  assertAdmin(actor);
  const res = await prisma.product.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isPublished: false },
  });
  if (res.count === 0) return fail({ _form: "Product not found" });
  await audit(actor.id, "product.delete", "Product", id);
  return { ok: true, id };
}
