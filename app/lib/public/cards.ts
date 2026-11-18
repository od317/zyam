import { Prisma } from "../../generated/prisma/client";
import type { Language } from "../i18n";
import { coverImage, pick, priceView } from "./common";

export const productCardSelect = {
  slug: true,
  code: true,
  priceMode: true,
  priceMin: true,
  priceMax: true,
  translations: { select: { language: true, name: true } },
  images: coverImage,
} satisfies Prisma.ProductSelect;

type ProductCardRow = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;

export function toProductCard(p: ProductCardRow, lang: Language) {
  const t = pick(p.translations, lang);
  return {
    slug: p.slug,
    code: p.code,
    name: t?.name ?? p.code,
    textLanguage: t?.language ?? lang,
    price: priceView(p),
    image: p.images[0] ?? null,
  };
}

export const finishCardSelect = {
  slug: true,
  colorHex: true,
  translations: { select: { language: true, name: true } },
  images: coverImage,
} satisfies Prisma.FinishSelect;

type FinishCardRow = Prisma.FinishGetPayload<{
  select: typeof finishCardSelect;
}>;

export function toFinishCard(f: FinishCardRow, lang: Language) {
  const t = pick(f.translations, lang);
  return {
    slug: f.slug,
    colorHex: f.colorHex,
    name: t?.name ?? f.slug,
    textLanguage: t?.language ?? lang,
    image: f.images[0] ?? null,
  };
}
