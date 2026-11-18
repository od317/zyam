import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../app/lib/prisma";
import { createProduct } from "../app/lib/admin/products";
import * as t from "../app/lib/admin/taxonomy";
import { getSettings, updateSettings } from "../app/lib/admin/settings";

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
  const e = { ...a, role: "editor" as const };

  await prisma.product.deleteMany({ where: { slug: { startsWith: "tx-" } } });
  await prisma.productSeries.deleteMany({
    where: { slug: { startsWith: "tx-" } },
  });
  await prisma.productCategory.deleteMany({
    where: { slug: { startsWith: "tx-" } },
  });
  await prisma.specDefinition.deleteMany({
    where: { key: { startsWith: "tx_" } },
  });
  await prisma.service.deleteMany({ where: { slug: { startsWith: "tx-" } } });

  const ar = (name: string) => [{ language: "ar" as const, name }];

  // category + series + spec
  const cat = await t.createCategory(e, {
    slug: "tx-cat",
    translations: ar("فئة"),
  });
  assert.equal(cat.ok, true);
  const catId = (cat as { id: number }).id;
  assert.equal(
    (await t.createCategory(e, { slug: "tx-cat", translations: ar("x") })).ok,
    false,
  ); // duplicate slug
  assert.equal(
    (await t.createCategory(e, { slug: "Bad Slug", translations: ar("x") })).ok,
    false,
  );

  const ser = await t.createSeries(e, {
    slug: "tx-series",
    categoryId: catId,
    translations: ar("سلسلة"),
  });
  assert.equal(ser.ok, true);
  const serId = (ser as { id: number }).id;

  const spec = await t.createSpecDefinition(e, {
    key: "TX_Height",
    unit: "m",
    valueType: "number",
    translations: ar("ارتفاع"),
  });
  assert.equal(spec.ok, true);
  const specId = (spec as { id: number }).id;

  // a product makes all three "in use"
  const prod = await createProduct(e, {
    slug: "tx-product",
    code: "TX-1",
    categoryId: catId,
    seriesId: serId,
    priceMode: "on_request",
    translations: [{ language: "ar", name: "منتج", description: "وصف" }],
    specs: [{ definitionId: specId, numberValue: 2 }],
  });
  assert.equal(prod.ok, true);

  // friendly messages instead of database errors
  for (const res of [
    await t.deleteCategory(a, catId),
    await t.deleteSeries(a, serId),
    await t.deleteSpecDefinition(a, specId),
  ]) {
    assert.equal(res.ok, false);
    assert.ok((res as { errors: Record<string, string> }).errors._form);
  }
  // type change is blocked while in use
  assert.equal(
    (
      await t.updateSpecDefinition(e, specId, {
        key: "tx_height",
        valueType: "text",
        translations: ar("ارتفاع"),
      })
    ).ok,
    false,
  );
  // editors cannot delete
  await assert.rejects(() => t.deleteCategory(e, catId));

  // once the product is gone, deleting works
  await prisma.product.deleteMany({ where: { slug: "tx-product" } });
  assert.equal((await t.deleteSeries(a, serId)).ok, true);
  assert.equal((await t.deleteSpecDefinition(a, specId)).ok, true);
  assert.equal((await t.deleteCategory(a, catId)).ok, true);

  // services
  await assert.rejects(() => t.createService(e, {})); // editors cannot create services
  const svc = await t.createService(a, {
    slug: "tx-service",
    priceMode: "range",
    priceMin: 100,
    priceMax: 50,
    translations: [{ language: "ar", name: "خدمة", description: "وصف" }],
  });
  assert.equal(svc.ok, false); // max < min
  const svc2 = await t.createService(a, {
    slug: "tx-service",
    priceMode: "range",
    priceMin: 50,
    priceMax: 100,
    translations: [{ language: "ar", name: "خدمة", description: "وصف" }],
  });
  assert.equal(svc2.ok, true);
  assert.equal(
    (await t.deleteService(a, (svc2 as { id: number }).id)).ok,
    true,
  );

  // settings
  await assert.rejects(() => updateSettings(e, {})); // admin only
  assert.equal(
    (await updateSettings(a, { plain: { not_a_key: "x" } })).ok,
    false,
  );
  assert.equal(
    (await updateSettings(a, { plain: { contact_email: "nope" } })).ok,
    false,
  );
  assert.equal(
    (
      await updateSettings(a, {
        plain: { contact_phone: "+963944123456" },
        translated: { about_text: { ar: "نبذة", en: "About" } },
      })
    ).ok,
    true,
  );
  const s = await getSettings();
  assert.equal(s.plain.contact_phone, "+963944123456");
  assert.equal(s.translated.about_text.en, "About");
  assert.equal(s.plain.social_instagram, ""); // missing keys come back empty, never undefined

  console.log("All taxonomy and settings checks passed");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
