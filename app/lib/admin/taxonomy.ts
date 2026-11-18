import { prisma } from "../prisma";
import { audit } from "../auth/audit";
import type { Actor } from "../auth/require-user";
import {
  categoryInput,
  seriesInput,
  specDefinitionInput,
  serviceInput,
} from "../validation/taxonomy";
import { issuesToErrors } from "../validation/common";
import {
  assertAdmin,
  assertStaff,
  fail,
  mapDbError,
  type ActionResult,
} from "./common";

type Entity = "category" | "series" | "spec" | "service";

// Friendly message when something still uses the item we want to delete.
async function usage(entity: Entity, id: number): Promise<string | null> {
  if (entity === "category") {
    const [products, series] = await Promise.all([
      prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
      prisma.productSeries.count({ where: { categoryId: id } }),
    ]);
    if (products)
      return `This category has ${products} product(s). Move or delete them first.`;
    if (series) return `This category has ${series} series. Delete them first.`;
  }
  if (entity === "series") {
    const n = await prisma.product.count({
      where: { seriesId: id, deletedAt: null },
    });
    if (n) return `${n} product(s) use this series. Move them first.`;
  }
  if (entity === "spec") {
    const n = await prisma.productSpec.count({ where: { definitionId: id } });
    if (n) return `${n} product(s) use this spec. Remove it from them first.`;
  }
  if (entity === "service") {
    const n = await prisma.project.count({
      where: { serviceId: id, deletedAt: null },
    });
    if (n) return `This service has ${n} project(s). Move them first.`;
  }
  return null;
}

// ---------- categories ----------
export async function createCategory(
  actor: Actor,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const p = categoryInput.safeParse(input);
  if (!p.success) return fail(issuesToErrors(p.error.issues));
  try {
    const row = await prisma.$transaction(async (tx) => {
      const c = await tx.productCategory.create({
        data: {
          slug: p.data.slug,
          sortOrder: p.data.sortOrder,
          translations: { create: p.data.translations },
        },
      });
      await audit(
        actor.id,
        "category.create",
        "ProductCategory",
        c.id,
        { slug: c.slug },
        tx,
      );
      return c;
    });
    return { ok: true, id: row.id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function updateCategory(
  actor: Actor,
  id: number,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const p = categoryInput.safeParse(input);
  if (!p.success) return fail(issuesToErrors(p.error.issues));
  if (
    !(await prisma.productCategory.findUnique({
      where: { id },
      select: { id: true },
    }))
  )
    return fail({ _form: "Not found" });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.productCategoryTranslation.deleteMany({
        where: { categoryId: id },
      });
      await tx.productCategory.update({
        where: { id },
        data: {
          slug: p.data.slug,
          sortOrder: p.data.sortOrder,
          translations: { create: p.data.translations },
        },
      });
      await audit(
        actor.id,
        "category.update",
        "ProductCategory",
        id,
        { slug: p.data.slug },
        tx,
      );
    });
    return { ok: true, id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function deleteCategory(
  actor: Actor,
  id: number,
): Promise<ActionResult> {
  assertAdmin(actor);
  const msg = await usage("category", id);
  if (msg) return fail({ _form: msg });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.productCategory.delete({ where: { id } });
      await audit(
        actor.id,
        "category.delete",
        "ProductCategory",
        id,
        undefined,
        tx,
      );
    });
    return { ok: true, id };
  } catch (e) {
    return mapDbError(e);
  }
}

