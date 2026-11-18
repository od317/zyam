import "dotenv/config";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prisma } from "../app/lib/prisma";
import { addProjectImage } from "../app/lib/media/ingest";
import { claimJob, processJob } from "../app/lib/media/process";

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
  const project = await prisma.project.findFirstOrThrow({
    where: { deletedAt: null },
  });

  const jpeg = await sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: { r: 200, g: 120, b: 40 },
    },
  })
    .jpeg()
    .toBuffer();

  // a valid image is accepted and waits for the worker
  const res = await addProjectImage(actor, project.id, jpeg);
  assert.equal(res.status, "processing");

  // fake images are rejected
  await assert.rejects(() =>
    addProjectImage(actor, project.id, Buffer.from("<?php echo 1; ?>")),
  );
  await assert.rejects(() =>
    addProjectImage(actor, project.id, Buffer.alloc(16 * 1024 * 1024)),
  );

  // run the worker's job once
  const job = await claimJob();
  assert.ok(job);
  await processJob(job);

  const row = await prisma.projectImage.findUniqueOrThrow({
    where: { id: res.id },
  });
  assert.equal(row.status, "ready");
  assert.ok(row.thumbUrl && row.mediumUrl && row.largeUrl && row.blurDataUrl);
  console.log(
    "Ready:",
    row.thumbUrl,
    row.mediumUrl,
    row.largeUrl,
    `${row.width}x${row.height}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
