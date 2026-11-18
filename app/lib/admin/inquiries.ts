import { z } from "zod";
import { prisma } from "../prisma";
import { audit } from "../auth/audit";
import type { Actor } from "../auth/require-user";

const PAGE_SIZE = 20;

export async function listInquiries(
  actor: Actor,
  opts: { status?: "new" | "contacted" | "closed"; page?: number } = {},
) {
  if (actor.role !== "admin" && actor.role !== "editor")
    throw new Error("Not allowed");
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.status ? { status: opts.status } : {};

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: {
        images: { select: { id: true } },
        project: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.inquiry.count({ where }),
  ]);
  return { items, total, page, pageSize: PAGE_SIZE };
}

export async function countNewInquiries(actor: Actor) {
  if (actor.role !== "admin" && actor.role !== "editor")
    throw new Error("Not allowed");
  return prisma.inquiry.count({ where: { status: "new" } });
}

const updateInput = z.object({
  status: z.enum(["new", "contacted", "closed"]),
  adminNote: z.string().trim().max(5000).optional(),
});

export async function updateInquiry(actor: Actor, id: number, input: unknown) {
  if (actor.role !== "admin" && actor.role !== "editor")
    throw new Error("Not allowed");
  const d = updateInput.parse(input);

  const res = await prisma.inquiry.updateMany({
    where: { id },
    data: { status: d.status, adminNote: d.adminNote ?? null },
  });
  if (res.count === 0) return { ok: false as const };

  await audit(actor.id, "inquiry.update", "Inquiry", id, { status: d.status });
  return { ok: true as const };
}
