import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { intParam } from "@/app/lib/public/common";
import {
  listProductCategories,
  listPublicFinishes,
  listPublicProducts,
} from "@/app/lib/public/catalog";
import { catalogLabels } from "@/app/lib/labels";
import { ProductCard } from "@/app/components/product-card";
import { Pagination } from "@/app/components/pagination";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ lang: string }>;

// One value from the query string, trimmed and length-capped (never trust the URL).
const one = (v: string | string[] | undefined, max = 80) =>
  (Array.isArray(v) ? v[0] : v)?.trim().slice(0, max) || undefined;

const field =
  "w-full rounded border border-line bg-ink px-3 py-2 text-sm text-ivory focus:border-gold focus:outline-none";

// The outer component reads nothing. Reading searchParams happens inside Suspense.
export default function ProductsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={<main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-12" />}
    >
      <ProductsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const sp = await searchParams;

  const category = one(sp.category);
  const series = one(sp.series);
  const finish = one(sp.finish);
  const q = one(sp.q, 100);
  const sort = one(sp.sort) === "newest" ? "newest" : "code";
  const page = intParam(one(sp.page, 6));

  const [list, categories, finishes] = await Promise.all([
    listPublicProducts({ lang, category, series, finish, q, sort, page }),
    listProductCategories(lang),
    listPublicFinishes({ lang, limit: 50 }),
  ]);

  const l = catalogLabels[lang];
  const pages = Math.max(1, Math.ceil(list.total / list.limit));

  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (series) qs.set("series", series);
    if (finish) qs.set("finish", finish);
    if (q) qs.set("q", q);
    if (sort !== "code") qs.set("sort", sort);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return `/${lang}/products${s ? `?${s}` : ""}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-gold sm:text-5xl">
        {l.productsTitle}
      </h1>
      <p className="mt-2 text-muted">{l.productsLead}</p>

      {/* A plain GET form: submitting it just loads this page with a new query string. */}
      <form
        action={`/${lang}/products`}
        method="get"
        className="mt-8 grid gap-3 rounded border border-line bg-ink-2/75 p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={l.searchPlaceholder}
          aria-label={l.searchPlaceholder}
          className={`${field} lg:col-span-2`}
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          aria-label={l.category}
          className={field}
        >
          <option value="">
            {l.category}: {l.all}
          </option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} ({c.productCount})
            </option>
          ))}
        </select>
        <select
          name="series"
          defaultValue={series ?? ""}
          aria-label={l.series}
          className={field}
        >
          <option value="">
            {l.series}: {l.all}
          </option>
          {categories
            .filter((c) => c.series.length > 0)
            .map((c) => (
              <optgroup key={c.slug} label={c.name}>
                {c.series.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
        <select
          name="finish"
          defaultValue={finish ?? ""}
          aria-label={l.finish}
          className={field}
        >
          <option value="">
            {l.finish}: {l.all}
          </option>
          {finishes.items.map((f) => (
            <option key={f.slug} value={f.slug}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          aria-label={l.sort}
          className={field}
        >
          <option value="code">
            {l.sort}: {l.sortCode}
          </option>
          <option value="newest">
            {l.sort}: {l.sortNewest}
          </option>
        </select>
        <div className="flex gap-3 sm:col-span-2 lg:col-span-6">
          <button
            type="submit"
            className="rounded bg-gold px-5 py-2 text-sm font-medium text-ink hover:bg-gold-light"
          >
            {l.apply}
          </button>
          <Link
            href={`/${lang}/products`}
            className="rounded border border-line px-5 py-2 text-sm text-muted hover:text-ivory"
          >
            {l.reset}
          </Link>
          <span className="ms-auto self-center text-sm text-muted">
            {list.total} {l.results}
          </span>
        </div>
      </form>

      {list.items.length === 0 ? (
        <p className="mt-16 text-center text-muted">{l.empty}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {list.items.map((p) => (
            <ProductCard key={p.slug} p={p} lang={lang} />
          ))}
        </div>
      )}

      <Pagination
        page={list.page}
        pages={pages}
        hrefFor={hrefFor}
        prev={l.prev}
        next={l.next}
      />
    </main>
  );
}
