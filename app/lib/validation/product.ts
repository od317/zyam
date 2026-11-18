import { z } from "zod";
import {
  slug,
  priceMode,
  languageEnum,
  checkPrice,
  checkUniqueLanguages,
} from "./common";

const translation = z.object({
  language: languageEnum,
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(10000),
});

const spec = z.object({
  definitionId: z.number().int().positive(),
  numberValue: z.number().nullish(),
  textValue: z.string().trim().max(500).nullish(),
});

export const productInput = z
  .object({
    slug,
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
        "Letters, digits and hyphens only (example: SH-01)",
      ),
    categoryId: z.number().int().positive(),
    seriesId: z.number().int().positive().nullish(),
    isPublished: z.boolean().default(false),
    priceMode,
    priceMin: z.number().nonnegative().nullish(),
    priceMax: z.number().nonnegative().nullish(),
    translations: z
      .array(translation)
      .min(1, "At least one language is required")
      .max(2),
    specs: z.array(spec).max(30).default([]),
    finishIds: z.array(z.number().int().positive()).max(100).default([]),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    checkUniqueLanguages(v.translations, add);
    checkPrice(v, add);
  });

export type ProductInput = z.infer<typeof productInput>;
