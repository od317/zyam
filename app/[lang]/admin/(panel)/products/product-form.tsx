"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import type { AdminProduct } from "@/app/lib/admin/read";
import {
  FieldError,
  LangTabs,
  SaveBar,
  input,
  label,
  mapTranslationErrors,
  slugify,
} from "@/app/components/admin/fields";
import {
  Checklist,
  PriceFields,
  type PriceMode,
} from "@/app/components/admin/form-parts";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
} from "../catalog/actions";

type Option = { id: number; name: string };
type Category = { id: number; name: string; series: Option[] };
type SpecDef = {
  id: number;
  name: string;
  unit: string | null;
  valueType: "number" | "text";
};
type Options = { categories: Category[]; specs: SpecDef[]; finishes: Option[] };
type SpecRow = { definitionId: string; value: string };

const LANGS = ["ar", "en"] as const;
const blank = { name: "", description: "" };

export function ProductForm({
  lang,
  options,
  initial,
  canDelete = false,
}: {
  lang: Language;
  options: Options;
  initial?: AdminProduct;
  canDelete?: boolean;
}) {
  const t = adminDict[lang].f;
  const p = adminDict[lang].pr;
  const router = useRouter();
  const [pending, start] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [code, setCode] = useState(initial?.code ?? "");
  const [categoryId, setCategoryId] = useState(
    initial ? String(initial.categoryId) : "",
  );
  const [seriesId, setSeriesId] = useState(
    initial?.seriesId ? String(initial.seriesId) : "",
  );
  const [priceMode, setPriceMode] = useState<PriceMode>(
    initial?.priceMode ?? "on_request",
  );
  const [priceMin, setPriceMin] = useState(initial?.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(initial?.priceMax?.toString() ?? "");
  const [published, setPublished] = useState(initial?.isPublished ?? false);
  const [tr, setTr] = useState<Record<Language, typeof blank>>(
    initial?.translations ?? { ar: blank, en: blank },
  );
  const [specs, setSpecs] = useState<SpecRow[]>(
    initial?.specs.map((s) => ({
      definitionId: String(s.definitionId),
      value: s.value,
    })) ?? [],
  );
  const [finishIds, setFinishIds] = useState<number[]>(
    initial?.finishIds ?? [],
  );
  const [tab, setTab] = useState<Language>(lang);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const defs = new Map(options.specs.map((d) => [d.id, d]));
  const series =
    options.categories.find((c) => String(c.id) === categoryId)?.series ?? [];

  const setText = (l: Language, k: keyof typeof blank, v: string) => {
    setTr((prev) => ({ ...prev, [l]: { ...prev[l], [k]: v } }));
    if (l === "en" && k === "name" && !slugTouched) setSlug(slugify(v));
  };
  const changeCategory = (id: string) => {
    setCategoryId(id);
    const stillValid = options.categories
      .find((c) => String(c.id) === id)
      ?.series.some((s) => String(s.id) === seriesId);
    if (!stillValid) setSeriesId("");
  };
  const setSpec = (i: number, patch: Partial<SpecRow>) =>
    setSpecs((rows) => rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sent = LANGS.filter(
      (l) => tr[l].name.trim() || tr[l].description.trim(),
    );
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

    // Rows with no spec chosen are not sent. `rows` remembers where each sent row was on screen.
    const rows = specs
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.definitionId);
    const data = {
      slug: slug.trim(),
      code: code.trim(),
      categoryId: num(categoryId),
      seriesId: num(seriesId),
      isPublished: published,
      priceMode,
      priceMin:
        priceMode === "exact" || priceMode === "range"
          ? num(priceMin)
          : undefined,
      priceMax: priceMode === "range" ? num(priceMax) : undefined,
      translations: sent.map((l) => ({
        language: l,
        name: tr[l].name.trim(),
        description: tr[l].description.trim(),
      })),
      specs: rows.map(({ s }) => {
        const def = defs.get(Number(s.definitionId));
        return def?.valueType === "number"
          ? { definitionId: Number(s.definitionId), numberValue: num(s.value) }
          : {
              definitionId: Number(s.definitionId),
              textValue: s.value.trim() || undefined,
            };
      }),
      finishIds,
    };

    start(async () => {
      const res = initial
        ? await updateProductAction(initial.id, data)
        : await createProductAction(data);
      if (res.ok) {
        setErrors({});
        if (initial) {
          setSaved(true);
          router.refresh();
        } else router.push(`/${lang}/admin/products/${res.id}`);
        return;
      }
      // "translations.1.name" -> "en.name", "specs.2.x" -> "spec.<row on screen>.x"
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(
        mapTranslationErrors(res.errors, sent),
      )) {
        const m = k.match(/^specs\.(\d+)(?:\.(.+))?$/);
        out[
          m
            ? `spec.${rows[Number(m[1])]?.i ?? m[1]}${m[2] ? `.${m[2]}` : ""}`
            : k
        ] = v;
      }
      setErrors(out);
      setSaved(false);
    });
  }

  function remove() {
    if (!initial || !window.confirm(p.confirmDelete)) return;
    start(async () => {
      const res = await deleteProductAction(initial.id);
      if (res.ok) router.push(`/${lang}/admin/products`);
      else setErrors(res.errors);
    });
  }

  const known = new Set([
    "slug",
    "code",
    "categoryId",
    "seriesId",
    "priceMode",
    "priceMin",
    "priceMax",
    "specs",
    "finishIds",
  ]);
  const loose = Object.entries(errors).filter(
    ([k]) => !known.has(k) && !/^(ar|en|spec)\./.test(k),
  );
  const rowError = (i: number) =>
    errors[`spec.${i}`] ??
    errors[`spec.${i}.numberValue`] ??
    errors[`spec.${i}.textValue`] ??
    errors[`spec.${i}.definitionId`];

  return (
    <form onSubmit={submit} className="space-y-8 pb-24">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-amber-500">{t.details}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="code">
              {p.code}
            </label>
            <input
              id="code"
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${input} uppercase`}
            />
            <p className="mt-1 text-xs text-stone-500">{p.codeHint}</p>
            <FieldError message={errors.code} />
          </div>
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
            <FieldError message={errors.slug} />
          </div>
          <div>
            <label className={label} htmlFor="category">
              {p.category}
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => changeCategory(e.target.value)}
              className={input}
            >
              <option value="">{t.choose}</option>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.categoryId} />
          </div>
          <div>
            <label className={label} htmlFor="series">
              {p.series}
            </label>
            <select
              id="series"
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value)}
              disabled={series.length === 0}
              className={`${input} disabled:opacity-50`}
            >
              <option value="">{p.seriesNone}</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.seriesId} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-amber-500">{t.texts}</h2>
        <LangTabs value={tab} onChange={setTab} />
        {LANGS.map((l) => (
          <div
            key={l}
            hidden={tab !== l}
            dir={l === "ar" ? "rtl" : "ltr"}
            className="space-y-4"
          >
            <div>
              <label className={label}>{p.name}</label>
              <input
                value={tr[l].name}
                onChange={(e) => setText(l, "name", e.target.value)}
                className={input}
              />
              <FieldError message={errors[`${l}.name`]} />
            </div>
            <div>
              <label className={label}>{p.description}</label>
              <textarea
                rows={6}
                value={tr[l].description}
                onChange={(e) => setText(l, "description", e.target.value)}
                className={input}
              />
              <FieldError message={errors[`${l}.description`]} />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-amber-500">{t.price}</h2>
        <PriceFields
          t={t}
          mode={priceMode}
          min={priceMin}
          max={priceMax}
          onMode={setPriceMode}
          onMin={setPriceMin}
          onMax={setPriceMax}
          errors={errors}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-amber-500">{p.specs}</h2>
        {specs.map((row, i) => {
          const def = defs.get(Number(row.definitionId));
          const taken = new Set(
            specs.filter((_, k) => k !== i).map((r) => r.definitionId),
          );
          return (
            <div key={i}>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={row.definitionId}
                  onChange={(e) =>
                    setSpec(i, { definitionId: e.target.value, value: "" })
                  }
                  aria-label={p.specs}
                  className={`${input} sm:w-64`}
                >
                  <option value="">{p.specChoose}</option>
                  {options.specs
                    .filter((d) => !taken.has(String(d.id)))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
                <input
                  type={def?.valueType === "number" ? "number" : "text"}
                  step="any"
                  dir={def?.valueType === "number" ? "ltr" : undefined}
                  value={row.value}
                  onChange={(e) => setSpec(i, { value: e.target.value })}
                  aria-label={p.specValue}
                  disabled={!def}
                  className={`${input} sm:w-48 disabled:opacity-50`}
                />
                {def?.unit && (
                  <span className="text-sm text-stone-400" dir="ltr">
                    {def.unit}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSpecs((r) => r.filter((_, k) => k !== i))}
                  className="ms-auto text-sm text-red-400 hover:text-red-300"
                >
                  {p.removeSpec}
                </button>
              </div>
              <FieldError message={rowError(i)} />
            </div>
          );
        })}
        <FieldError message={errors.specs} />
        <button
          type="button"
          onClick={() =>
            setSpecs((r) => [...r, { definitionId: "", value: "" }])
          }
          disabled={specs.length >= options.specs.length}
          className="rounded border border-stone-700 px-3 py-1.5 text-sm hover:border-amber-600 disabled:opacity-40"
        >
          + {p.addSpec}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-amber-500">{t.links}</h2>
        <Checklist
          title={t.finishes}
          options={options.finishes}
          value={finishIds}
          onChange={setFinishIds}
          placeholder={t.filter}
        />
        <FieldError message={errors.finishIds} />
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

      <SaveBar
        t={t}
        published={published}
        onPublished={setPublished}
        saved={saved}
        pending={pending}
        isNew={!initial}
        canDelete={canDelete}
        deleteLabel={p.delete}
        onDelete={remove}
      />
    </form>
  );
}
