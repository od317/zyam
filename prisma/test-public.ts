import "dotenv/config";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prisma } from "../app/lib/prisma";
import { createProject, deleteProject } from "../app/lib/admin/projects";
import { updateSettings } from "../app/lib/admin/settings";
import { addImage } from "../app/lib/media/ingest";
import { claimJob, processJob } from "../app/lib/media/process";
import {
  listPublicProjects,
  getPublicProject,
} from "../app/lib/public/projects";
import { normalizeSearch } from "../app/lib/public/search";
import { getPublicSettings } from "../app/lib/public/site";

async function main() {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "admin" },
  });
  const a = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };

  await prisma.project.deleteMany({ where: { slug: { startsWith: "pub-" } } });
  await prisma.service.deleteMany({ where: { slug: "pub-svc" } });
  const svc = await prisma.service.create({
    data: {
      slug: "pub-svc",
      translations: {
        create: [{ language: "ar", name: "خدمة", description: "وصف" }],
      },
    },
  });

  const make = (
    slug: string,
    title: string,
    extra: object = {},
    lang: "ar" | "en" = "ar",
  ) =>
    createProject(a, {
      slug,
      serviceId: svc.id,
      isPublished: true,
      priceMode: "on_request",
      translations: [
        { language: lang, title, description: "وصف", city: "حمص" },
      ],
      ...extra,
    });

  assert.equal(
    (
      await make("pub-a", "مدرسة إنارة", {
        priceMode: "range",
        priceMin: 100,
        priceMax: 200,
      })
    ).ok,
    true,
  );
  assert.equal(
    (await make("pub-b", "مدرسة مخفية", { isPublished: false })).ok,
    true,
  );
  const c = await make("pub-c", "فيلا", { priceMode: "hidden" });
  assert.equal(c.ok, true);
  assert.equal((await make("pub-d", "Modern House", {}, "en")).ok, true);

  // Arabic normalization
  assert.equal(normalizeSearch("إنارَة"), normalizeSearch("انارة"));

  const slugs = (r: { items: { slug: string }[] }) =>
    r.items.map((i) => i.slug).sort();

  // service filter returns published only
  assert.deepEqual(
    slugs(await listPublicProjects({ lang: "ar", service: "pub-svc" })),
    ["pub-a", "pub-c", "pub-d"],
  );

  // search: spelling variant matches, unpublished does not, wildcards are literal
  assert.deepEqual(
    slugs(await listPublicProjects({ lang: "ar", q: "مدرسه" })),
    ["pub-a"],
  );
  assert.equal(
    (await listPublicProjects({ lang: "ar", q: "%" })).items.length,
    0,
  );
  // search crosses languages
  assert.ok(
    slugs(await listPublicProjects({ lang: "ar", q: "modern" })).includes(
      "pub-d",
    ),
  );

  // city filter and pagination clamp
  assert.deepEqual(
    slugs(
      await listPublicProjects({ lang: "ar", service: "pub-svc", city: "حمص" }),
    ),
    ["pub-a", "pub-c", "pub-d"],
  );
  assert.equal(
    (await listPublicProjects({ lang: "ar", limit: 1000 })).limit,
    50,
  );

  // prices: range shown, hidden removed
  const all = await listPublicProjects({ lang: "ar", service: "pub-svc" });
  assert.deepEqual(all.items.find((i) => i.slug === "pub-a")!.price, {
    mode: "range",
    min: 100,
    max: 200,
  });
  assert.equal(all.items.find((i) => i.slug === "pub-c")!.price, null);

  // fallback language
  const fb = (await listPublicProjects({ lang: "en", q: "مدرسه" })).items[0];
  assert.equal(fb.title, "مدرسة إنارة");
  assert.equal(fb.textLanguage, "ar");

  // detail: unpublished is invisible, images appear only when ready, private paths never leak
  assert.equal(await getPublicProject("pub-b", "ar"), null);
  const row = await prisma.project.findFirstOrThrow({
    where: { slug: "pub-a" },
  });
  const jpeg = await sharp({
    create: { width: 2000, height: 1200, channels: 3, background: "#336699" },
  })
    .jpeg()
    .toBuffer();
  await addImage(a, "project", row.id, jpeg);
  assert.equal((await getPublicProject("pub-a", "ar"))!.images.length, 0);
  for (let i = 0; i < 20; i++) {
    const job = await claimJob();
    if (!job) break;
    await processJob(job);
  }
  const detail = await getPublicProject("pub-a", "ar");
  assert.equal(detail!.images.length, 1);
  const json = JSON.stringify(detail);
  assert.ok(!json.includes("originalKey") && !json.includes("originals/"));

  // soft-deleted disappears
  await deleteProject(a, (c as { id: number }).id);
  assert.equal(await getPublicProject("pub-c", "ar"), null);

  // settings fallback
  await updateSettings(a, {
    translated: { about_text: { ar: "نبذة", en: "" } },
  });
  assert.equal((await getPublicSettings("en")).about_text, "نبذة");

  console.log("All public read checks passed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
