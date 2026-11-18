"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth/require-user";
import { languages } from "@/app/lib/i18n";
import type { ActionResult } from "@/app/lib/admin/common";
import {
  createProduct,
  updateProduct,
  setProductPublished,
  deleteProduct,
} from "@/app/lib/admin/products";
import {
  createFinish,
  updateFinish,
  setFinishPublished,
  deleteFinish,
} from "@/app/lib/admin/finishes";

function refresh(section: "products" | "finishes") {
  for (const lang of languages) revalidatePath(`/${lang}/${section}`);
}

async function run(
  section: "products" | "finishes",
  roles: ("admin" | "editor")[],
  fn: (u: Awaited<ReturnType<typeof requireUser>>) => Promise<ActionResult>,
) {
  const res = await fn(await requireUser(roles));
  if (res.ok) refresh(section);
  return res;
}

export const createProductAction = (input: unknown) =>
  run("products", ["admin", "editor"], (u) => createProduct(u, input));
export const updateProductAction = (id: number, input: unknown) =>
  run("products", ["admin", "editor"], (u) => updateProduct(u, id, input));
export const setProductPublishedAction = (id: number, p: boolean) =>
  run("products", ["admin", "editor"], (u) => setProductPublished(u, id, p));
export const deleteProductAction = (id: number) =>
  run("products", ["admin"], (u) => deleteProduct(u, id));

export const createFinishAction = (input: unknown) =>
  run("finishes", ["admin", "editor"], (u) => createFinish(u, input));
export const updateFinishAction = (id: number, input: unknown) =>
  run("finishes", ["admin", "editor"], (u) => updateFinish(u, id, input));
export const setFinishPublishedAction = (id: number, p: boolean) =>
  run("finishes", ["admin", "editor"], (u) => setFinishPublished(u, id, p));
export const deleteFinishAction = (id: number) =>
  run("finishes", ["admin"], (u) => deleteFinish(u, id));
