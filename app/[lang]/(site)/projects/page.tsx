import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { dict } from "@/app/lib/dictionary";
import { catalogLabels } from "@/app/lib/labels";
import { one } from "@/app/lib/query";
import { intParam } from "@/app/lib/public/common";
import {
  listProjectFilters,
  listPublicProjects,
} from "@/app/lib/public/projects";
import { ProjectCard } from "@/app/components/project-card";
import { ProjectsFade } from "@/app/components/projects-fade";
import { Pagination } from "@/app/components/pagination";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ lang: string }>;

const field =
  "w-full rounded border border-line bg-ink px-3 py-2 text-sm text-ivory focus:border-gold focus:outline-none";
const SORTS = ["newest", "oldest", "year"] as const;

export default function ProjectsPage({
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
      <ProjectsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ProjectsContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const sp = await searchParams;

  const service = one(sp.service);
  const city = one(sp.city);
  const year = intParam(one(sp.year, 4));
  const q = one(sp.q, 100);
  const sortParam = one(sp.sort);
  const sort = SORTS.find((s) => s === sortParam) ?? "newest";
  const page = intParam(one(sp.page, 6));

  const [list, filters] = await Promise.all([
    listPublicProjects({ lang, service, city, year, q, sort, page }),
    listProjectFilters(lang),
  ]);

  const l = catalogLabels[lang];
  const pages = Math.max(1, Math.ceil(list.total / list.limit));

  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (service) qs.set("service", service);
    if (city) qs.set("city", city);
    if (year) qs.set("year", String(year));
    if (q) qs.set("q", q);
    if (sort !== "newest") qs.set("sort", sort);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return `/${lang}/projects${s ? `?${s}` : ""}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-gold sm:text-5xl">
        {dict[lang].nav.projects}
      </h1>
      <p className="mt-2 text-muted">{l.projectsLead}</p>

      <form
        action={`/${lang}/projects`}
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
          name="service"
          defaultValue={service ?? ""}
          aria-label={l.service}
          className={field}
        >
          <option value="">
            {l.service}: {l.all}
          </option>
          {filters.services.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="city"
          defaultValue={city ?? ""}
          aria-label={l.city}
          className={field}
        >
          <option value="">
            {l.city}: {l.all}
          </option>
          {filters.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="year"
          defaultValue={year ? String(year) : ""}
          aria-label={l.year}
          className={field}
        >
          <option value="">
            {l.year}: {l.all}
          </option>
          {filters.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          aria-label={l.sort}
          className={field}
        >
          <option value="newest">
            {l.sort}: {l.sortNewest}
          </option>
          <option value="oldest">
            {l.sort}: {l.sortOldest}
          </option>
          <option value="year">
            {l.sort}: {l.sortYear}
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
            href={`/${lang}/projects`}
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
        <ProjectsFade>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.items.map((p) => (
              <ProjectCard key={p.slug} p={p} lang={lang} />
            ))}
          </div>
        </ProjectsFade>
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
