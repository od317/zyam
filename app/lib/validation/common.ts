import { z } from "zod";

export const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Lowercase letters, digits and single hyphens only",
  );

export const priceMode = z.enum(["exact", "range", "hidden", "on_request"]);
export const languageEnum = z.enum(["ar", "en"]);

type Add = (path: string, message: string) => void;

// The same price rules as projects, written once.
export function checkPrice(
  v: { priceMode: string; priceMin?: number | null; priceMax?: number | null },
  add: Add,
) {
  const hasMin = v.priceMin != null;
  const hasMax = v.priceMax != null;
  if (v.priceMode === "exact") {
    if (!hasMin) add("priceMin", "Price is required");
    if (hasMax) add("priceMax", "Must be empty for an exact price");
  } else if (v.priceMode === "range") {
    if (!hasMin) add("priceMin", "Minimum price is required");
    if (!hasMax) add("priceMax", "Maximum price is required");
    if (hasMin && hasMax && v.priceMax! < v.priceMin!)
      add("priceMax", "Maximum must be at least the minimum");
  } else {
    if (hasMin) add("priceMin", "Must be empty when the price is not shown");
    if (hasMax) add("priceMax", "Must be empty when the price is not shown");
  }
}

export function checkUniqueLanguages(
  translations: { language: string }[],
  add: Add,
) {
  const langs = translations.map((t) => t.language);
  if (new Set(langs).size !== langs.length)
    add("translations", "Each language can appear only once");
}

export function issuesToErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
) {
  return Object.fromEntries(
    issues.map((i) => [i.path.map(String).join(".") || "_form", i.message]),
  );
}
