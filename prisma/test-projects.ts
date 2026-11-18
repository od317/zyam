import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../app/lib/prisma";
import {
  createProject,
  updateProject,
  setPublished,
  deleteProject,
} from "../app/lib/admin/projects";

const base = {
  slug: "test-villa",
  serviceId: 0, // set below
  priceMode: "exact" as const,
  priceMin: 1000,
  translations: [
    { language: "ar" as const, title: "فيلا اختبار", description: "وصف" },
  ],
};

async function main() {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "admin" },
  });
  const actorAdmin = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
  const actorEditor = { ...actorAdmin, role: "editor" as const };
  const service = await prisma.service.findFirstOrThrow();
  const input = { ...base, serviceId: service.id };

  await prisma.project.deleteMany({ where: { slug: "test-villa" } }); // clean earlier runs

  // valid create
  const created = await createProject(actorEditor, input);
  assert.equal(created.ok, true);
  const id = (created as { id: number }).id;

  // duplicate slug is rejected
  const dup = await createProject(actorEditor, input);
  assert.equal(dup.ok, false);

  // hidden price with a number is rejected
  const bad = await createProject(actorEditor, {
    ...input,
    slug: "test-2",
    priceMode: "hidden",
  });
  assert.equal(bad.ok, false);

  // no translations is rejected
  const none = await createProject(actorEditor, {
    ...input,
    slug: "test-3",
    translations: [],
  });
  assert.equal(none.ok, false);

  // update, publish
  assert.equal(
    (await updateProject(actorEditor, id, { ...input, priceMin: 2000 })).ok,
    true,
  );
  assert.equal((await setPublished(actorEditor, id, true)).ok, true);

  // editor cannot delete, admin can
  await assert.rejects(() => deleteProject(actorEditor, id));
  assert.equal((await deleteProject(actorAdmin, id)).ok, true);

  // soft deleted: row still there, unpublished, and update now fails
  const row = await prisma.project.findUniqueOrThrow({ where: { id } });
  assert.ok(row.deletedAt);
  assert.equal(row.isPublished, false);
  assert.equal((await updateProject(actorEditor, id, input)).ok, false);

  const logs = await prisma.auditLog.count({
    where: { entityType: "Project", entityId: id },
  });
  console.log("All checks passed. Audit rows for this project:", logs);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
