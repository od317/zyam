import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../prisma";
import type { Language } from "../i18n";
import { coverImage, pageParams, pick, priceView, readyImages } from "./common";
import { cacheLife, cacheTag } from "next/cache";
import { searchIds } from "./search";
import {
  finishCardSelect,
  productCardSelect,
  toFinishCard,
  toProductCard,
} from "./cards";

const live = { isPublished: true, deletedAt: null } as const;

export const projectCardSelect = {
  slug: true,
  year: true,
  durationMonths: true,
  priceMode: true,
  priceMin: true,
  priceMax: true,
  translations: { select: { language: true, title: true, city: true } },
  images: coverImage,
} satisfies Prisma.ProjectSelect;

type ProjectCardRow = Prisma.ProjectGetPayload<{
  select: typeof projectCardSelect;
}>;

export function toProjectCard(p: ProjectCardRow, lang: Language) {
  const t = pick(p.translations, lang);
  return {
    slug: p.slug,
    title: t?.title ?? p.slug,
    city: t?.city ?? null,
    textLanguage: t?.language ?? lang,
    year: p.year,
    durationMonths: p.durationMonths,
    price: priceView(p),
    image: p.images[0] ?? null,
  };
}

export type ProjectListQuery = {
  lang: Language;
  service?: string; // service slug
  city?: string;
  year?: number;
  q?: string;
  sort?: "newest" | "oldest" | "year";
  page?: number;
  limit?: number;
};

export async function listPublicProjects(opts: ProjectListQuery) {
  "use cache";
  cacheLife("hours");
  cacheTag("projects");
  const { page, limit, skip } = pageParams(opts.page, opts.limit);

  const where: Prisma.ProjectWhereInput = { ...live };
  if (opts.service) where.service = { slug: opts.service };
  if (opts.year) where.year = opts.year;
  if (opts.city)
    where.translations = {
      some: { city: { equals: opts.city, mode: "insensitive" } },
    };
  if (opts.q?.trim()) where.id = { in: await searchIds("project", opts.q) };

  // The id tie-breaker keeps pages stable when two rows share the same value.
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    opts.sort === "oldest"
      ? [{ createdAt: "asc" }, { id: "asc" }]
      : opts.sort === "year"
        ? [{ year: { sort: "desc", nulls: "last" } }, { id: "desc" }]
        : [{ createdAt: "desc" }, { id: "desc" }];

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: projectCardSelect,
    }),
    prisma.project.count({ where }),
  ]);

  return {
    items: rows.map((r) => toProjectCard(r, opts.lang)),
    page,
    limit,
    total,
  };
}

// Values for the filter dropdowns.
export async function listProjectFilters(lang: Language) {
  "use cache";
  cacheLife("hours");
  cacheTag("projects", "services");

  const [services, years, cities] = await Promise.all([
    prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        slug: true,
        translations: { select: { language: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: { ...live, year: { not: null } },
      distinct: ["year"],
      orderBy: { year: "desc" },
      select: { year: true },
    }),
    prisma.projectTranslation.findMany({
      where: { language: lang, city: { not: null }, project: live },
      distinct: ["city"],
      orderBy: { city: "asc" },
      select: { city: true },
    }),
  ]);
  return {
    services: services.map((s) => ({
      slug: s.slug,
      name: pick(s.translations, lang)?.name ?? s.slug,
    })),
    years: years.map((y) => y.year as number),
    cities: cities.map((c) => c.city as string),
  };
}

export async function getPublicProject(slug: string, lang: Language) {
  "use cache";
  cacheLife("hours");
  cacheTag("projects", "products", "finishes");

  const p = await prisma.project.findFirst({
    where: { slug, ...live },
    select: {
      id: true,
      serviceId: true,
      slug: true,
      year: true,
      durationMonths: true,
      priceMode: true,
      priceMin: true,
      priceMax: true,
      service: {
        select: {
          slug: true,
          translations: { select: { language: true, name: true } },
        },
      },
      translations: {
        select: { language: true, title: true, description: true, city: true },
      },
      images: readyImages,
      products: {
        where: { product: { ...live } },
        select: { product: { select: productCardSelect } },
      },
      finishes: {
        where: { finish: { ...live } },
        select: { finish: { select: finishCardSelect } },
      },
    },
  });
  if (!p) return null;

  const related = await prisma.project.findMany({
    where: { ...live, serviceId: p.serviceId, id: { not: p.id } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 4,
    select: projectCardSelect,
  });

  const t = pick(p.translations, lang);
  return {
    slug: p.slug,
    title: t?.title ?? p.slug,
    description: t?.description ?? "",
    city: t?.city ?? null,
    textLanguage: t?.language ?? lang,
    year: p.year,
    durationMonths: p.durationMonths,
    price: priceView(p),
    service: {
      slug: p.service.slug,
      name: pick(p.service.translations, lang)?.name ?? p.service.slug,
    },
    images: p.images,
    products: p.products.map((x) => toProductCard(x.product, lang)),
    finishes: p.finishes.map((x) => toFinishCard(x.finish, lang)),
    related: related.map((r) => toProjectCard(r, lang)),
  };
}
