import { prisma } from "../prisma";
import type { Prisma } from "../../generated/prisma/client";
import type { Actor } from "../auth/require-user";
import type { Language } from "../i18n";
import { pageParams, pick } from "../public/common";
import { searchIds } from "../public/search";
import { assertStaff } from "./common";

export async function adminCounts(actor: Actor) {
  assertStaff(actor);
  const [newInquiries, published, drafts] = await Promise.all([
    prisma.inquiry.count({ where: { status: "new" } }),
    prisma.project.count({ where: { deletedAt: null, isPublished: true } }),
    prisma.project.count({ where: { deletedAt: null, isPublished: false } }),
  ]);
  return { newInquiries, published, drafts };
}

// Unlike the public list, this one includes drafts.
export async function listAdminProjects(
  actor: Actor,
  opts: {
    lang: Language;
    q?: string;
    status?: "published" | "draft";
    page?: number;
  },
) {
  assertStaff(actor);
  const { page, limit, skip } = pageParams(opts.page, 20);

  const where: Prisma.ProjectWhereInput = { deletedAt: null };
  if (opts.status) where.isPublished = opts.status === "published";
  if (opts.q?.trim()) {
    const q = opts.q.trim().slice(0, 100);
    where.OR = [
      { id: { in: await searchIds("project", q) } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        year: true,
        isPublished: true,
        updatedAt: true,
        translations: { select: { language: true, title: true } },
        images: {
          where: { status: "ready" },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { thumbUrl: true },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      year: r.year,
      isPublished: r.isPublished,
      title: pick(r.translations, opts.lang)?.title ?? "",
      thumbUrl: r.images[0]?.thumbUrl ?? null,
    })),
    page,
    limit,
    total,
  };
}

// Everything the edit form needs: both languages, links, and every image (even processing or failed).
export async function getAdminProject(actor: Actor, id: number) {
  assertStaff(actor);
  const p = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      slug: true,
      serviceId: true,
      year: true,
      durationMonths: true,
      isPublished: true,
      priceMode: true,
      priceMin: true,
      priceMax: true,
      translations: {
        select: { language: true, title: true, description: true, city: true },
      },
      products: { select: { productId: true } },
      finishes: { select: { finishId: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, status: true, thumbUrl: true },
      },
    },
  });
  if (!p) return null;

  const tr = (language: Language) => {
    const t = p.translations.find((x) => x.language === language);
    return {
      title: t?.title ?? "",
      description: t?.description ?? "",
      city: t?.city ?? "",
    };
  };
  return {
    id: p.id,
    slug: p.slug,
    serviceId: p.serviceId,
    year: p.year,
    durationMonths: p.durationMonths,
    isPublished: p.isPublished,
    priceMode: p.priceMode,
    priceMin: p.priceMin?.toNumber() ?? null,
    priceMax: p.priceMax?.toNumber() ?? null,
    translations: { ar: tr("ar"), en: tr("en") },
    productIds: p.products.map((x) => x.productId),
    finishIds: p.finishes.map((x) => x.finishId),
    images: p.images,
  };
}
export type AdminProject = NonNullable<
  Awaited<ReturnType<typeof getAdminProject>>
>;

// Choices for the dropdown and the two checklists.
export async function getProjectFormOptions(actor: Actor, lang: Language) {
  assertStaff(actor);
  const [services, products, finishes] = await Promise.all([
    prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        translations: { select: { language: true, name: true } },
      },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        translations: { select: { language: true, name: true } },
      },
    }),
    prisma.finish.findMany({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
      select: {
        id: true,
        translations: { select: { language: true, name: true } },
      },
    }),
  ]);
  return {
    services: services.map((s) => ({
      id: s.id,
      name: pick(s.translations, lang)?.name ?? `#${s.id}`,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: `${p.code} · ${pick(p.translations, lang)?.name ?? ""}`,
    })),
    finishes: finishes.map((f) => ({
      id: f.id,
      name: pick(f.translations, lang)?.name ?? `#${f.id}`,
    })),
  };
}

export async function listAdminFinishes(
  actor: Actor,
  opts: {
    lang: Language;
    q?: string;
    status?: "published" | "draft";
    page?: number;
  },
) {
  assertStaff(actor);
  const { page, limit, skip } = pageParams(opts.page, 20);
  const where: Prisma.FinishWhereInput = { deletedAt: null };
  if (opts.status) where.isPublished = opts.status === "published";
  if (opts.q?.trim()) {
    const q = opts.q.trim().slice(0, 100);
    where.OR = [
      { id: { in: await searchIds("finish", q) } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.finish.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        colorHex: true,
        isPublished: true,
        translations: { select: { language: true, name: true } },
        images: {
          where: { status: "ready" },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { thumbUrl: true },
        },
      },
    }),
    prisma.finish.count({ where }),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      colorHex: r.colorHex,
      isPublished: r.isPublished,
      title: pick(r.translations, opts.lang)?.name ?? "",
      thumbUrl: r.images[0]?.thumbUrl ?? null,
    })),
    page,
    limit,
    total,
  };
}

