import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

export function audit(
  userId: number | null,
  action: string,
  entityType: string,
  entityId?: number,
  details?: Prisma.InputJsonValue,
) {
  return prisma.auditLog.create({
    data: { userId, action, entityType, entityId, details },
  });
}
