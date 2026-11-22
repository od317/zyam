import type { MetadataRoute } from "next";
import { languages } from "./lib/i18n";
import { SITE_URL } from "./lib/seo";
import { listSitemapEntries } from "./lib/public/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const e = await listSitemapEntries();

  // One entry per language, each listing its translations so Google links them together.
  const entry = (path: string, lastModified?: string): MetadataRoute.Sitemap =>
    languages.map((lang) => ({
      url: `${SITE_URL}/${lang}${path}`,
      lastModified,
      alternates: {
        languages: Object.fromEntries(
          languages.map((l) => [l, `${SITE_URL}/${l}${path}`]),
        ),
      },
    }));

  return [
    ...[
      "",
      "/services",
      "/projects",
      "/products",
      "/finishes",
      "/about",
      "/contact",
    ].flatMap((p) => entry(p)),
    ...e.services.flatMap((s) => entry(`/services/${s}`)),
    ...e.projects.flatMap((p) => entry(`/projects/${p.slug}`, p.updatedAt)),
    ...e.products.flatMap((p) => entry(`/products/${p.slug}`, p.updatedAt)),
    ...e.finishes.flatMap((p) => entry(`/finishes/${p.slug}`, p.updatedAt)),
  ];
}