export async function getAdminFinish(actor: Actor, id: number) {
  assertStaff(actor);
  const f = await prisma.finish.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      slug: true,
      colorHex: true,
      isPublished: true,
      translations: {
        select: { language: true, name: true, description: true },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, status: true, thumbUrl: true },
      },
    },
  });
  if (!f) return null;
  const tr = (language: Language) => {
    const t = f.translations.find((x) => x.language === language);
    return { name: t?.name ?? "", description: t?.description ?? "" };
  };
  return {
    id: f.id,
    slug: f.slug,
    colorHex: f.colorHex ?? "",
    isPublished: f.isPublished,
    translations: { ar: tr("ar"), en: tr("en") },
    images: f.images,
  };
}

export async function listAdminProducts(
  actor: Actor,
  opts: {
    lang: Language;
    q?: string;
    status?: "published" | "draft";
    page?: number;
  },
) {
  assertStaff(actor);
  const { page, limit, skip } = pageParams(opts.page, 20);
  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (opts.status) where.isPublished = opts.status === "published";
  if (opts.q?.trim()) {
    const q = opts.q.trim().slice(0, 100);
    where.OR = [
      { id: { in: await searchIds("product", q) } },
      { code: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        code: true,
        isPublished: true,
        translations: { select: { language: true, name: true } },
        images: {
          where: { status: "ready" },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { thumbUrl: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      code: r.code,
      isPublished: r.isPublished,
      title: pick(r.translations, opts.lang)?.name ?? "",
      thumbUrl: r.images[0]?.thumbUrl ?? null,
    })),
    page,
    limit,
    total,
  };
}

export async function getAdminProduct(actor: Actor, id: number) {
  assertStaff(actor);
  const p = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      slug: true,
      code: true,
      categoryId: true,
      seriesId: true,
      isPublished: true,
      priceMode: true,
      priceMin: true,
      priceMax: true,
      translations: {
        select: { language: true, name: true, description: true },
      },
      specs: {
        orderBy: { definitionId: "asc" },
        select: { definitionId: true, numberValue: true, textValue: true },
      },
      finishes: { select: { finishId: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, status: true, thumbUrl: true },
      },
    },
  });
  if (!p) return null;
  const tr = (language: Language) => {
    const t = p.translations.find((x) => x.language === language);
    return { name: t?.name ?? "", description: t?.description ?? "" };
  };
  return {
    id: p.id,
    slug: p.slug,
    code: p.code,
    categoryId: p.categoryId,
    seriesId: p.seriesId,
    isPublished: p.isPublished,
    priceMode: p.priceMode,
    priceMin: p.priceMin?.toNumber() ?? null,
    priceMax: p.priceMax?.toNumber() ?? null,
    translations: { ar: tr("ar"), en: tr("en") },
    // The form edits every value as text; the type of the spec decides how it is sent back.
    specs: p.specs.map((s) => ({
      definitionId: s.definitionId,
      value:
        s.numberValue != null
          ? String(s.numberValue.toNumber())
          : (s.textValue ?? ""),
    })),
    finishIds: p.finishes.map((x) => x.finishId),
    images: p.images,
  };
}
export type AdminProduct = NonNullable<
  Awaited<ReturnType<typeof getAdminProduct>>
>;

export async function getProductFormOptions(actor: Actor, lang: Language) {
  assertStaff(actor);
  const [categories, specs, finishes] = await Promise.all([
    prisma.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        translations: { select: { language: true, name: true } },
        series: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            translations: { select: { language: true, name: true } },
          },
        },
      },
    }),
    prisma.specDefinition.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        key: true,
        unit: true,
        valueType: true,
        translations: { select: { language: true, name: true } },
      },
    }),
    prisma.finish.findMany({
      where: { deletedAt: null },
      orderBy: { id: "desc" },
      select: {
        id: true,
        translations: { select: { language: true, name: true } },
      },
    }),
  ]);
  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: pick(c.translations, lang)?.name ?? `#${c.id}`,
      series: c.series.map((s) => ({
        id: s.id,
        name: pick(s.translations, lang)?.name ?? `#${s.id}`,
      })),
    })),
    specs: specs.map((s) => ({
      id: s.id,
      name: pick(s.translations, lang)?.name ?? s.key,
      unit: s.unit,
      valueType: s.valueType,
    })),
    finishes: finishes.map((f) => ({
      id: f.id,
      name: pick(f.translations, lang)?.name ?? `#${f.id}`,
    })),
  };
}

export type AdminFinish = NonNullable<
  Awaited<ReturnType<typeof getAdminFinish>>
>;
