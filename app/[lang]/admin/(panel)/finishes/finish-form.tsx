"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import type { AdminFinish } from "@/app/lib/admin/read";
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
  createFinishAction,
  updateFinishAction,
  deleteFinishAction,
} from "../catalog/actions";

const LANGS = ["ar", "en"] as const;
const blank = { name: "", description: "" };
const HEX = /^#[0-9a-fA-F]{6}$/;

export function FinishForm({
  lang,
  initial,
  canDelete = false,
}: {
  lang: Language;
  initial?: AdminFinish;
  canDelete?: boolean;
}) {
  const t = adminDict[lang].f;
  const fi = adminDict[lang].fi;
  const router = useRouter();
  const [pending, start] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [color, setColor] = useState(initial?.colorHex ?? "");
  const [published, setPublished] = useState(initial?.isPublished ?? false);
  const [tr, setTr] = useState<Record<Language, typeof blank>>(
    initial?.translations ?? { ar: blank, en: blank },
  );
  const [tab, setTab] = useState<Language>(lang);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const setText = (l: Language, k: keyof typeof blank, v: string) => {
    setTr((p) => ({ ...p, [l]: { ...p[l], [k]: v } }));
    if (l === "en" && k === "name" && !slugTouched) setSlug(slugify(v));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sent = LANGS.filter(
      (l) => tr[l].name.trim() || tr[l].description.trim(),
    );
    const data = {
      slug: slug.trim(),
      colorHex: color.trim() || undefined, // an empty string would fail the #RRGGBB rule
      isPublished: published,
      translations: sent.map((l) => ({
        language: l,
        name: tr[l].name.trim(),
        description: tr[l].description.trim() || undefined,
      })),
    };
    start(async () => {
      const res = initial
        ? await updateFinishAction(initial.id, data)
        : await createFinishAction(data);
      if (res.ok) {
        setErrors({});
        if (initial) {
          setSaved(true);
          router.refresh();
        } else router.push(`/${lang}/admin/finishes/${res.id}`);
        return;
      }
      setErrors(mapTranslationErrors(res.errors, sent));
      setSaved(false);
    });
  }

  function remove() {
    if (!initial || !window.confirm(fi.confirmDelete)) return;
    start(async () => {
      const res = await deleteFinishAction(initial.id);
      if (res.ok) router.push(`/${lang}/admin/finishes`);
      else setErrors(res.errors);
    });
  }

  const known = new Set(["slug", "colorHex"]);
  const loose = Object.entries(errors).filter(
    ([k]) => !known.has(k) && !/^(ar|en)\./.test(k),
  );

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
            <FieldError message={errors.slug} />
          </div>
          <div>
            <label className={label} htmlFor="color">
              {fi.color}
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label={fi.color}
                value={HEX.test(color) ? color : "#c9a24b"}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 shrink-0 cursor-pointer rounded border border-stone-700 bg-stone-900"
              />
              <input
                id="color"
                dir="ltr"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#C9A24B"
                className={input}
              />
            </div>
            <p className="mt-1 text-xs text-stone-500">{fi.colorHint}</p>
            <FieldError message={errors.colorHex} />
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
              <label className={label}>{fi.name}</label>
              <input
                value={tr[l].name}
                onChange={(e) => setText(l, "name", e.target.value)}
                className={input}
              />
              <FieldError message={errors[`${l}.name`]} />
            </div>
            <div>
              <label className={label}>{fi.description}</label>
              <textarea
                rows={5}
                value={tr[l].description}
                onChange={(e) => setText(l, "description", e.target.value)}
                className={input}
              />
              <FieldError message={errors[`${l}.description`]} />
            </div>
          </div>
        ))}
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
        deleteLabel={fi.delete}
        onDelete={remove}
      />
    </form>
  );
}
