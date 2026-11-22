import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./prisma";

const live = { isPublished: true, deletedAt: null } as const;

export async function listSitemapEntries() {
  "use cache";
  cacheLife("hours");
  cacheTag("projects", "products", "finishes", "services");

  const [projects, products, finishes, services] = await Promise.all([
    prisma.project.findMany({
      where: live,
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: live,
      select: { slug: true, updatedAt: true },
    }),
    prisma.finish.findMany({
      where: live,
      select: { slug: true, updatedAt: true },
    }),
    prisma.service.findMany({ select: { slug: true } }),
  ]);
  const withDate = (rows: { slug: string; updatedAt: Date }[]) =>
    rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
  return {
    projects: withDate(projects),
    products: withDate(products),
    finishes: withDate(finishes),
    services: services.map((s) => s.slug),
  };
}
