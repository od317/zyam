import "dotenv/config";
import { prisma } from "../app/lib/prisma";
import { hashPassword } from "../app/lib/auth/password";

async function main() {
  const [emailArg, password, nameArg] = process.argv.slice(2);

  if (!emailArg || !password) {
    throw new Error(
      "Usage: npx tsx prisma/create-admin.ts <email> <password> [name]",
    );
  }
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters");
  }

  const email = emailArg.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name: nameArg ?? "Admin",
      passwordHash,
      role: "admin",
    },
  });

  console.log(`Created admin #${user.id} (${user.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
