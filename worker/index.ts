import "dotenv/config";
import sharp from "sharp";
import { prisma } from "../app/lib/prisma";
import { claimJob, processJob } from "../app/lib/media/process";
import { runMaintenance } from "../app/lib/maintenance";

sharp.concurrency(1);
let running = true;
process.on("SIGTERM", () => (running = false));
process.on("SIGINT", () => (running = false));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let nextMaintenance = 0;

async function main() {
  console.log("Image worker started");
  while (running) {
    if (Date.now() >= nextMaintenance) {
      nextMaintenance = Date.now() + 60 * 60 * 1000;
      try {
        console.log("Maintenance:", await runMaintenance());
      } catch (e) {
        console.error("Maintenance failed", e); // never let cleanup kill the image worker
      }
    }
    const job = await claimJob();
    if (!job) {
      await sleep(2000);
      continue;
    }
    console.log(
      `Processing ${job.kind} image ${job.id} (attempt ${job.attempts})`,
    );
    await processJob(job);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
