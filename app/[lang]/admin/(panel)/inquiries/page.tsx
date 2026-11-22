import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { one } from "@/app/lib/query";
import { requirePageUser } from "@/app/lib/auth/require-user";
import { listInquiries, countNewInquiries } from "@/app/lib/admin/inquiries"; // keep your current import path
import { updateInquiryAction } from "./actions";

const STATUSES = ["new", "contacted", "closed"] as const;
type Status = (typeof STATUSES)[number];
const input = "w-full rounded border border-stone-700 bg-stone-950 p-2 text-sm";

export default async function InquiriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const user = await requirePageUser(lang);
  const sp = await searchParams;

  const raw = one(sp.status);
  const status = STATUSES.find((s) => s === raw) as Status | undefined;
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const t = adminDict[lang].iq;

  const [{ items, total, pageSize }, unread] = await Promise.all([
    listInquiries(user, { status, page }),
    countNewInquiries(user),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const href = (over: { status?: Status | null; page?: number }) => {
    const q = new URLSearchParams();
    const s = over.status === undefined ? status : over.status;
    if (s) q.set("status", s);
    if (over.page && over.page > 1) q.set("page", String(over.page));
    const qs = q.toString();
    return `/${lang}/admin/inquiries${qs ? `?${qs}` : ""}`;
  };

  const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-SY" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Damascus", // the server runs in UTC, so say which clock the client reads
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">
        {t.title} ({total}){" "}
        {unread > 0 && (
          <span className="text-base text-amber-500">
            · {unread} {t.newCount}
          </span>
        )}
      </h1>

      <nav className="flex flex-wrap gap-2" aria-label={t.title}>
        {([null, ...STATUSES] as (Status | null)[]).map((s) => {
          const active = (s ?? undefined) === status;
          return (
            <Link
              key={s ?? "all"}
              href={href({ status: s })}
              aria-current={active ? "page" : undefined}
              className={`rounded px-4 py-1.5 text-sm ${
                active
                  ? "bg-amber-600 font-semibold text-stone-950"
                  : "border border-stone-700 text-stone-300"
              }`}
            >
              {t.filters[s ?? "all"]}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-stone-500">{t.empty}</p>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((q) => {
            const digits = q.phone.replace(/\D/g, "");
            return (
              <form
                key={q.id}
                action={updateInquiryAction}
                className="space-y-3 rounded border border-stone-700 bg-stone-900/60 p-4"
              >
                <input type="hidden" name="id" value={q.id} />

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-400">
                  <span>
                    <span className="rounded bg-stone-800 px-2 py-0.5 text-stone-200">
                      {t.types[q.type]}
                    </span>{" "}
                    · {fmt.format(q.createdAt)}
                  </span>
                  {q.project && (
                    <Link
                      href={`/${lang}/projects/${q.project.slug}`}
                      className="underline hover:text-amber-500"
                    >
                      {t.project}: {q.project.slug}
                    </Link>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <p className="font-semibold">{q.name}</p>
                  <a
                    href={`tel:+${digits}`}
                    dir="ltr"
                    className="text-sm text-amber-500 hover:underline"
                  >
                    {q.phone}
                  </a>
                  {q.email && (
                    <a
                      href={`mailto:${q.email}`}
                      dir="ltr"
                      className="text-sm text-stone-400 hover:underline"
                    >
                      {q.email}
                    </a>
                  )}
                  <span className="ms-auto flex gap-2 text-xs">
                    <a
                      href={`tel:+${digits}`}
                      className="rounded border border-stone-700 px-2 py-1 hover:border-amber-600"
                    >
                      {t.call}
                    </a>
                    <a
                      href={`https://wa.me/${digits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-stone-700 px-2 py-1 hover:border-amber-600"
                    >
                      {t.whatsapp}
                    </a>
                  </span>
                </div>

                {q.title && <p className="text-sm font-medium">{q.title}</p>}
                <p className="whitespace-pre-wrap text-sm text-stone-300">
                  {q.message}
                </p>
                {q.images.length > 0 && (
                  <p className="text-xs text-stone-500">
                    {q.images.length} {t.images}
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
                  <select
                    name="status"
                    defaultValue={q.status}
                    className={input}
                    aria-label={t.status[q.status]}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t.status[s]}
                      </option>
                    ))}
                  </select>
                  <textarea
                    name="adminNote"
                    rows={2}
                    defaultValue={q.adminNote ?? ""}
                    placeholder={t.notePlaceholder}
                    aria-label={t.note}
                    className={input}
                  />
                  <button className="rounded bg-amber-600 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-500">
                    {t.save}
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={href({ page: page - 1 })}
              className="rounded border border-stone-700 px-4 py-1.5 hover:border-amber-600"
            >
              {t.prev}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-stone-500">
            {t.pageOf
              .replace("{p}", String(page))
              .replace("{n}", String(pages))}
          </span>
          {page < pages ? (
            <Link
              href={href({ page: page + 1 })}
              className="rounded border border-stone-700 px-4 py-1.5 hover:border-amber-600"
            >
              {t.next}
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
