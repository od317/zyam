import { prisma } from "@/app/lib/prisma";

export async function findActiveUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: {
      email: email.trim().toLowerCase(),
      isActive: true,
    },
  });
}
