import "dotenv/config";
import { prisma } from "../app/lib/prisma";
import { runMaintenance } from "../app/lib/maintenance";

runMaintenance({ dryRun: process.argv.includes("--dry-run") })
  .then((r) => console.log(r))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
