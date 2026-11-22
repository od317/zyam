import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { one } from "@/app/lib/query";
import { intParam } from "@/app/lib/public/common";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { listAdminProjects } from "@/app/lib/admin/read";
import { Pagination } from "@/app/components/pagination";
import { RowActions } from "./row-actions";

const field =
  "rounded border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none";

export default async function AdminProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const sp = await searchParams;
  const user = await requirePageUser(lang);
  const t = adminDict[lang].p;

  const q = one(sp.q, 100);
  const s = one(sp.status);
  const status = s === "published" || s === "draft" ? s : undefined;
  const page = intParam(one(sp.page, 6));

  const list = await listAdminProjects(user, { lang, q, status, page });
  const pages = Math.max(1, Math.ceil(list.total / list.limit));

  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    if (p > 1) qs.set("page", String(p));
    const str = qs.toString();
    return `/${lang}/admin/projects${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{adminDict[lang].nav.projects}</h1>
        <Link
          href={`/${lang}/admin/projects/new`}
          className="rounded bg-amber-600 px-4 py-2 font-semibold text-stone-950 hover:bg-amber-500"
        >
          {t.newProject}
        </Link>
      </div>

      <form method="get" className="mt-6 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t.search}
          className={`${field} w-full sm:w-72`}
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className={field}
          aria-label="status"
        >
          <option value="">{t.all}</option>
          <option value="published">{t.published}</option>
          <option value="draft">{t.draft}</option>
        </select>
        <button className="rounded border border-stone-700 px-4 py-2 text-sm hover:border-amber-600">
          {t.apply}
        </button>
        <span className="self-center text-sm text-stone-400">
          {list.total} {t.results}
        </span>
      </form>

      {list.items.length === 0 ? (
        <p className="mt-12 text-center text-stone-400">{t.empty}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {list.items.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded border border-stone-800 bg-stone-900/60 p-3"
            >
              {p.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.thumbUrl}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-16 shrink-0 rounded bg-stone-800" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${lang}/admin/projects/${p.id}`}
                  className="block truncate font-medium hover:text-amber-500"
                >
                  {p.title || t.noTitle}
                </Link>
                <p className="truncate text-xs text-stone-400" dir="ltr">
                  {p.slug}
                  {p.year ? ` · ${p.year}` : ""}
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  p.isPublished
                    ? "bg-emerald-900/60 text-emerald-300"
                    : "bg-stone-800 text-stone-400"
                }`}
              >
                {p.isPublished ? t.published : t.draft}
              </span>
              <RowActions id={p.id} published={p.isPublished} lang={lang} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={list.page}
        pages={pages}
        hrefFor={hrefFor}
        prev={t.prev}
        next={t.next}
      />
    </>
  );
}
