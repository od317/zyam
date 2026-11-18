import { prisma } from "@/app/lib/prisma";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const cutoff = new Date(Date.now() - windowMs);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1
                     ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN now()
                           ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  return rows[0].count <= limit;
}
