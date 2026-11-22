import type { Language } from "@/app/lib/i18n";

export const input =
  "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:border-amber-500 focus:outline-none";
export const label = "mb-1 block text-sm text-stone-300";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="mt-1 text-sm text-red-400">
      {message}
    </p>
  ) : null;
}

export function LangTabs({
  value,
  onChange,
}: {
  value: Language;
  onChange: (l: Language) => void;
}) {
  return (
    <div role="tablist" className="flex gap-2">
      {(["ar", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={value === l}
          onClick={() => onChange(l)}
          className={`rounded px-4 py-1.5 text-sm ${
            value === l
              ? "bg-amber-600 font-semibold text-stone-950"
              : "border border-stone-700 text-stone-300"
          }`}
        >
          {l === "ar" ? "العربية" : "English"}
        </button>
      ))}
    </div>
  );
}

// The server counts only the translations that were sent: "translations.1.name" -> "en.name".
export function mapTranslationErrors(
  errors: Record<string, string>,
  sent: readonly string[],
) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) {
    const m = k.match(/^translations\.(\d+)\.(.+)$/);
    out[m ? `${sent[Number(m[1])]}.${m[2]}` : k] = v;
  }
  return out;
}

export function SaveBar({
  t,
  published,
  onPublished,
  saved,
  pending,
  isNew,
  canDelete,
  deleteLabel,
  onDelete,
}: {
  t: {
    published: string;
    saved: string;
    saving: string;
    save: string;
    create: string;
  };
  published: boolean;
  onPublished: (v: boolean) => void;
  saved: boolean;
  pending: boolean;
  isNew: boolean;
  canDelete: boolean;
  deleteLabel: string;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-stone-800 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => onPublished(e.target.checked)}
          />
          {t.published}
        </label>
        {saved && !pending && (
          <span className="text-sm text-emerald-400">{t.saved}</span>
        )}
        <div className="ms-auto flex items-center gap-3">
          {canDelete && !isNew && (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="text-sm text-red-400 hover:text-red-300"
            >
              {deleteLabel}
            </button>
          )}
          <button
            disabled={pending}
            className="rounded bg-amber-600 px-6 py-2 font-semibold text-stone-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? t.saving : isNew ? t.create : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
