import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { intParam } from "@/app/lib/public/common";
import { listPublicFinishes } from "@/app/lib/public/catalog";
import { catalogLabels } from "@/app/lib/labels";
import { FinishCard } from "@/app/components/finish-card";
import { Pagination } from "@/app/components/pagination";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ lang: string }>;

const one = (v: string | string[] | undefined, max = 80) =>
  (Array.isArray(v) ? v[0] : v)?.trim().slice(0, max) || undefined;

export default function FinishesPage({
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
      <FinishesContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function FinishesContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const sp = await searchParams;
  const q = one(sp.q, 100);
  const page = intParam(one(sp.page, 6));

  const list = await listPublicFinishes({ lang, q, page });
  const l = catalogLabels[lang];
  const pages = Math.max(1, Math.ceil(list.total / list.limit));

  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return `/${lang}/finishes${s ? `?${s}` : ""}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-gold sm:text-5xl">
        {l.finishesTitle}
      </h1>
      <p className="mt-2 text-muted">{l.finishesLead}</p>

      <form
        action={`/${lang}/finishes`}
        method="get"
        className="mt-8 flex gap-3"
      >
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={l.searchPlaceholder}
          aria-label={l.searchPlaceholder}
          className="w-full max-w-md rounded border border-line bg-ink px-3 py-2 text-sm text-ivory focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-gold px-5 py-2 text-sm font-medium text-ink hover:bg-gold-light"
        >
          {l.apply}
        </button>
        {q && (
          <Link
            href={`/${lang}/finishes`}
            className="self-center text-sm text-muted hover:text-ivory"
          >
            {l.reset}
          </Link>
        )}
      </form>

      {list.items.length === 0 ? (
        <p className="mt-16 text-center text-muted">{l.empty}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 lg:grid-cols-5">
          {list.items.map((f) => (
            <FinishCard key={f.slug} f={f} lang={lang} />
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
