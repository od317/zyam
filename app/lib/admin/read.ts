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
