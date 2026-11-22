"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import type { TaxItem, TaxonomyData } from "@/app/lib/admin/read";
import {
  FieldError,
  LangTabs,
  input,
  label,
  mapTranslationErrors,
  slugify,
} from "@/app/components/admin/fields";
import { PriceFields, type PriceMode } from "@/app/components/admin/form-parts";
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createSeriesAction,
  updateSeriesAction,
  deleteSeriesAction,
  createSpecAction,
  updateSpecAction,
  deleteSpecAction,
} from "./actions";

type Kind = keyof TaxonomyData; // "services" | "categories" | "series" | "specs"
const KINDS: Kind[] = ["services", "categories", "series", "specs"];
const LANGS = ["ar", "en"] as const;

const actions = {
  services: {
    create: createServiceAction,
    update: updateServiceAction,
    remove: deleteServiceAction,
  },
  categories: {
    create: createCategoryAction,
    update: updateCategoryAction,
    remove: deleteCategoryAction,
  },
  series: {
    create: createSeriesAction,
    update: updateSeriesAction,
    remove: deleteSeriesAction,
  },
  specs: {
    create: createSpecAction,
    update: updateSpecAction,
    remove: deleteSpecAction,
  },
};

// "used:products:3" -> a sentence in the dashboard language. Anything else is shown as it is.
function explain(msg: string | undefined, used: Record<string, string>) {
  const m = msg?.match(/^used:(\w+):(\d+)$/);
  return m && used[m[1]] ? used[m[1]].replace("{n}", m[2]) : (msg ?? "");
}

