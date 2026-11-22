import type { Metadata } from "next";
import type { Language } from "./i18n";

// Fail early like DATABASE_URL: wrong canonical links in production are a silent SEO disaster.
if (process.env.NODE_ENV === "production" && !process.env.SITE_URL)
  throw new Error("SITE_URL is not set (example: https://zyamdesign.com)");

export const SITE_URL = (
  process.env.SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

// Which language search engines show to people whose language matches neither. Your decision.
export const DEFAULT_LANG: Language = "ar";

export const SITE_NAME: Record<Language, string> = {
  ar: "زيام ديزاين",
  en: "Zyam Design",
};
export const SITE_DESCRIPTION: Record<Language, string> = {
  ar: "تصميم داخلي وعمارة وأثاث مخصص، من الفكرة حتى التسليم.",
  en: "Interior design, architecture and custom furniture, from the first idea to the handover.",
};
const OG_LOCALE: Record<Language, string> = { ar: "ar_AR", en: "en_US" };

// Descriptions in search results are cut at about 160 characters.
export function snippet(text: string, max = 160) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

// Structured data and sitemaps need full URLs, not "/media/x.webp".
export const absolute = (url: string) => new URL(url, SITE_URL).href;

export function pageMetadata(o: {
  lang: Language;
  path: string; // "/products/sh-01", without the language, no query string
  title: string;
  description?: string;
  image?: { largeUrl: string | null } | null;
}): Metadata {
  const url = `/${o.lang}${o.path}`;
  const description = o.description
    ? snippet(o.description)
    : SITE_DESCRIPTION[o.lang];
  const image = o.image?.largeUrl ?? null;
  return {
    title: o.title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ar: `/ar${o.path}`,
        en: `/en${o.path}`,
        "x-default": `/${DEFAULT_LANG}${o.path}`,
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME[o.lang],
      title: o.title,
      description,
      locale: OG_LOCALE[o.lang],
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary" },
  };
}
