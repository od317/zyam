import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../prisma";
import type { Language } from "../i18n";
import { pageParams, pick, priceView, readyImages } from "./common";
import { searchIds } from "./search";
import {
  finishCardSelect,
  productCardSelect,
  toFinishCard,
  toProductCard,
} from "./cards";

const live = { isPublished: true, deletedAt: null } as const;

export type ProductListQuery = {
  lang: Language;
  category?: string; // slugs
  series?: string;
  finish?: string;
  q?: string;
  sort?: "code" | "newest";
  page?: number;
  limit?: number;
};

export async function listPublicProducts(opts: ProductListQuery) {
  const { page, limit, skip } = pageParams(opts.page, opts.limit);

  const where: Prisma.ProductWhereInput = { ...live };
  if (opts.category) where.category = { slug: opts.category };
  if (opts.series) where.series = { slug: opts.series };
  if (opts.finish)
    where.finishes = { some: { finish: { slug: opts.finish, ...live } } };
  if (opts.q?.trim()) {
    // Match text in either language, or the product code (SH-01).
    where.OR = [
      { id: { in: await searchIds("product", opts.q) } },
      { code: { contains: opts.q.trim().slice(0, 50), mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    opts.sort === "newest"
      ? [{ createdAt: "desc" }, { id: "desc" }]
      : [{ code: "asc" }, { id: "asc" }];

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: productCardSelect,
    }),
    prisma.product.count({ where }),
  ]);
  return {
    items: rows.map((r) => toProductCard(r, opts.lang)),
    page,
    limit,
    total,
  };
}

export async function listProductCategories(lang: Language) {
  const rows = await prisma.productCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      slug: true,
      translations: { select: { language: true, name: true } },
      _count: { select: { products: { where: live } } },
      series: {
        orderBy: { id: "asc" },
        select: {
          slug: true,
          translations: { select: { language: true, name: true } },
        },
      },
    },
  });
  return rows.map((c) => ({
    slug: c.slug,
    name: pick(c.translations, lang)?.name ?? c.slug,
    productCount: c._count.products,
    series: c.series.map((s) => ({
      slug: s.slug,
      name: pick(s.translations, lang)?.name ?? s.slug,
    })),
  }));
}

export async function getPublicProduct(slug: string, lang: Language) {
  const p = await prisma.product.findFirst({
    where: { slug, ...live },
    select: {
      id: true,
      categoryId: true,
      slug: true,
      code: true,
      priceMode: true,
      priceMin: true,
      priceMax: true,
      category: {
        select: {
          slug: true,
          translations: { select: { language: true, name: true } },
        },
      },
      series: {
        select: {
          slug: true,
          translations: { select: { language: true, name: true } },
        },
      },
      translations: {
        select: { language: true, name: true, description: true },
      },
      images: readyImages,
      specs: {
        orderBy: { definitionId: "asc" },
        select: {
          numberValue: true,
          textValue: true,
          definition: {
            select: {
              key: true,
              unit: true,
              translations: { select: { language: true, name: true } },
            },
          },
        },
      },
      finishes: {
        where: { finish: { ...live } },
        select: { finish: { select: finishCardSelect } },
      },
    },
  });
  if (!p) return null;

  const related = await prisma.product.findMany({
    where: { ...live, categoryId: p.categoryId, id: { not: p.id } },
    orderBy: [{ code: "asc" }, { id: "asc" }],
    take: 4,
    select: productCardSelect,
  });

  const t = pick(p.translations, lang);
  return {
    slug: p.slug,
    code: p.code,
    name: t?.name ?? p.code,
    description: t?.description ?? "",
    textLanguage: t?.language ?? lang,
    price: priceView(p),
    category: {
      slug: p.category.slug,
      name: pick(p.category.translations, lang)?.name ?? p.category.slug,
    },
    series: p.series
      ? {
          slug: p.series.slug,
          name: pick(p.series.translations, lang)?.name ?? p.series.slug,
        }
      : null,
    images: p.images,
    specs: p.specs.map((s) => ({
      key: s.definition.key,
      name: pick(s.definition.translations, lang)?.name ?? s.definition.key,
      unit: s.definition.unit,
      value:
        s.numberValue != null ? s.numberValue.toNumber() : (s.textValue ?? ""),
    })),
    finishes: p.finishes.map((x) => toFinishCard(x.finish, lang)),
    related: related.map((r) => toProductCard(r, lang)),
  };
}

export async function listPublicFinishes(opts: {
  lang: Language;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const { page, limit, skip } = pageParams(opts.page, opts.limit, 24);
  const where: Prisma.FinishWhereInput = { ...live };
  if (opts.q?.trim()) where.id = { in: await searchIds("finish", opts.q) };

  const [rows, total] = await Promise.all([
    prisma.finish.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: finishCardSelect,
    }),
    prisma.finish.count({ where }),
  ]);
  return {
    items: rows.map((r) => toFinishCard(r, opts.lang)),
    page,
    limit,
    total,
  };
}

export async function getPublicFinish(slug: string, lang: Language) {
  const f = await prisma.finish.findFirst({
    where: { slug, ...live },
    select: {
      id: true,
      slug: true,
      colorHex: true,
      translations: {
        select: { language: true, name: true, description: true },
      },
      images: readyImages,
      products: {
        where: { product: { ...live } },
        take: 24,
        select: { product: { select: productCardSelect } },
      },
    },
  });
  if (!f) return null;
  const t = pick(f.translations, lang);
  return {
    slug: f.slug,
    colorHex: f.colorHex,
    name: t?.name ?? f.slug,
    description: t?.description ?? "",
    textLanguage: t?.language ?? lang,
    images: f.images,
    products: f.products.map((x) => toProductCard(x.product, lang)),
  };
}
