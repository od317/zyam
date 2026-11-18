import type { Language } from "../i18n";

// Requested language first, otherwise whatever exists.
export function pick<T extends { language: string }>(
  rows: readonly T[],
  lang: Language,
): T | null {
  return rows.find((r) => r.language === lang) ?? rows[0] ?? null;
}

type Money = { toNumber(): number } | null;

export type PriceView =
  | { mode: "exact"; amount: number }
  | { mode: "range"; min: number; max: number }
  | { mode: "on_request" };

// "hidden" returns null so the number never leaves the server.
export function priceView(p: {
  priceMode: string;
  priceMin: Money;
  priceMax: Money;
}): PriceView | null {
  if (p.priceMode === "hidden") return null;
  const min = p.priceMin?.toNumber() ?? null;
  const max = p.priceMax?.toNumber() ?? null;
  if (p.priceMode === "exact" && min != null)
    return { mode: "exact", amount: min };
  if (p.priceMode === "range" && min != null && max != null)
    return { mode: "range", min, max };
  return { mode: "on_request" };
}

// Only these image fields are ever public. originalKey is deliberately absent.
export const imageSelect = {
  id: true,
  thumbUrl: true,
  mediumUrl: true,
  largeUrl: true,
  width: true,
  height: true,
  blurDataUrl: true,
} as const;

export const readyImages = {
  where: { status: "ready" },
  orderBy: { sortOrder: "asc" },
  select: imageSelect,
} as const;

export const coverImage = { ...readyImages, take: 1 } as const;

export function pageParams(page?: number, limit?: number, def = 12, max = 50) {
  const l = Math.min(Math.max(Math.trunc(limit ?? def) || def, 1), max);
  const p = Math.min(Math.max(Math.trunc(page ?? 1) || 1, 1), 10000);
  return { page: p, limit: l, skip: (p - 1) * l };
}

// For query strings: "12" -> 12, anything else -> undefined.
export function intParam(v?: string) {
  if (!v?.trim()) return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}
