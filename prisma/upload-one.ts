import "dotenv/config";
import sharp from "sharp";
import { prisma } from "../app/lib/prisma";
import { addProjectImage } from "../app/lib/media/ingest";

async function main() {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "admin" },
  });
  const actor = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
  const project = await prisma.project.findFirstOrThrow({
    where: { deletedAt: null },
  });

  const jpeg = await sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .jpeg()
    .toBuffer();

  const res = await addProjectImage(actor, project.id, jpeg);
  console.log("Uploaded, waiting for the worker:", res);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
