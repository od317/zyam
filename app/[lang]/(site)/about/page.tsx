import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { dict } from "@/app/lib/dictionary";
import { aboutContent } from "@/app/lib/about-content";
import { getPublicSettings, listPublicServices } from "@/app/lib/public/site";
import { Metadata } from "next";
import { pageMetadata } from "@/app/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLanguage(lang)) return {};
  const s = await getPublicSettings(lang);
  return pageMetadata({
    lang,
    path: "/about",
    title: aboutContent[lang].title,
    description: s.about_text || aboutContent[lang].defaultIntro,
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const [settings, services] = await Promise.all([
    getPublicSettings(lang),
    listPublicServices(lang),
  ]);
  const c = aboutContent[lang];

  const info = [
    settings.contact_phone && {
      label: c.phone,
      node: (
        <a
          href={`tel:${settings.contact_phone.replace(/\s/g, "")}`}
          dir="ltr"
          className="hover:text-gold"
        >
          {settings.contact_phone}
        </a>
      ),
    },
    settings.contact_email && {
      label: c.email,
      node: (
        <a
          href={`mailto:${settings.contact_email}`}
          dir="ltr"
          className="hover:text-gold"
        >
          {settings.contact_email}
        </a>
      ),
    },
    settings.address && {
      label: c.address,
      node: <span>{settings.address}</span>,
    },
    settings.working_hours && {
      label: c.hours,
      node: <span>{settings.working_hours}</span>,
    },
  ].filter((x): x is { label: string; node: React.ReactNode } => Boolean(x));

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-gold sm:text-5xl">{c.title}</h1>
      <p className="mt-8 max-w-3xl whitespace-pre-line text-lg leading-9 text-ivory/90">
        {settings.about_text || c.defaultIntro}
      </p>

      {services.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-3xl text-gold">{c.whatWeDo}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/${lang}/services/${s.slug}`}
                  lang={s.textLanguage}
                  className="block rounded border border-line bg-ink-2/75 p-5 text-gold transition-colors hover:border-gold/60"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16">
        <h2 className="font-display text-3xl text-gold">{c.howWeWork}</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {c.steps.map((s, i) => (
            <li
              key={s.title}
              className="rounded border border-line bg-ink-2/75 p-6"
            >
              <span
                aria-hidden="true"
                className="font-display text-3xl text-gold/50"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-xl text-gold">{s.title}</h3>
              <p className="mt-2 text-sm leading-7 text-ivory/80">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 rounded border border-gold/30 bg-ink-2/75 p-8 sm:p-12">
        <h2 className="font-display text-3xl text-gold">{c.ctaTitle}</h2>
        <p className="mt-2 text-muted">{c.ctaText}</p>
        <Link
          href={`/${lang}/contact`}
          className="mt-6 inline-block rounded bg-gold px-6 py-3 font-medium text-ink hover:bg-gold-light"
        >
          {dict[lang].consult}
        </Link>
        {info.length > 0 && (
          <dl className="mt-8 grid gap-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
            {info.map((x) => (
              <div key={x.label}>
                <dt className="text-muted">{x.label}</dt>
                <dd className="mt-1 text-ivory">{x.node}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </main>
  );
}
