import "dotenv/config";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prisma } from "../app/lib/prisma";
import { createInquiry } from "../app/lib/inquiries/create";
import { checkRateLimit } from "../app/lib/auth/rate-limit";
import {
  listInquiries,
  countNewInquiries,
  updateInquiry,
} from "../app/lib/admin/inquiries";

const good = {
  type: "consultation",
  name: "Test Person",
  phone: "+963 944 123 456",
  message: "I want a villa design",
};

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
  const jpeg = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: "#996633" },
  })
    .jpeg()
    .toBuffer();

  const ok = await createInquiry(good, [jpeg]);
  assert.equal(ok.ok, true);

  assert.equal((await createInquiry({ ...good, phone: "abc" }, [])).ok, false);
  assert.equal(
    (await createInquiry({ ...good, type: "project_idea" }, [])).ok,
    false,
  ); // needs a title
  assert.equal(
    (await createInquiry({ ...good, email: "not-an-email" }, [])).ok,
    false,
  );
  assert.equal(
    (await createInquiry(good, [Buffer.from("<?php echo 1; ?>")])).ok,
    false,
  );
  assert.equal((await createInquiry(good, Array(6).fill(jpeg))).ok, false); // too many images

  // rate limit: the 6th call in the window must be refused
  const key = `test:${Date.now()}`;
  const results = [];
  for (let i = 0; i < 6; i++)
    results.push(await checkRateLimit(key, 5, 60_000));
  assert.deepEqual(results, [true, true, true, true, true, false]);

  const before = await countNewInquiries(actor);
  assert.ok(before >= 1);
  const { items } = await listInquiries(actor, { status: "new" });
  assert.equal(
    (
      await updateInquiry(actor, items[0].id, {
        status: "contacted",
        adminNote: "called",
      })
    ).ok,
    true,
  );
  assert.equal(await countNewInquiries(actor), before - 1);

  console.log("All inquiry checks passed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
