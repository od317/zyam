"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import type { AdminProject } from "@/app/lib/admin/read";
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
} from "./actions";

type Option = { id: number; name: string };
type PriceMode = "exact" | "range" | "hidden" | "on_request";
const LANGS = ["ar", "en"] as const;
const blank = { title: "", description: "", city: "" };

const input =
  "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:border-amber-500 focus:outline-none";
const label = "mb-1 block text-sm text-stone-300";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function ProjectForm({
  lang,
  options,
  initial,
  canDelete = false,
}: {
  lang: Language;
  options: { services: Option[]; products: Option[]; finishes: Option[] };
  initial?: AdminProject;
  canDelete?: boolean;
}) {
  const t = adminDict[lang].f;
  const router = useRouter();
  const [pending, start] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [serviceId, setServiceId] = useState(
    initial?.serviceId ? String(initial.serviceId) : "",
  );
  const [year, setYear] = useState(initial?.year?.toString() ?? "");
  const [months, setMonths] = useState(
    initial?.durationMonths?.toString() ?? "",
  );
  const [published, setPublished] = useState(initial?.isPublished ?? false);
  const [priceMode, setPriceMode] = useState<PriceMode>(
    initial?.priceMode ?? "on_request",
  );
  const [priceMin, setPriceMin] = useState(initial?.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(initial?.priceMax?.toString() ?? "");
  const [tr, setTr] = useState<Record<Language, typeof blank>>(
    initial?.translations ?? { ar: blank, en: blank },
  );
  const [productIds, setProductIds] = useState<number[]>(
    initial?.productIds ?? [],
  );
  const [finishIds, setFinishIds] = useState<number[]>(
    initial?.finishIds ?? [],
  );
  const [tab, setTab] = useState<Language>(lang);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const setText = (l: Language, k: keyof typeof blank, v: string) => {
    setTr((p) => ({ ...p, [l]: { ...p[l], [k]: v } }));
    // While the slug is untouched, suggest one from the English title.
    if (l === "en" && k === "title" && !slugTouched) setSlug(slugify(v));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // A language with nothing typed is not sent at all.
    const sent = LANGS.filter(
      (l) =>
        tr[l].title.trim() || tr[l].description.trim() || tr[l].city.trim(),
    );
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const data = {
      slug: slug.trim(),
      serviceId: num(serviceId),
      year: num(year),
      durationMonths: num(months),
      isPublished: published,
      priceMode,
      priceMin:
        priceMode === "exact" || priceMode === "range"
          ? num(priceMin)
          : undefined,
      priceMax: priceMode === "range" ? num(priceMax) : undefined,
      translations: sent.map((l) => ({
        language: l,
        title: tr[l].title.trim(),
        description: tr[l].description.trim(),
        city: tr[l].city.trim() || undefined,
      })),
      productIds,
      finishIds,
    };

    start(async () => {
      const res = initial
        ? await updateProjectAction(initial.id, data)
        : await createProjectAction(data);
      if (res.ok) {
        setErrors({});
        if (initial) {
          setSaved(true);
          router.refresh();
        } else router.push(`/${lang}/admin/projects/${res.id}`);
        return;
      }
      // "translations.1.title" -> "en.title"
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.errors)) {
        const m = k.match(/^translations\.(\d+)\.(.+)$/);
        mapped[m ? `${sent[Number(m[1])]}.${m[2]}` : k] = v;
      }
      setErrors(mapped);
      setSaved(false);
    });
  }

  function remove() {
    if (!initial || !window.confirm(t.confirmDelete)) return;
    start(async () => {
      const res = await deleteProjectAction(initial.id);
      if (res.ok) router.push(`/${lang}/admin/projects`);
      else setErrors(res.errors);
    });
  }

  const known = new Set([
    "slug",
    "serviceId",
    "year",
    "durationMonths",
    "priceMode",
    "priceMin",
    "priceMax",
  ]);
  const loose = Object.entries(errors).filter(
    ([k]) => !known.has(k) && !/^(ar|en)\./.test(k),
  );
  const Err = ({ k }: { k: string }) =>
    errors[k] ? (
      <p role="alert" className="mt-1 text-sm text-red-400">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} className="space-y-8 pb-24">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-amber-500">{t.details}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="slug">
              {t.slug}
            </label>
            <input
              id="slug"
              dir="ltr"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              className={input}
            />
            <p className="mt-1 text-xs text-stone-500">{t.slugHint}</p>
            <Err k="slug" />
          </div>
          <div>
            <label className={label} htmlFor="service">
              {t.service}
            </label>
            <select
              id="service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className={input}
            >
              <option value="">{t.choose}</option>
              {options.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Err k="serviceId" />
          </div>
          <div>
            <label className={label} htmlFor="year">
              {t.year}
            </label>
            <input
              id="year"
              type="number"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={input}
            />
            <Err k="year" />
          </div>
          <div>
            <label className={label} htmlFor="months">
              {t.duration}
            </label>
            <input
              id="months"
              type="number"
              inputMode="numeric"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className={input}
            />
            <Err k="durationMonths" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-amber-500">{t.texts}</h2>
        <div role="tablist" className="flex gap-2">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={tab === l}
              onClick={() => setTab(l)}
              className={`rounded px-4 py-1.5 text-sm ${
                tab === l
                  ? "bg-amber-600 font-semibold text-stone-950"
                  : "border border-stone-700 text-stone-300"
              }`}
            >
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
        {LANGS.map((l) => (
          <div
            key={l}
            hidden={tab !== l}
            dir={l === "ar" ? "rtl" : "ltr"}
            className="space-y-4"
          >
            <div>
              <label className={label}>{t.title}</label>
              <input
                value={tr[l].title}
                onChange={(e) => setText(l, "title", e.target.value)}
                className={input}
              />
              <Err k={`${l}.title`} />
            </div>
            <div>
              <label className={label}>{t.city}</label>
              <input
                value={tr[l].city}
                onChange={(e) => setText(l, "city", e.target.value)}
                className={input}
              />
              <Err k={`${l}.city`} />
            </div>
            <div>
              <label className={label}>{t.description}</label>
              <textarea
                rows={7}
                value={tr[l].description}
                onChange={(e) => setText(l, "description", e.target.value)}
                className={input}
              />
              <Err k={`${l}.description`} />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-amber-500">{t.price}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="pm">
              {t.priceMode}
            </label>
            <select
              id="pm"
              value={priceMode}
              onChange={(e) => setPriceMode(e.target.value as PriceMode)}
              className={input}
            >
              {(Object.keys(t.priceModes) as PriceMode[]).map((m) => (
                <option key={m} value={m}>
                  {t.priceModes[m]}
                </option>
              ))}
            </select>
            <Err k="priceMode" />
          </div>
          {(priceMode === "exact" || priceMode === "range") && (
            <div>
              <label className={label}>
                {priceMode === "range" ? t.priceRangeMin : t.priceMin}
              </label>
              <input
                type="number"
                inputMode="decimal"
                dir="ltr"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className={input}
              />
              <Err k="priceMin" />
            </div>
          )}
          {priceMode === "range" && (
            <div>
              <label className={label}>{t.priceMax}</label>
              <input
                type="number"
                inputMode="decimal"
                dir="ltr"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className={input}
              />
              <Err k="priceMax" />
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-amber-500">{t.links}</h2>
        <Checklist
          title={t.products}
          options={options.products}
          value={productIds}
          onChange={setProductIds}
          placeholder={t.filter}
        />
        <Err k="productIds" />
        <Checklist
          title={t.finishes}
          options={options.finishes}
          value={finishIds}
          onChange={setFinishIds}
          placeholder={t.filter}
        />
        <Err k="finishIds" />
      </section>

      {loose.length > 0 && (
        <div
          role="alert"
          className="rounded border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
        >
          <p className="font-semibold">{t.errors}</p>
          <ul className="mt-2 list-disc ps-5">
            {loose.map(([k, v]) => (
              <li key={k}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* The save bar stays visible while the long form scrolls. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-stone-800 bg-stone-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            {t.published}
          </label>
          {saved && !pending && (
            <span className="text-sm text-emerald-400">{t.saved}</span>
          )}
          <div className="ms-auto flex items-center gap-3">
            {canDelete && initial && (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="text-sm text-red-400 hover:text-red-300"
              >
                {t.delete}
              </button>
            )}
            <button
              disabled={pending}
              className="rounded bg-amber-600 px-6 py-2 font-semibold text-stone-950 hover:bg-amber-500 disabled:opacity-50"
            >
              {pending ? t.saving : initial ? t.save : t.create}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Checklist({
  title,
  options,
  value,
  onChange,
  placeholder,
}: {
  title: string;
  options: Option[];
  value: number[];
  onChange: (v: number[]) => void;
  placeholder: string;
}) {
  const [filter, setFilter] = useState("");
  const shown = options.filter((o) =>
    o.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-stone-300">
        {title} ({value.length})
      </legend>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={placeholder}
        className={`${input} mb-2`}
      />
      <div className="max-h-56 overflow-y-auto rounded border border-stone-800 p-2">
        {shown.map((o) => (
          <label key={o.id} className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={value.includes(o.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, o.id]
                    : value.filter((x) => x !== o.id),
                )
              }
            />
            {o.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
