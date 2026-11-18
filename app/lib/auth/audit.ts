import { prisma } from "../prisma";
import type { Prisma } from "../../generated/prisma/client";

export function audit(
  userId: number | null,
  action: string,
  entityType: string,
  entityId?: number,
  details?: Prisma.InputJsonValue,
  db: { auditLog: typeof prisma.auditLog } = prisma,
) {
  return db.auditLog.create({
    data: { userId, action, entityType, entityId, details },
  });
}
