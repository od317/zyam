"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/app/lib/auth/require-user";
import { languages } from "@/app/lib/i18n";
import {
  createProject,
  updateProject,
  setPublished,
  deleteProject,
  type ActionResult,
} from "@/app/lib/admin/projects";

function refreshPublicPages() {
  for (const lang of languages) revalidatePath(`/${lang}/projects`);
}

export async function createProjectAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const res = await createProject(user, input);
  if (res.ok) refreshPublicPages();
  return res;
}

export async function updateProjectAction(
  id: number,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const res = await updateProject(user, id, input);
  if (res.ok) refreshPublicPages();
  return res;
}

export async function setPublishedAction(
  id: number,
  published: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const res = await setPublished(user, id, published);
  if (res.ok) refreshPublicPages();
  return res;
}

export async function deleteProjectAction(id: number): Promise<ActionResult> {
  const user = await requireUser(["admin"]);
  const res = await deleteProject(user, id);
  if (res.ok) refreshPublicPages();
  return res;
}
