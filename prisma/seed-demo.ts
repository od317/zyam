import "dotenv/config";
import sharp from "sharp";
import { prisma } from "../app/lib/prisma";
import * as t from "../app/lib/admin/taxonomy";
import { createFinish } from "../app/lib/admin/finishes";
import { createProduct } from "../app/lib/admin/products";
import { createProject } from "../app/lib/admin/projects";
import { updateSettings } from "../app/lib/admin/settings";
import { addImage } from "../app/lib/media/ingest";
import { claimJob, processJob } from "../app/lib/media/process";
import type { ImageKind } from "../app/lib/media/process";

type Res =
  | { ok: true; id: number }
  | { ok: false; errors: Record<string, string> };
function must(label: string, res: Res) {
  if (!res.ok)
    throw new Error(`${label} failed: ${JSON.stringify(res.errors)}`);
  return res.id;
}

// A gold-on-dark abstract picture. No text, so no fonts are needed.
const palettes = [
  ["#0b0b0a", "#3a2f17", "#c9a24b"],
  ["#10201a", "#1f3d30", "#e6c97a"],
  ["#1a1410", "#4a3524", "#c9a24b"],
  ["#0d0d12", "#2b2b3a", "#d9b96a"],
];
async function makeImage(seed: number) {
  const [c1, c2, accent] = palettes[seed % palettes.length];
  const r = (n: number) => 200 + ((seed * 137 + n * 311) % 1800);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${r(1)}" cy="${(r(2) % 1000) + 300}" r="${300 + (seed % 5) * 90}" fill="${accent}" fill-opacity="0.18"/>
    <rect x="${r(3)}" y="${(r(4) % 700) + 200}" width="520" height="760" fill="${accent}" fill-opacity="0.35"/>
    <rect x="${r(5) % 900}" y="1180" width="1500" height="14" fill="${accent}"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

const cities = [
  { ar: "دمشق", en: "Damascus" },
  { ar: "حمص", en: "Homs" },
  { ar: "حلب", en: "Aleppo" },
  { ar: "اللاذقية", en: "Latakia" },
];
const kinds = [
  { ar: "فيلا", en: "Villa" },
  { ar: "شقة", en: "Apartment" },
  { ar: "مكتب", en: "Office" },
  { ar: "مطعم", en: "Restaurant" },
  { ar: "فندق", en: "Hotel" },
];

const services = [
  ["architectural-design", "التصميم المعماري", "Architectural Design"],
  ["interior-design", "التصميم الداخلي", "Interior Design"],
  ["exterior-cladding", "الكسوات الخارجية", "Exterior Cladding"],
  ["ceilings-decorations", "الأسقف والزخارف", "Ceilings & Decorations"],
  ["engineering-supervision", "الإشراف الهندسي", "Engineering Supervision"],
  ["project-management", "إدارة المشاريع", "Project Management"],
] as const;

async function main() {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "admin" },
  });
  const actor = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
  let imageCounter = 0;

  // ---------- clean earlier demo data (children before parents) ----------
  await prisma.project.deleteMany({ where: { slug: { startsWith: "demo-" } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: "demo-" } } });
  await prisma.finish.deleteMany({ where: { slug: { startsWith: "demo-" } } });
  await prisma.productSeries.deleteMany({
    where: { slug: { startsWith: "demo-" } },
  });
  await prisma.productCategory.deleteMany({
    where: { slug: { startsWith: "demo-" } },
  });
  await prisma.specDefinition.deleteMany({
    where: { key: { startsWith: "demo_" } },
  });

  // ---------- services (created only if missing) ----------
  const serviceIds: number[] = [];
  for (const [i, [slug, ar, en]] of services.entries()) {
    const existing = await prisma.service.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      serviceIds.push(existing.id);
      continue;
    }
    serviceIds.push(
      must(
        `service ${slug}`,
        await t.createService(actor, {
          slug,
          sortOrder: i,
          priceMode: "on_request",
          translations: [
            {
              language: "ar",
              name: ar,
              description: `${ar}: نقدم حلولاً متكاملة بجودة عالية وتنفيذ دقيق يعكس ذوق عملائنا.`,
            },
            {
              language: "en",
              name: en,
              description: `${en}: complete solutions with premium quality and precise execution.`,
            },
          ],
        }),
      ),
    );
  }

  // ---------- specs ----------
  const spec = async (
    key: string,
    unit: string | null,
    valueType: "number" | "text",
    ar: string,
    en: string,
  ) =>
    must(
      key,
      await t.createSpecDefinition(actor, {
        key,
        unit,
        valueType,
        translations: [
          { language: "ar", name: ar },
          { language: "en", name: en },
        ],
      }),
    );
  const specHeight = await spec(
    "demo_height",
    "m",
    "number",
    "الارتفاع",
    "Height",
  );
  const specWidth = await spec("demo_width", "cm", "number", "العرض", "Width");
  const specMaterial = await spec(
    "demo_material",
    null,
    "text",
    "الخامة",
    "Material",
  );

  // ---------- finishes ----------
  const finishData = [
    ["gold", "#C9A24B", "ذهبي", "Gold"],
    ["black-matte", "#1A1A1A", "أسود مطفي", "Matte Black"],
    ["walnut", "#5B3A29", "جوز", "Walnut"],
    ["marble-white", "#EDE8DF", "رخام أبيض", "White Marble"],
    ["emerald", "#0F3D2E", "أخضر زمردي", "Emerald"],
    ["bronze", "#8C6A3F", "برونزي", "Bronze"],
  ] as const;
  const finishIds: number[] = [];
  for (const [slug, hex, ar, en] of finishData) {
    const id = must(
      `finish ${slug}`,
      await createFinish(actor, {
        slug: `demo-${slug}`,
        colorHex: hex,
        isPublished: true,
        translations: [
          { language: "ar", name: ar, description: `كسوة ${ar} بملمس فاخر.` },
          {
            language: "en",
            name: en,
            description: `${en} finish with a premium texture.`,
          },
        ],
      }),
    );
    finishIds.push(id);
    await addImage(actor, "finish", id, await makeImage(imageCounter++));
  }

  // ---------- categories, series, products ----------
  const cats = [
    {
      slug: "partitions",
      ar: "الفواصل الجدارية",
      en: "Wall Partitions",
      prefix: "SH",
      specs: [specWidth, specMaterial],
    },
    {
      slug: "lighting",
      ar: "الإنارة",
      en: "Lighting",
      prefix: "LT",
      specs: [specHeight, specMaterial],
    },
    {
      slug: "decor-wood",
      ar: "الخشب والبلاكات",
      en: "Wood & Decor Blocks",
      prefix: "WD",
      specs: [specWidth, specMaterial],
    },
  ];
  const productIds: number[] = [];
  let pIndex = 0;
  for (const [ci, c] of cats.entries()) {
    const catId = must(
      `category ${c.slug}`,
      await t.createCategory(actor, {
        slug: `demo-${c.slug}`,
        sortOrder: ci,
        translations: [
          { language: "ar", name: c.ar },
          { language: "en", name: c.en },
        ],
      }),
    );
    const seriesIds: number[] = [];
    for (const s of [1, 2]) {
      seriesIds.push(
        must(
          `series ${c.slug}-${s}`,
          await t.createSeries(actor, {
            slug: `demo-${c.slug}-series-${s}`,
            categoryId: catId,
            translations: [
              {
                language: "ar",
                name: `السلسلة ${s}`,
                description: "تشكيلة مميزة",
              },
              {
                language: "en",
                name: `Series ${s}`,
                description: "A distinctive collection",
              },
            ],
          }),
        ),
      );
    }
    for (let n = 1; n <= 4; n++) {
      const code = `${c.prefix}-0${n}1`;
      const isNumberFirst = c.specs[0] === specHeight;
      const id = must(
        `product ${code}`,
        await createProduct(actor, {
          slug: `demo-${c.prefix.toLowerCase()}-0${n}`,
          code,
          categoryId: catId,
          seriesId: seriesIds[n % 2],
          isPublished: true,
          priceMode: n === 4 ? "on_request" : n === 3 ? "range" : "exact",
          priceMin: n === 4 ? null : 100 * n + 50,
          priceMax: n === 3 ? 450 : null,
          translations: [
            {
              language: "ar",
              name: `${c.ar} ${code}`,
              description: `منتج ${c.ar} بتصميم عصري وتفاصيل دقيقة.`,
            },
            {
              language: "en",
              name: `${c.en} ${code}`,
              description: `${c.en} product with a modern design and fine details.`,
            },
          ],
          specs: [
            {
              definitionId: c.specs[0],
              numberValue: isNumberFirst ? [1, 1.5, 2, 1][n - 1] : 20 * n + 20,
            },
            { definitionId: specMaterial, textValue: n % 2 ? "خشب" : "معدن" },
          ],
          finishIds: [finishIds[pIndex % 6], finishIds[(pIndex + 2) % 6]],
        }),
      );
      productIds.push(id);
      await addImage(actor, "product", id, await makeImage(imageCounter++));
      if (n % 2)
        await addImage(actor, "product", id, await makeImage(imageCounter++));
      pIndex++;
    }
  }

  // ---------- projects ----------
  const priceCycle = [
    { priceMode: "exact", priceMin: 150000 },
    { priceMode: "range", priceMin: 80000, priceMax: 120000 },
    { priceMode: "hidden" },
    { priceMode: "on_request" },
  ];
  for (let i = 0; i < 14; i++) {
    const city = cities[i % cities.length];
    const kind = kinds[i % kinds.length];
    const arabicOnly = i === 12; // tests the fallback language
    const unpublished = i === 13; // must never appear on the public site
    const translations = [
      {
        language: "ar",
        title: `${kind.ar} ${city.ar} ${i + 1}`,
        description: `مشروع ${kind.ar} في ${city.ar} نُفذ بعناية فائقة.`,
        city: city.ar,
      },
      ...(arabicOnly
        ? []
        : [
            {
              language: "en",
              title: `${kind.en} ${city.en} ${i + 1}`,
              description: `A ${kind.en.toLowerCase()} project in ${city.en}, executed with great care.`,
              city: city.en,
            },
          ]),
    ];
    const id = must(
      `project ${i + 1}`,
      await createProject(actor, {
        slug: `demo-project-${i + 1}`,
        serviceId: serviceIds[i % serviceIds.length],
        year: 2021 + (i % 6),
        durationMonths: 3 + (i % 10),
        isPublished: !unpublished,
        ...priceCycle[i % 4],
        translations,
        productIds: [
          productIds[i % productIds.length],
          productIds[(i + 5) % productIds.length],
        ],
        finishIds: [finishIds[i % 6], finishIds[(i + 3) % 6]],
      }),
    );
    for (let k = 0; k < 3; k++)
      await addImage(actor, "project", id, await makeImage(imageCounter++));
  }

  // ---------- settings ----------
  must(
    "settings",
    (await updateSettings(actor, {
      plain: {
        contact_phone: "+963 944 123 456",
        contact_whatsapp: "+963944123456",
        contact_email: "info@example.com",
        social_instagram: "https://instagram.com/",
        social_facebook: "https://facebook.com/",
        social_tiktok: "https://tiktok.com/",
      },
      translated: {
        about_text: {
          ar: "زيام ديزاين شركة متخصصة بالتصميم المعماري والإكساء والتشطيب وتصنيع المنتجات الديكورية الفاخرة.",
          en: "Zyam Design specializes in architectural design, cladding, finishing and luxury decorative products.",
        },
        address: { ar: "دمشق، سوريا", en: "Damascus, Syria" },
        working_hours: {
          ar: "السبت - الخميس: 9 صباحاً - 5 مساءً",
          en: "Sat - Thu: 9 AM - 5 PM",
        },
      },
    })) as unknown as Res,
  );

  // ---------- process every image now (no need for the worker) ----------
  let done = 0;
  for (;;) {
    const job = await claimJob();
    if (!job) break;
    await processJob(job as { kind: ImageKind } & typeof job);
    if (++done % 10 === 0) console.log(`processed ${done} images...`);
  }
  console.log(`Demo data ready. Images processed: ${done}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
