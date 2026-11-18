import "dotenv/config";
import sharp from "sharp";
import { prisma } from "../app/lib/prisma";
import { claimJob, processJob } from "../app/lib/media/process";

sharp.concurrency(1); // limit CPU use so a big upload can't starve the website
let running = true;
process.on("SIGTERM", () => (running = false)); // Docker sends this on stop
process.on("SIGINT", () => (running = false));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("Image worker started");
  while (running) {
    const job = await claimJob();
    if (!job) {
      await sleep(2000);
      continue;
    }
    console.log(`Processing image ${job.id} (attempt ${job.attempts})`);
    await processJob(job);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
