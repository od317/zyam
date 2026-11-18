import { z } from "zod";
import { slug, languageEnum, checkUniqueLanguages } from "./common";

const translation = z.object({
  language: languageEnum,
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(5000).nullish(),
});

export const finishInput = z
  .object({
    slug,
    colorHex: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, "Use a color like #C9A24B")
      .nullish(),
    isPublished: z.boolean().default(false),
    translations: z
      .array(translation)
      .min(1, "At least one language is required")
      .max(2),
  })
  .superRefine((v, ctx) => {
    checkUniqueLanguages(v.translations, (path, message) =>
      ctx.addIssue({ code: "custom", path: [path], message }),
    );
  });

export type FinishInput = z.infer<typeof finishInput>;
