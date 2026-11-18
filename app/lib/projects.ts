import { prisma } from "./prisma";
import type { Language } from "./i18n";

export async function listProjects(language: Language) {
  return prisma.project.findMany({
    where: { isPublished: true },
    include: { translations: { where: { language } } },
    orderBy: { createdAt: "desc" },
  });
}
