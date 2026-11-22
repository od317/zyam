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

// The worker is a separate process, so it can't clear the web app's cache itself.
// It collects which kinds of images changed and tells the app once, when the queue is empty.
const TAGS = {
  project: "projects",
  product: "products",
  finish: "finishes",
} as const;
type Kind = keyof typeof TAGS;
const changed = new Set<Kind>();
let warnedNoSecret = false;

async function notifyApp() {
  if (changed.size === 0) return;
  const tags = [...changed].map((k) => TAGS[k]);
  changed.clear();

  const url = process.env.APP_URL;
  const secret = process.env.INTERNAL_SECRET;
  if (!url || !secret) {
    if (!warnedNoSecret) {
      warnedNoSecret = true;
      console.warn(
        "APP_URL or INTERNAL_SECRET is not set: cached pages will refresh only when they expire",
      );
    }
    return;
  }
  try {
    const res = await fetch(`${url}/api/internal/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn("App refused the cache notice:", res.status);
  } catch (e) {
    // Never fail image work because of a notice: the page fixes itself when its cache expires.
    console.warn("Could not notify the app", e);
  }
}

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
      await notifyApp(); // the queue is empty: tell the app what changed
      await sleep(2000);
      continue;
    }
    console.log(
      `Processing ${job.kind} image ${job.id} (attempt ${job.attempts})`,
    );
    await processJob(job);
    changed.add(job.kind); // ready, failed or retried: the public page may differ now
  }
  await notifyApp(); // on shutdown, don't lose a pending notice
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
