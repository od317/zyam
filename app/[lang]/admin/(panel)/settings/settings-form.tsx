"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import { LangTabs, input, label } from "@/app/components/admin/fields";
import { updateSettingsAction } from "../taxonomy/actions";

type Texts = Record<string, { ar: string; en: string }>;

const CONTACT = ["contact_phone", "contact_whatsapp", "contact_email"] as const;
const SOCIAL = [
  "social_instagram",
  "social_facebook",
  "social_tiktok",
] as const;
const TEXTS = ["about_text", "address", "working_hours"] as const;
const LONG = new Set(["about_text"]);

export function SettingsForm({
  lang,
  initial,
}: {
  lang: Language;
  initial: { plain: Record<string, string>; translated: Texts };
}) {
  const t = adminDict[lang].st;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [plain, setPlain] = useState(initial.plain);
  const [tr, setTr] = useState<Texts>(initial.translated);
  const [tab, setTab] = useState<Language>(lang);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await updateSettingsAction({ plain, translated: tr });
      if (res.ok) {
        setMsg({ ok: true, text: t.saved });
        router.refresh();
      } else {
        // The server answers with field errors keyed by path; show them all as a list.
        setMsg({ ok: false, text: Object.values(res.errors).join(" · ") });
      }
    });
  }

  const plainField = (
    k: (typeof CONTACT)[number] | (typeof SOCIAL)[number],
  ) => (
    <div key={k}>
      <label className={label}>{t.fields[k]}</label>
      <input
        dir="ltr"
        value={plain[k] ?? ""}
        onChange={(e) => setPlain((p) => ({ ...p, [k]: e.target.value }))}
        className={input}
      />
      {k === "contact_whatsapp" && (
        <p className="mt-1 text-xs text-stone-500">
          {t.hints.contact_whatsapp}
        </p>
      )}
      {k.startsWith("social_") && (
        <p className="mt-1 text-xs text-stone-500">{t.hints.social}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t.contact}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {CONTACT.map(plainField)}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t.social}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL.map(plainField)}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t.texts}</h2>
        <LangTabs value={tab} onChange={setTab} />
        {(["ar", "en"] as const).map((l) => (
          <div
            key={l}
            hidden={tab !== l}
            dir={l === "ar" ? "rtl" : "ltr"}
            className="space-y-4"
          >
            {TEXTS.map((k) => (
              <div key={k}>
                <label className={label}>{t.fields[k]}</label>
                <textarea
                  rows={LONG.has(k) ? 8 : 3}
                  value={tr[k]?.[l] ?? ""}
                  onChange={(e) =>
                    setTr((p) => ({
                      ...p,
                      [k]: {
                        ...(p[k] ?? { ar: "", en: "" }),
                        [l]: e.target.value,
                      },
                    }))
                  }
                  className={input}
                />
              </div>
            ))}
          </div>
        ))}
      </section>

      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`rounded border p-3 text-sm ${
            msg.ok
              ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
              : "border-red-800 bg-red-950/40 text-red-300"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        disabled={pending}
        className="rounded bg-amber-600 px-6 py-2 font-semibold text-stone-950 hover:bg-amber-500 disabled:opacity-50"
      >
        {pending ? t.saving : t.save}
      </button>
    </form>
  );
}
