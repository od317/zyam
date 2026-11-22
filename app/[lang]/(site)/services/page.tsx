import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { dict } from "@/app/lib/dictionary";
import { catalogLabels } from "@/app/lib/labels";
import { listPublicServices } from "@/app/lib/public/site";
import { Price } from "@/app/components/price";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const services = await listPublicServices(lang);
  const l = catalogLabels[lang];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-gold sm:text-5xl">
        {dict[lang].nav.services}
      </h1>
      <p className="mt-2 text-muted">{dict[lang].hall.servicesLead}</p>

      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {services.map((s, i) => (
          <li key={s.slug}>
            <Link
              href={`/${lang}/services/${s.slug}`}
              className="group flex h-full flex-col rounded border border-line bg-ink-2/75 p-6 transition-colors hover:border-gold/60"
            >
              <span
                aria-hidden="true"
                className="font-display text-sm tracking-widest text-gold/60"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2
                lang={s.textLanguage}
                className="mt-2 font-display text-2xl text-gold"
              >
                {s.name}
              </h2>
              <p
                lang={s.textLanguage}
                className="mt-3 line-clamp-3 leading-7 text-ivory/80"
              >
                {s.description}
              </p>
              <div className="mt-auto flex items-center justify-between gap-4 pt-6 text-sm text-muted">
                <span>
                  {s.projectCount} {l.projectsCount}
                </span>
                <Price price={s.price} lang={lang} from />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
