import { prisma } from "./prisma";
import { listFiles, removeFile } from "./storage";

const GRACE_MS = 60 * 60 * 1000;

export async function runMaintenance({
  dryRun = false,
}: { dryRun?: boolean } = {}) {
  const now = new Date();

  // 1. Expired rows (harmless to delete, so dry-run does not skip these)
  const sessions = await prisma.session.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  const pending = await prisma.pendingLogin.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  const limits = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  // 2. Orphan files: build the set of keys the database knows about
  const sel = {
    originalKey: true,
    thumbUrl: true,
    mediumUrl: true,
    largeUrl: true,
  } as const;
  const [pi, pr, fi, inq] = await Promise.all([
    prisma.projectImage.findMany({ select: sel }),
    prisma.productImage.findMany({ select: sel }),
    prisma.finishImage.findMany({ select: sel }),
    prisma.inquiryImage.findMany({ select: { url: true } }),
  ]);

  const privateKnown = new Set<string>(inq.map((r) => r.url));
  const publicKnown = new Set<string>();
  for (const r of [...pi, ...pr, ...fi]) {
    privateKnown.add(r.originalKey);
    for (const u of [r.thumbUrl, r.mediumUrl, r.largeUrl])
      if (u) publicKnown.add(u);
  }

  const orphans: { root: "private" | "public"; key: string }[] = [];
  for (const f of await listFiles("private")) {
    if (!privateKnown.has(f.key) && Date.now() - f.mtimeMs > GRACE_MS)
      orphans.push({ root: "private", key: f.key });
  }
  for (const f of await listFiles("public")) {
    if (
      !publicKnown.has(`/uploads/${f.key}`) &&
      Date.now() - f.mtimeMs > GRACE_MS
    )
      orphans.push({ root: "public", key: f.key });
  }
  if (!dryRun) for (const o of orphans) await removeFile(o.root, o.key);

  // 3. Report only, a human decides what to do about failures
  const failedImages =
    (await prisma.projectImage.count({ where: { status: "failed" } })) +
    (await prisma.productImage.count({ where: { status: "failed" } })) +
    (await prisma.finishImage.count({ where: { status: "failed" } }));

  return {
    sessions: sessions.count,
    pendingLogins: pending.count,
    rateLimits: limits.count,
    orphanFiles: orphans.length,
    orphansDeleted: !dryRun,
    orphanList: dryRun ? orphans : undefined,
    failedImages,
  };
}
