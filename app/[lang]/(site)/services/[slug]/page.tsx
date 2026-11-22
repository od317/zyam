import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { dict } from "@/app/lib/dictionary";
import { catalogLabels } from "@/app/lib/labels";
import { getPublicService } from "@/app/lib/public/site";
import { Price } from "@/app/components/price";
import { ProjectCard } from "@/app/components/project-card";

export default async function ServicePage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLanguage(lang)) notFound();
  const service = await getPublicService(slug, lang);
  if (!service) notFound();
  const l = catalogLabels[lang];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <Link
        href={`/${lang}/services`}
        className="text-sm text-gold hover:text-gold-light"
      >
        <span aria-hidden="true" className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {l.backServices}
      </Link>

      <h1
        lang={service.textLanguage}
        className="mt-4 font-display text-4xl text-gold sm:text-5xl"
      >
        {service.name}
      </h1>
      <Price
        price={service.price}
        lang={lang}
        from
        className="mt-3 block text-lg text-ivory"
      />

      <p
        lang={service.textLanguage}
        className="mt-8 max-w-3xl whitespace-pre-line leading-8 text-ivory/90"
      >
        {service.description}
      </p>
      {service.textLanguage !== lang && (
        <p className="mt-2 text-sm text-muted">{dict[lang].fallbackNote}</p>
      )}

      <Link
        href={`/${lang}/contact`}
        className="mt-8 inline-block rounded bg-gold px-6 py-3 font-medium text-ink hover:bg-gold-light"
      >
        {dict[lang].consult}
      </Link>

      {service.projects.length > 0 && (
        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl text-gold">
              {l.latestProjects}
            </h2>
            <Link
              href={`/${lang}/projects?service=${encodeURIComponent(service.slug)}`}
              className="text-sm text-gold hover:text-gold-light"
            >
              {l.seeServiceProjects}
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {service.projects.map((p) => (
              <ProjectCard key={p.slug} p={p} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
