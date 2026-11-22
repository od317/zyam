import Link from "next/link";
import type { Language } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { Pagination } from "@/app/components/pagination";
import { RowActions } from "./row-actions";

export type AdminRow = {
  id: number;
  title: string;
  subtitle: string;
  thumbUrl: string | null;
  color?: string | null; // shown when there is no image
  isPublished: boolean;
};

export function AdminList({
  lang,
  title,
  newHref,
  newLabel,
  basePath,
  q,
  status,
  list,
  rowHref,
  setPublished,
}: {
  lang: Language;
  title: string;
  newHref: string;
  newLabel: string;
  basePath: string;
  q?: string;
  status?: "published" | "draft";
  list: { items: AdminRow[]; total: number; page: number; limit: number };
  rowHref: (id: number) => string;
  setPublished: (id: number, published: boolean) => Promise<unknown>;
}) {
  const t = adminDict[lang].p;
  const pages = Math.max(1, Math.ceil(list.total / list.limit));
  const field =
    "rounded border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none";

  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return `${basePath}${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Link
          href={newHref}
          className="rounded bg-amber-600 px-4 py-2 font-semibold text-stone-950 hover:bg-amber-500"
        >
          {newLabel}
        </Link>
      </div>

      <form
        method="get"
        action={basePath}
        className="mt-6 flex flex-wrap gap-3"
      >
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
          {list.items.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-4 rounded border border-stone-800 bg-stone-900/60 p-3"
            >
              {r.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.thumbUrl}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded object-cover"
                />
              ) : (
                <div
                  className="h-12 w-16 shrink-0 rounded bg-stone-800"
                  style={r.color ? { backgroundColor: r.color } : undefined}
                />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={rowHref(r.id)}
                  className="block truncate font-medium hover:text-amber-500"
                >
                  {r.title || t.noTitle}
                </Link>
                <p className="truncate text-xs text-stone-400" dir="ltr">
                  {r.subtitle}
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  r.isPublished
                    ? "bg-emerald-900/60 text-emerald-300"
                    : "bg-stone-800 text-stone-400"
                }`}
              >
                {r.isPublished ? t.published : t.draft}
              </span>
              <RowActions
                id={r.id}
                published={r.isPublished}
                lang={lang}
                action={setPublished}
              />
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
