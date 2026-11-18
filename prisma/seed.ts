import "dotenv/config";
import { prisma } from "../app/lib/prisma";

async function main() {
  //   await prisma.service.create({
  //     data: {
  //       slug: "service-1",
  //       translations: {
  //         create: [
  //           {
  //             language: "ar",
  //             name: "name-1",
  //             description: "desc-1",
  //           },
  //           {
  //             language: "en",
  //             name: "name-1-en",
  //             description: "desc-1-en",
  //           },
  //         ],
  //       },
  //     },
  //   });
  await prisma.project.create({
    data: {
      slug: "villa-damascus",
      service: { connect: { slug: "service-1" } },
      year: 2025,
      durationMonths: 8,
      isPublished: true,
      priceMode: "exact",
      priceMin: 25000,
      translations: {
        create: [
          {
            language: "ar",
            title: "فيلا دمشق",
            description: "وصف المشروع",
            city: "دمشق",
          },
          {
            language: "en",
            title: "Damascus Villa",
            description: "Project description",
            city: "Damascus",
          },
        ],
      },
    },
  });
}

main()
  .catch((e) => {
    console.log(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
