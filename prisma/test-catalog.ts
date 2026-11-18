import "dotenv/config";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prisma } from "../app/lib/prisma";
import {
  createProduct,
  updateProduct,
  setProductPublished,
  deleteProduct,
} from "../app/lib/admin/products";
import { createFinish, deleteFinish } from "../app/lib/admin/finishes";
import { addImage } from "../app/lib/media/ingest";
import { claimJob, processJob } from "../app/lib/media/process";

async function main() {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "admin" },
  });
  const adminActor = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
  const editor = { ...adminActor, role: "editor" as const };

  // clean earlier runs (children first)
  await prisma.product.deleteMany({ where: { slug: { startsWith: "test-" } } });
  await prisma.finish.deleteMany({ where: { slug: { startsWith: "test-" } } });
  await prisma.productSeries.deleteMany({
    where: { slug: { startsWith: "test-" } },
  });
  await prisma.productCategory.deleteMany({
    where: { slug: { startsWith: "test-" } },
  });
  await prisma.specDefinition.deleteMany({
    where: { key: { startsWith: "test_" } },
  });

  // fixtures (their dashboard comes in the next step)
  const cat = await prisma.productCategory.create({
    data: {
      slug: "test-cat",
      translations: { create: [{ language: "ar", name: "فواصل" }] },
    },
  });
  const cat2 = await prisma.productCategory.create({
    data: {
      slug: "test-cat-2",
      translations: { create: [{ language: "ar", name: "إنارة" }] },
    },
  });
  const series2 = await prisma.productSeries.create({
    data: {
      slug: "test-series-2",
      categoryId: cat2.id,
      translations: { create: [{ language: "ar", name: "سلسلة" }] },
    },
  });
  const height = await prisma.specDefinition.create({
    data: {
      key: "test_height",
      unit: "m",
      valueType: "number",
      translations: { create: [{ language: "ar", name: "الارتفاع" }] },
    },
  });

  const finishRes = await createFinish(editor, {
    slug: "test-gold",
    colorHex: "#C9A24B",
    translations: [{ language: "ar", name: "ذهبي" }],
  });
  assert.equal(finishRes.ok, true);
  const finishId = (finishRes as { id: number }).id;
  assert.equal(
    (
      await createFinish(editor, {
        slug: "test-bad",
        colorHex: "gold",
        translations: [{ language: "ar", name: "x" }],
      })
    ).ok,
    false,
  );

  const base = {
    slug: "test-product",
    code: "sh-01",
    categoryId: cat.id,
    priceMode: "exact",
    priceMin: 500,
    translations: [{ language: "ar", name: "فاصل جداري", description: "وصف" }],
    specs: [{ definitionId: height.id, numberValue: 1.5 }],
    finishIds: [finishId],
  };

  const created = await createProduct(editor, base);
  assert.equal(created.ok, true);
  const id = (created as { id: number }).id;
  assert.equal(
    (await prisma.product.findUniqueOrThrow({ where: { id } })).code,
    "SH-01",
  ); // normalized

  assert.equal(
    (await createProduct(editor, { ...base, slug: "test-p2" })).ok,
    false,
  ); // duplicate code
  assert.equal(
    (
      await createProduct(editor, {
        ...base,
        slug: "test-p3",
        code: "SH-02",
        seriesId: series2.id,
      })
    ).ok,
    false,
  ); // series of another category
  assert.equal(
    (
      await createProduct(editor, {
        ...base,
        slug: "test-p4",
        code: "SH-03",
        specs: [{ definitionId: height.id, textValue: "tall" }],
      })
    ).ok,
    false,
  ); // wrong spec type
  assert.equal(
    (
      await createProduct(editor, {
        ...base,
        slug: "test-p5",
        code: "SH-04",
        finishIds: [999999],
      })
    ).ok,
    false,
  ); // missing finish
  assert.equal(
    (
      await createProduct(editor, {
        ...base,
        slug: "test-p6",
        code: "SH-05",
        priceMode: "hidden",
      })
    ).ok,
    false,
  ); // hidden + price

  assert.equal(
    (await updateProduct(editor, id, { ...base, priceMin: 700, specs: [] })).ok,
    true,
  );
  assert.equal((await setProductPublished(editor, id, true)).ok, true);

  // images through the shared pipeline
  const jpeg = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: "#996633" },
  })
    .jpeg()
    .toBuffer();
  const pImg = await addImage(editor, "product", id, jpeg);
  const fImg = await addImage(editor, "finish", finishId, jpeg);
  for (let i = 0; i < 20; i++) {
    const job = await claimJob();
    if (!job) break;
    await processJob(job);
  }
  assert.equal(
    (await prisma.productImage.findUniqueOrThrow({ where: { id: pImg.id } }))
      .status,
    "ready",
  );
  assert.equal(
    (await prisma.finishImage.findUniqueOrThrow({ where: { id: fImg.id } }))
      .status,
    "ready",
  );

  // delete rules
  await assert.rejects(() => deleteProduct(editor, id));
  await assert.rejects(() => deleteFinish(editor, finishId));
  assert.equal((await deleteProduct(adminActor, id)).ok, true);
  assert.equal((await deleteFinish(adminActor, finishId)).ok, true);

  console.log("All catalog checks passed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
