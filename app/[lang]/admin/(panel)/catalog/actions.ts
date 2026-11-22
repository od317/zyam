"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
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
import { deleteImage, reorderImages } from "@/app/lib/admin/images";

type Role = "admin" | "editor";
type User = Awaited<ReturnType<typeof requireUser>>;
type Section = "products" | "finishes";

const staff: Role[] = ["admin", "editor"];
const admin: Role[] = ["admin"];
const idList = z.array(z.number().int().positive()).max(200);

// Project pages are tagged "products" and "finishes" too, so they refresh with these.
function refresh(section: Section) {
  updateTag(section);
  for (const lang of languages) revalidatePath(`/${lang}/${section}`);
}

async function run(
  section: Section,
  roles: Role[],
  fn: (u: User) => Promise<ActionResult>,
) {
  const res = await fn(await requireUser(roles));
  if (res.ok) refresh(section);
  return res;
}

export async function createProductAction(input: unknown) {
  return run("products", staff, (u) => createProduct(u, input));
}
export async function updateProductAction(id: number, input: unknown) {
  return run("products", staff, (u) => updateProduct(u, id, input));
}
export async function setProductPublishedAction(
  id: number,
  published: boolean,
) {
  return run("products", staff, (u) => setProductPublished(u, id, published));
}
export async function deleteProductAction(id: number) {
  return run("products", admin, (u) => deleteProduct(u, id));
}

export async function createFinishAction(input: unknown) {
  return run("finishes", staff, (u) => createFinish(u, input));
}
export async function updateFinishAction(id: number, input: unknown) {
  return run("finishes", staff, (u) => updateFinish(u, id, input));
}
export async function setFinishPublishedAction(id: number, published: boolean) {
  return run("finishes", staff, (u) => setFinishPublished(u, id, published));
}
export async function deleteFinishAction(id: number) {
  return run("finishes", admin, (u) => deleteFinish(u, id));
}

export async function deleteProductImageAction(imageId: number) {
  const user = await requireUser();
  const res = await deleteImage(user, "product", imageId);
  if (res.ok) refresh("products");
  return res;
}
export async function reorderProductImagesAction(
  productId: number,
  order: unknown,
) {
  const user = await requireUser();
  const parsed = idList.safeParse(order);
  if (!parsed.success) return { ok: false as const, error: "Invalid list" };
  const res = await reorderImages(user, "product", productId, parsed.data);
  if (res.ok) refresh("products");
  return res;
}

export async function deleteFinishImageAction(imageId: number) {
  const user = await requireUser();
  const res = await deleteImage(user, "finish", imageId);
  if (res.ok) refresh("finishes");
  return res;
}
export async function reorderFinishImagesAction(
  finishId: number,
  order: unknown,
) {
  const user = await requireUser();
  const parsed = idList.safeParse(order);
  if (!parsed.success) return { ok: false as const, error: "Invalid list" };
  const res = await reorderImages(user, "finish", finishId, parsed.data);
  if (res.ok) refresh("finishes");
  return res;
}
