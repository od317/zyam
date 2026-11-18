import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Lowercase letters, digits and single hyphens only",
  );

const translation = z.object({
  language: z.enum(["ar", "en"]),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(10000),
  city: z.string().trim().max(100).nullish(),
});

export const projectInput = z
  .object({
    slug,
    serviceId: z.number().int().positive(),
    year: z
      .number()
      .int()
      .min(1990)
      .max(new Date().getFullYear() + 1)
      .nullish(),
    durationMonths: z.number().int().positive().max(600).nullish(),
    isPublished: z.boolean().default(false),
    priceMode: z.enum(["exact", "range", "hidden", "on_request"]),
    priceMin: z.number().nonnegative().nullish(),
    priceMax: z.number().nonnegative().nullish(),
    translations: z
      .array(translation)
      .min(1, "At least one language is required")
      .max(2),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    const langs = v.translations.map((t) => t.language);
    if (new Set(langs).size !== langs.length) {
      add("translations", "Each language can appear only once");
    }

    const hasMin = v.priceMin != null;
    const hasMax = v.priceMax != null;

    if (v.priceMode === "exact") {
      if (!hasMin) add("priceMin", "Price is required");
      if (hasMax) add("priceMax", "Must be empty for an exact price");
    } else if (v.priceMode === "range") {
      if (!hasMin) add("priceMin", "Minimum price is required");
      if (!hasMax) add("priceMax", "Maximum price is required");
      if (hasMin && hasMax && v.priceMax! < v.priceMin!) {
        add("priceMax", "Maximum must be at least the minimum");
      }
    } else {
      if (hasMin) add("priceMin", "Must be empty when the price is not shown");
      if (hasMax) add("priceMax", "Must be empty when the price is not shown");
    }
  });

export type ProjectInput = z.infer<typeof projectInput>;
