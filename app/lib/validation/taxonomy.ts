import { z } from "zod";
import {
  slug,
  languageEnum,
  priceMode,
  checkPrice,
  checkUniqueLanguages,
} from "./common";
import { PLAIN_SETTINGS, TRANSLATED_SETTINGS } from "../settings-keys";

const name = z.string().trim().min(1, "Name is required").max(200);
const nameTranslations = z
  .array(z.object({ language: languageEnum, name }))
  .min(1, "At least one language is required")
  .max(2);

const orderField = z.number().int().min(0).max(100000).default(0);

const noDupes = (
  v: { translations: { language: string }[] },
  ctx: z.RefinementCtx,
) =>
  checkUniqueLanguages(v.translations, (path, message) =>
    ctx.addIssue({ code: "custom", path: [path], message }),
  );

export const categoryInput = z
  .object({ slug, sortOrder: orderField, translations: nameTranslations })
  .superRefine(noDupes);

export const seriesInput = z
  .object({
    slug,
    categoryId: z.number().int().positive(),
    translations: z
      .array(
        z.object({
          language: languageEnum,
          name,
          description: z.string().trim().max(5000).nullish(),
        }),
      )
      .min(1, "At least one language is required")
      .max(2),
  })
  .superRefine(noDupes);

export const specDefinitionInput = z
  .object({
    key: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z][a-z0-9_]{1,40}$/,
        "Letters, digits and underscores, starting with a letter",
      ),
    unit: z.string().trim().max(20).nullish(),
    valueType: z.enum(["number", "text"]),
    translations: nameTranslations,
  })
  .superRefine(noDupes);

export const serviceInput = z
  .object({
    slug,
    sortOrder: orderField,
    priceMode,
    priceMin: z.number().nonnegative().nullish(),
    priceMax: z.number().nonnegative().nullish(),
    translations: z
      .array(
        z.object({
          language: languageEnum,
          name,
          description: z
            .string()
            .trim()
            .min(1, "Description is required")
            .max(10000),
        }),
      )
      .min(1, "At least one language is required")
      .max(2),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    checkUniqueLanguages(v.translations, add);
    checkPrice(v, add);
  });

export const settingsInput = z.object({
  plain: z.record(z.string(), z.string().trim().max(500)).default({}),
  translated: z
    .record(
      z.string(),
      z.object({
        ar: z.string().trim().max(10000).default(""),
        en: z.string().trim().max(10000).default(""),
      }),
    )
    .default({}),
});

export const isPlainKey = (k: string) =>
  (PLAIN_SETTINGS as readonly string[]).includes(k);
export const isTranslatedKey = (k: string) =>
  (TRANSLATED_SETTINGS as readonly string[]).includes(k);