export function TaxonomyEditor({
  lang,
  data,
  isAdmin,
}: {
  lang: Language;
  data: TaxonomyData;
  isAdmin: boolean;
}) {
  const t = adminDict[lang].tx;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<Kind>("services");
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [notice, setNotice] = useState("");

  const items = data[kind];
  const categoryName = new Map(data.categories.map((c) => [c.id, c.label]));
  const canAdd = kind !== "services" || isAdmin; // the server enforces this too

  function pick(k: Kind) {
    setKind(k);
    setEditing(null);
    setNotice("");
  }

  function remove(it: TaxItem) {
    if (!window.confirm(t.confirmDelete)) return;
    start(async () => {
      const res = await actions[kind].remove(it.id);
      if (res.ok) {
        setNotice("");
        router.refresh();
      } else
        setNotice(
          explain(res.errors._form ?? Object.values(res.errors)[0], t.used),
        );
    });
  }

  const sub = (it: TaxItem) => {
    if (kind === "specs") return `${it.key}${it.unit ? ` (${it.unit})` : ""}`;
    if (kind === "series")
      return `${categoryName.get(it.categoryId ?? 0) ?? ""} · ${it.slug}`;
    return it.slug;
  };
  const counts = (it: TaxItem) => {
    if (kind === "services") return `${it.usage} ${t.projects}`;
    if (kind === "categories")
      return `${it.usage} ${t.products} · ${it.extra} ${t.seriesCount}`;
    return `${it.usage} ${t.products}`;
  };

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => pick(k)}
            className={`rounded px-4 py-1.5 text-sm ${
              kind === k
                ? "bg-amber-600 font-semibold text-stone-950"
                : "border border-stone-700 text-stone-300"
            }`}
          >
            {t.tabs[k]} ({data[k].length})
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        {kind === "services" && !isAdmin ? (
          <p className="text-sm text-stone-500">{t.adminOnly}</p>
        ) : (
          <span />
        )}
        {canAdd && editing !== "new" && (
          <button
            onClick={() => setEditing("new")}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-500"
          >
            + {t.add}
          </button>
        )}
      </div>

      {notice && (
        <p
          role="alert"
          className="mt-4 rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-300"
        >
          {notice}
        </p>
      )}

      {editing === "new" && (
        <div className="mt-4">
          <EntityForm
            key={`${kind}-new`}
            kind={kind}
            lang={lang}
            initial={null}
            categories={data.categories}
            onClose={() => setEditing(null)}
          />
        </div>
      )}

      {items.length === 0 && editing !== "new" ? (
        <p className="mt-10 text-center text-stone-500">{t.empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((it) =>
            editing === it.id ? (
              <li key={it.id}>
                <EntityForm
                  kind={kind}
                  lang={lang}
                  initial={it}
                  categories={data.categories}
                  onClose={() => setEditing(null)}
                />
              </li>
            ) : (
              <li
                key={it.id}
                className="flex flex-wrap items-center gap-4 rounded border border-stone-800 bg-stone-900/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{it.label}</p>
                  <p className="truncate text-xs text-stone-400" dir="ltr">
                    {sub(it)}
                  </p>
                </div>
                <span className="text-xs text-stone-500">{counts(it)}</span>
                <button
                  onClick={() => {
                    setNotice("");
                    setEditing(it.id);
                  }}
                  className="rounded border border-stone-700 px-3 py-1 text-sm hover:border-amber-600"
                >
                  {t.edit}
                </button>
                {isAdmin && (
                  <button
                    disabled={pending}
                    onClick={() => remove(it)}
                    className="rounded border border-red-900 px-3 py-1 text-sm text-red-400 disabled:opacity-50"
                  >
                    {t.delete}
                  </button>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function EntityForm({
  kind,
  lang,
  initial,
  categories,
  onClose,
}: {
  kind: Kind;
  lang: Language;
  initial: TaxItem | null;
  categories: TaxItem[];
  onClose: () => void;
}) {
  const t = adminDict[lang].tx;
  const f = adminDict[lang].f;
  const router = useRouter();
  const [pending, start] = useTransition();

  const hasSlug = kind !== "specs";
  const hasSort = kind === "services" || kind === "categories";
  const hasDesc = kind === "services" || kind === "series";

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [key, setKey] = useState(initial?.key ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ? String(initial.categoryId) : "",
  );
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [valueType, setValueType] = useState<"number" | "text">(
    initial?.valueType ?? "number",
  );
  const [priceMode, setPriceMode] = useState<PriceMode>(
    initial?.priceMode ?? "on_request",
  );
  const [priceMin, setPriceMin] = useState(initial?.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(initial?.priceMax?.toString() ?? "");
  const [tr, setTr] = useState(
    initial?.translations ?? {
      ar: { name: "", description: "" },
      en: { name: "", description: "" },
    },
  );
  const [tab, setTab] = useState<Language>(lang);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setText = (l: Language, k: "name" | "description", v: string) => {
    setTr((p) => ({ ...p, [l]: { ...p[l], [k]: v } }));
    if (l === "en" && k === "name" && !slugTouched && hasSlug)
      setSlug(slugify(v));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const sent = LANGS.filter(
      (l) => tr[l].name.trim() || tr[l].description.trim(),
    );
    const translations = sent.map((l) => {
      const name = tr[l].name.trim();
      const description = tr[l].description.trim();
      if (kind === "services") return { language: l, name, description };
      if (kind === "series")
        return { language: l, name, description: description || undefined };
      return { language: l, name };
    });

    let data: Record<string, unknown>;
    if (kind === "services")
      data = {
        slug: slug.trim(),
        sortOrder: num(sortOrder) ?? 0,
        priceMode,
        priceMin:
          priceMode === "exact" || priceMode === "range"
            ? num(priceMin)
            : undefined,
        priceMax: priceMode === "range" ? num(priceMax) : undefined,
        translations,
      };
    else if (kind === "categories")
      data = {
        slug: slug.trim(),
        sortOrder: num(sortOrder) ?? 0,
        translations,
      };
    else if (kind === "series")
      data = { slug: slug.trim(), categoryId: num(categoryId), translations };
    else
      data = {
        key: key.trim(),
        unit: unit.trim() || undefined,
        valueType,
        translations,
      };

    start(async () => {
      const a = actions[kind];
      const res = initial
        ? await a.update(initial.id, data)
        : await a.create(data);
      if (res.ok) {
        onClose();
        router.refresh();
        return;
      }
      setErrors(mapTranslationErrors(res.errors, sent));
    });
  }

  const known = new Set([
    "slug",
    "key",
    "unit",
    "valueType",
    "sortOrder",
    "categoryId",
    "priceMode",
    "priceMin",
    "priceMax",
  ]);
  const loose = Object.entries(errors).filter(
    ([k]) => !known.has(k) && !/^(ar|en)\./.test(k),
  );

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded border border-amber-700/50 bg-stone-900 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {hasSlug && (
          <div>
            <label className={label}>{f.slug}</label>
            <input
              dir="ltr"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              className={input}
            />
            <FieldError message={errors.slug} />
          </div>
        )}
        {kind === "specs" && (
          <>
            <div>
              <label className={label}>{t.key}</label>
              <input
                dir="ltr"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className={input}
              />
              <p className="mt-1 text-xs text-stone-500">{t.keyHint}</p>
              <FieldError message={errors.key} />
            </div>
            <div>
              <label className={label}>{t.unit}</label>
              <input
                dir="ltr"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={input}
              />
              <p className="mt-1 text-xs text-stone-500">{t.unitHint}</p>
              <FieldError message={errors.unit} />
            </div>
            <div>
              <label className={label}>{t.valueType}</label>
              <select
                value={valueType}
                onChange={(e) =>
                  setValueType(e.target.value as "number" | "text")
                }
                className={input}
              >
                <option value="number">{t.valueTypes.number}</option>
                <option value="text">{t.valueTypes.text}</option>
              </select>
              <FieldError message={errors.valueType} />
            </div>
          </>
        )}
        {kind === "series" && (
          <div>
            <label className={label}>{t.category}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={input}
            >
              <option value="">{f.choose}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.categoryId} />
          </div>
        )}
        {hasSort && (
          <div>
            <label className={label}>{t.sortOrder}</label>
            <input
              type="number"
              dir="ltr"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={input}
            />
            <FieldError message={errors.sortOrder} />
          </div>
        )}
      </div>

      {kind === "services" && (
        <PriceFields
          t={f}
          mode={priceMode}
          min={priceMin}
          max={priceMax}
          onMode={setPriceMode}
          onMin={setPriceMin}
          onMax={setPriceMax}
          errors={errors}
        />
      )}

      <LangTabs value={tab} onChange={setTab} />
      {LANGS.map((l) => (
        <div
          key={l}
          hidden={tab !== l}
          dir={l === "ar" ? "rtl" : "ltr"}
          className="space-y-4"
        >
          <div>
            <label className={label}>{t.name}</label>
            <input
              value={tr[l].name}
              onChange={(e) => setText(l, "name", e.target.value)}
              className={input}
            />
            <FieldError message={errors[`${l}.name`]} />
          </div>
          {hasDesc && (
            <div>
              <label className={label}>{t.description}</label>
              <textarea
                rows={4}
                value={tr[l].description}
                onChange={(e) => setText(l, "description", e.target.value)}
                className={input}
              />
              <FieldError message={errors[`${l}.description`]} />
            </div>
          )}
        </div>
      ))}

      {loose.length > 0 && (
        <div
          role="alert"
          className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-300"
        >
          <ul className="list-disc ps-5">
            {loose.map(([k, v]) => (
              <li key={k}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          disabled={pending}
          className="rounded bg-amber-600 px-5 py-2 font-semibold text-stone-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {pending ? f.saving : initial ? f.save : f.create}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-stone-700 px-5 py-2 text-sm text-stone-300"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
