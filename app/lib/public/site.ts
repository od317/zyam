import { prisma } from "../prisma";
import type { Language } from "../i18n";
import { getSettings } from "../admin/settings";
import { pick, priceView } from "./common";
import { projectCardSelect, toProjectCard } from "./projects";

const live = { isPublished: true, deletedAt: null } as const;

export async function listPublicServices(lang: Language) {
  const rows = await prisma.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      slug: true,
      priceMode: true,
      priceMin: true,
      priceMax: true,
      translations: {
        select: { language: true, name: true, description: true },
      },
      _count: { select: { projects: { where: live } } },
    },
  });
  return rows.map((s) => {
    const t = pick(s.translations, lang);
    return {
      slug: s.slug,
      name: t?.name ?? s.slug,
      description: t?.description ?? "",
      textLanguage: t?.language ?? lang,
      price: priceView(s),
      projectCount: s._count.projects,
    };
  });
}

export async function getPublicService(slug: string, lang: Language) {
  const s = await prisma.service.findUnique({
    where: { slug },
    select: {
      slug: true,
      priceMode: true,
      priceMin: true,
      priceMax: true,
      translations: {
        select: { language: true, name: true, description: true },
      },
      projects: {
        where: live,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 6,
        select: projectCardSelect,
      },
    },
  });
  if (!s) return null;
  const t = pick(s.translations, lang);
  return {
    slug: s.slug,
    name: t?.name ?? s.slug,
    description: t?.description ?? "",
    textLanguage: t?.language ?? lang,
    price: priceView(s),
    projects: s.projects.map((p) => toProjectCard(p, lang)),
  };
}

// Settings for the footer, contact page and about page. Empty translated text falls back to the other language.
export async function getPublicSettings(lang: Language) {
  const { plain, translated } = await getSettings();
  const other: Language = lang === "ar" ? "en" : "ar";
  const text = Object.fromEntries(
    Object.entries(translated).map(([k, v]) => [k, v[lang] || v[other] || ""]),
  );
  return { ...plain, ...text } as Record<string, string>;
}
