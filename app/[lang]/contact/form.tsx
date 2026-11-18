// form.tsx
"use client";

import { useState } from "react";

const t = {
  ar: {
    name: "الاسم",
    phone: "رقم الهاتف",
    email: "البريد (اختياري)",
    message: "رسالتك",
    title: "عنوان الفكرة",
    send: "إرسال",
    done: "تم الإرسال، سنتواصل معك قريباً",
    consultation: "طلب استشارة",
    project_idea: "فكرة مشروع",
    quote_request: "طلب عرض سعر",
  },
  en: {
    name: "Name",
    phone: "Phone",
    email: "Email (optional)",
    message: "Your message",
    title: "Idea title",
    send: "Send",
    done: "Sent. We will contact you soon.",
    consultation: "Consultation",
    project_idea: "Project idea",
    quote_request: "Quote request",
  },
} as const;

const field =
  "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100";

export function ContactForm({ lang }: { lang: "ar" | "en" }) {
  const l = t[lang];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const res = await fetch("/api/inquiries", {
      method: "POST",
      body: new FormData(e.currentTarget),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) return setDone(true);
    setErrors(body.errors ?? { _form: body.error ?? "Error" });
  }

  if (done) return <p role="status">{l.done}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <select name="type" className={field}>
        <option value="consultation">{l.consultation}</option>
        <option value="project_idea">{l.project_idea}</option>
        <option value="quote_request">{l.quote_request}</option>
      </select>
      <input name="name" placeholder={l.name} required className={field} />
      <input
        name="phone"
        type="tel"
        placeholder={l.phone}
        required
        className={field}
        dir="ltr"
      />
      <input
        name="email"
        type="email"
        placeholder={l.email}
        className={field}
        dir="ltr"
      />
      <input name="title" placeholder={l.title} className={field} />
      <textarea
        name="message"
        placeholder={l.message}
        required
        rows={5}
        className={field}
      />
      <input
        name="images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
      />
      {/* Honeypot: hidden from people, filled by bots */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px]"
      />
      {Object.entries(errors).map(([k, m]) => (
        <p key={k} role="alert" className="text-sm text-red-400">
          {m}
        </p>
      ))}
      <button
        disabled={busy}
        className="rounded bg-amber-600 px-4 py-2 font-semibold text-stone-950 disabled:opacity-50"
      >
        {busy ? "..." : l.send}
      </button>
    </form>
  );
}
