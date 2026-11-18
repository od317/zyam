import { z } from "zod";

export const inquiryInput = z
  .object({
    type: z.enum(["consultation", "project_idea", "quote_request"]),
    name: z.string().trim().min(2, "Name is required").max(100),
    phone: z
      .string()
      .trim()
      .transform((s) => s.replace(/[\s\-()]/g, ""))
      .pipe(z.string().regex(/^\+?[0-9]{7,15}$/, "Invalid phone number")),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email")
      .max(200)
      .optional(),
    title: z.string().trim().max(200).optional(),
    message: z.string().trim().min(10, "Please write a few words").max(5000),
    projectSlug: z.string().trim().max(80).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "project_idea" && !v.title) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Title is required for a project idea",
      });
    }
  });
