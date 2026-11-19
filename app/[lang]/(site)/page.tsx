import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { dict } from "@/app/lib/dictionary";
import { listPublicProjects } from "@/app/lib/public/projects";
import {
  listPublicProducts,
  listPublicFinishes,
} from "@/app/lib/public/catalog";
import { listPublicServices } from "@/app/lib/public/site";
import { SiteImage } from "@/app/components/site-image";
import { Gate } from "@/app/components/gate";

export default async function HallPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = dict[lang];

  // One cover image per door, taken from the newest published item of each section.
  const [projects, products, finishes, services] = await Promise.all([
    listPublicProjects({ lang, limit: 1 }),
    listPublicProducts({ lang, limit: 1 }),
    listPublicFinishes({ lang, limit: 1 }),
    listPublicServices(lang),
  ]);

  const doors = [
    {
      key: "projects",
      href: `/${lang}/projects`,
      image: projects.items[0]?.image ?? null,
    },
    {
      key: "products",
      href: `/${lang}/products`,
      image: products.items[0]?.image ?? null,
    },
    {
      key: "finishes",
      href: `/${lang}/finishes`,
      image: finishes.items[0]?.image ?? null,
    },
    { key: "ideas", href: `/${lang}/contact?type=project_idea`, image: null },
  ] as const;

  return (
    <main>
      <Gate skipLabel={t.skipIntro} />

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-16 text-center">
        <p className="text-sm tracking-widest text-gold-light">
          {t.hall.kicker}
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold text-gold sm:text-6xl">
          {t.hall.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted">{t.hall.lead}</p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {doors.map((d) => {
          const copy = t.hall.doors[d.key];
          return (
            <Link
              key={d.key}
              href={d.href}
              className="group relative block aspect-[3/5] overflow-hidden rounded-t-full border border-gold/40 bg-ink-2 transition-all duration-500 hover:border-gold hover:shadow-[0_0_40px_-12px_var(--color-gold)]"
            >
              <SiteImage
                image={d.image}
                alt=""
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-center">
                <h2 className="font-display text-2xl text-gold">
                  {copy.title}
                </h2>
                <p className="mt-2 text-sm text-ivory/80">{copy.text}</p>
                <span className="mt-4 inline-block text-xs tracking-widest text-gold-light">
                  {t.hall.enter}{" "}
                  <span
                    aria-hidden="true"
                    className="inline-block rtl:rotate-180"
                  >
                    →
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-3xl text-gold">
          {t.hall.servicesTitle}
        </h2>
        <p className="mt-2 text-muted">{t.hall.servicesLead}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <li key={s.slug}>
              <Link
                href={`/${lang}/services/${s.slug}`}
                className="flex items-center gap-4 rounded border border-line bg-ink-2 p-5 transition-colors hover:border-gold"
              >
                <span className="font-display text-3xl text-gold/60" dir="ltr">
                  0{i + 1}
                </span>
                <span lang={s.textLanguage} className="text-lg">
                  {s.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
