"use server";
import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/app/lib/auth/require-user";
import { languages } from "@/app/lib/i18n";
import {
  createProject,
  updateProject,
  setPublished,
  deleteProject,
  type ActionResult,
} from "@/app/lib/admin/projects";
import { z } from "zod";
import { deleteImage, reorderImages } from "@/app/lib/admin/images";

export async function deleteProjectImageAction(imageId: number) {
  const user = await requireUser();
  const res = await deleteImage(user, "project", imageId);
  if (res.ok) refreshPublicPages();
  return res;
}

export async function reorderProjectImagesAction(
  projectId: number,
  ids: unknown,
) {
  const user = await requireUser();
  // Server actions are public endpoints: never trust the shape of what arrives.
  const parsed = z.array(z.number().int().positive()).max(200).safeParse(ids);
  if (!parsed.success) return { ok: false as const, error: "Invalid list" };
  const res = await reorderImages(user, "project", projectId, parsed.data);
  if (res.ok) refreshPublicPages();
  return res;
}

function refreshPublicPages() {
  updateTag("projects"); // clears the cached list and project pages right now
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
