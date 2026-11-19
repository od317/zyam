"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/app/lib/auth/require-user";
import { languages } from "@/app/lib/i18n";
import type { ActionResult } from "@/app/lib/admin/common";
import * as t from "@/app/lib/admin/taxonomy";
import { updateSettings } from "@/app/lib/admin/settings";

type Role = "admin" | "editor";
type User = Awaited<ReturnType<typeof requireUser>>;

async function run(roles: Role[], fn: (u: User) => Promise<ActionResult>) {
  const res = await fn(await requireUser(roles));
  if (res.ok)
    for (const lang of languages) revalidatePath(`/${lang}`, "layout");
  return res;
}

const staff: Role[] = ["admin", "editor"];
const admin: Role[] = ["admin"];

export async function createCategoryAction(input: unknown) {
  return run(staff, (u) => t.createCategory(u, input));
}
export async function updateCategoryAction(id: number, input: unknown) {
  return run(staff, (u) => t.updateCategory(u, id, input));
}
export async function deleteCategoryAction(id: number) {
  return run(admin, (u) => t.deleteCategory(u, id));
}

export async function createSeriesAction(input: unknown) {
  return run(staff, (u) => t.createSeries(u, input));
}
export async function updateSeriesAction(id: number, input: unknown) {
  return run(staff, (u) => t.updateSeries(u, id, input));
}
export async function deleteSeriesAction(id: number) {
  return run(admin, (u) => t.deleteSeries(u, id));
}

export async function createSpecAction(input: unknown) {
  return run(staff, (u) => t.createSpecDefinition(u, input));
}
export async function updateSpecAction(id: number, input: unknown) {
  return run(staff, (u) => t.updateSpecDefinition(u, id, input));
}
export async function deleteSpecAction(id: number) {
  return run(admin, (u) => t.deleteSpecDefinition(u, id));
}

export async function createServiceAction(input: unknown) {
  return run(admin, (u) => t.createService(u, input));
}
export async function updateServiceAction(id: number, input: unknown) {
  return run(staff, (u) => t.updateService(u, id, input));
}
export async function deleteServiceAction(id: number) {
  return run(admin, (u) => t.deleteService(u, id));
}

export async function updateSettingsAction(input: unknown) {
  const user = await requireUser(["admin"]);
  const res = await updateSettings(user, input);
  if (res.ok) {
    updateTag("settings");
    for (const lang of languages) revalidatePath(`/${lang}`, "layout");
  }
  return res;
}