// ---------- series ----------
export async function createSeries(
  actor: Actor,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const p = seriesInput.safeParse(input);
  if (!p.success) return fail(issuesToErrors(p.error.issues));
  const d = p.data;
  try {
    const row = await prisma.$transaction(async (tx) => {
      const s = await tx.productSeries.create({
        data: {
          slug: d.slug,
          categoryId: d.categoryId,
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
        "series.create",
        "ProductSeries",
        s.id,
        { slug: s.slug },
        tx,
      );
      return s;
    });
    return { ok: true, id: row.id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function updateSeries(
  actor: Actor,
  id: number,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const p = seriesInput.safeParse(input);
  if (!p.success) return fail(issuesToErrors(p.error.issues));
  const d = p.data;
  const current = await prisma.productSeries.findUnique({
    where: { id },
    select: { categoryId: true },
  });
  if (!current) return fail({ _form: "Not found" });
  // Moving a series to another category would break the "same category" rule of its products.
  if (
    current.categoryId !== d.categoryId &&
    (await prisma.product.count({ where: { seriesId: id, deletedAt: null } }))
  )
    return fail({ categoryId: "This series has products. Move them first." });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.productSeriesTranslation.deleteMany({ where: { seriesId: id } });
      await tx.productSeries.update({
        where: { id },
        data: {
          slug: d.slug,
          categoryId: d.categoryId,
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
        "series.update",
        "ProductSeries",
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

export async function deleteSeries(
  actor: Actor,
  id: number,
): Promise<ActionResult> {
  assertAdmin(actor);
  const msg = await usage("series", id);
  if (msg) return fail({ _form: msg });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.productSeries.delete({ where: { id } });
      await audit(
        actor.id,
        "series.delete",
        "ProductSeries",
        id,
        undefined,
        tx,
      );
    });
    return { ok: true, id };
  } catch (e) {
    return mapDbError(e);
  }
}

// ---------- spec definitions ----------
export async function createSpecDefinition(
  actor: Actor,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const p = specDefinitionInput.safeParse(input);
  if (!p.success) return fail(issuesToErrors(p.error.issues));
  const d = p.data;
  try {
    const row = await prisma.$transaction(async (tx) => {
      const s = await tx.specDefinition.create({
        data: {
          key: d.key,
          unit: d.unit ?? null,
          valueType: d.valueType,
          translations: { create: d.translations },
        },
      });
      await audit(
        actor.id,
        "spec.create",
        "SpecDefinition",
        s.id,
        { key: s.key },
        tx,
      );
      return s;
    });
    return { ok: true, id: row.id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function updateSpecDefinition(
  actor: Actor,
  id: number,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor);
  const p = specDefinitionInput.safeParse(input);
  if (!p.success) return fail(issuesToErrors(p.error.issues));
  const d = p.data;
  const current = await prisma.specDefinition.findUnique({ where: { id } });
  if (!current) return fail({ _form: "Not found" });
  // Changing number <-> text would invalidate every stored value.
  if (
    current.valueType !== d.valueType &&
    (await prisma.productSpec.count({ where: { definitionId: id } }))
  )
    return fail({
      valueType: "Products already use this spec, so its type cannot change.",
    });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.specDefinitionTranslation.deleteMany({
        where: { definitionId: id },
      });
      await tx.specDefinition.update({
        where: { id },
        data: {
          key: d.key,
          unit: d.unit ?? null,
          valueType: d.valueType,
          translations: { create: d.translations },
        },
      });
      await audit(
        actor.id,
        "spec.update",
        "SpecDefinition",
        id,
        { key: d.key },
        tx,
      );
    });
    return { ok: true, id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function deleteSpecDefinition(
  actor: Actor,
  id: number,
): Promise<ActionResult> {
  assertAdmin(actor);
  const msg = await usage("spec", id);
  if (msg) return fail({ _form: msg });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.specDefinition.delete({ where: { id } });
      await audit(actor.id, "spec.delete", "SpecDefinition", id, undefined, tx);
    });
    return { ok: true, id };
  } catch (e) {
    return mapDbError(e);
  }
}

// ---------- services ----------
export async function createService(
  actor: Actor,
  input: unknown,
): Promise<ActionResult> {
  assertAdmin(actor); // the six services are part of the site's structure
  const p = serviceInput.safeParse(input);
  if (!p.success) return fail(issuesToErrors(p.error.issues));
  const d = p.data;
  try {
    const row = await prisma.$transaction(async (tx) => {
      const s = await tx.service.create({
        data: {
          slug: d.slug,
          sortOrder: d.sortOrder,
          priceMode: d.priceMode,
          priceMin: d.priceMin ?? null,
          priceMax: d.priceMax ?? null,
          translations: { create: d.translations },
        },
      });
      await audit(
        actor.id,
        "service.create",
        "Service",
        s.id,
        { slug: s.slug },
        tx,
      );
      return s;
    });
    return { ok: true, id: row.id };
  } catch (e) {
    return mapDbError(e);
  }
}

export async function updateService(
  actor: Actor,
  id: number,
  input: unknown,
): Promise<ActionResult> {
  assertStaff(actor); // editors may fix the text of a service
  const p = serviceInput.safeParse(input);
  if (!p.success) return fail(issuesToErrors(p.error.issues));
  const d = p.data;
  if (
    !(await prisma.service.findUnique({ where: { id }, select: { id: true } }))
  )
    return fail({ _form: "Not found" });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.serviceTranslation.deleteMany({ where: { serviceId: id } });
      await tx.service.update({
        where: { id },
        data: {
          slug: d.slug,
          sortOrder: d.sortOrder,
          priceMode: d.priceMode,
          priceMin: d.priceMin ?? null,
          priceMax: d.priceMax ?? null,
          translations: { create: d.translations },
        },
      });
      await audit(
        actor.id,
        "service.update",
        "Service",
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

export async function deleteService(
  actor: Actor,
  id: number,
): Promise<ActionResult> {
  assertAdmin(actor);
  const msg = await usage("service", id);
  if (msg) return fail({ _form: msg });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.service.delete({ where: { id } });
      await audit(actor.id, "service.delete", "Service", id, undefined, tx);
    });
    return { ok: true, id };
  } catch (e) {
    return mapDbError(e);
  }
}
