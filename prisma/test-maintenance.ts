import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { utimes } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../app/lib/prisma";
import { putPrivate, listFiles } from "../app/lib/storage";
import { runMaintenance } from "../app/lib/maintenance";

async function main() {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "admin" },
  });
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const rid = () => randomBytes(16).toString("hex");

  await prisma.session.create({
    data: { id: rid(), userId: admin.id, expiresAt: old },
  });
  const live = await prisma.session.create({
    data: {
      id: rid(),
      userId: admin.id,
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });
  await prisma.pendingLogin.create({
    data: { id: rid(), userId: admin.id, expiresAt: old },
  });
  await prisma.rateLimit.create({
    data: { key: `test:old:${rid()}`, count: 1, windowStart: old },
  });

  // one old orphan (should go) and one fresh orphan (must survive the grace period)
  const oldKey = `inquiries/orphan-old-${rid()}.webp`;
  const freshKey = `inquiries/orphan-fresh-${rid()}.webp`;
  await putPrivate(oldKey, Buffer.from("x"));
  await putPrivate(freshKey, Buffer.from("x"));
  const storageDir = path.resolve(
    process.cwd(),
    process.env.STORAGE_DIR ?? "storage",
  );
  await utimes(path.join(storageDir, oldKey), old, old);

  // dry run changes no files
  const dry = await runMaintenance({ dryRun: true });
  assert.ok(dry.orphanList!.some((o) => o.key === oldKey));
  assert.ok(!dry.orphanList!.some((o) => o.key === freshKey));
  assert.ok((await listFiles("private")).some((f) => f.key === oldKey));

  const res = await runMaintenance();
  assert.ok(res.rateLimits >= 1);
  const keys = (await listFiles("private")).map((f) => f.key);
  assert.ok(!keys.includes(oldKey));
  assert.ok(keys.includes(freshKey));
  assert.ok(await prisma.session.findUnique({ where: { id: live.id } })); // live session survives
  assert.equal(
    await prisma.session.count({ where: { expiresAt: { lt: new Date() } } }),
    0,
  );
  assert.equal(
    await prisma.pendingLogin.count({
      where: { expiresAt: { lt: new Date() } },
    }),
    0,
  );

  await prisma.session.delete({ where: { id: live.id } });
  console.log("All maintenance checks passed", res);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
