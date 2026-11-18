import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../prisma";

export function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "") // diacritics and tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim()
    .replace(/\s+/g, " ");
}

// Same normalization, done inside Postgres on the stored text.
const MARKS = "[\u064B-\u0652\u0640]";
const sqlNormalize = (expr: string) =>
  Prisma.sql`translate(regexp_replace(lower(${Prisma.raw(expr)}), ${MARKS}, '', 'g'), ${"أإآٱىة"}, ${"اااايه"})`;

// Table and column names come from this fixed list, never from user input.
const TARGETS = {
  project: {
    table: "ProjectTranslation",
    owner: "projectId",
    cols: ["title", "description", "city"],
  },
  product: {
    table: "ProductTranslation",
    owner: "productId",
    cols: ["name", "description"],
  },
  finish: {
    table: "FinishTranslation",
    owner: "finishId",
    cols: ["name", "description"],
  },
  service: {
    table: "ServiceTranslation",
    owner: "serviceId",
    cols: ["name", "description"],
  },
} as const;

// Ids of items whose text (in ANY language) contains the query.
export async function searchIds(
  target: keyof typeof TARGETS,
  q: string,
): Promise<number[]> {
  const needle = normalizeSearch(q.slice(0, 100));
  if (!needle) return [];
  const like = `%${needle.replace(/[!%_]/g, "!$&")}%`; // escape LIKE wildcards typed by the visitor

  const cfg = TARGETS[target];
  const haystack = `(${cfg.cols.map((c) => `coalesce("${c}", '')`).join(` || ' ' || `)})`;

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT DISTINCT ${Prisma.raw(`"${cfg.owner}"`)} AS id
    FROM ${Prisma.raw(`"${cfg.table}"`)}
    WHERE ${sqlNormalize(haystack)} LIKE ${like} ESCAPE '!'
    LIMIT 1000`;
  return rows.map((r) => r.id);
}
