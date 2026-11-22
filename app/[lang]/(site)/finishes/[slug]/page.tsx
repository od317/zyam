import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { dict } from "@/app/lib/dictionary";
import { getPublicFinish } from "@/app/lib/public/catalog";
import { catalogLabels } from "@/app/lib/labels";
import { SiteImage } from "@/app/components/site-image";
import { ProductCard } from "@/app/components/product-card";

export default async function FinishPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLanguage(lang)) notFound();
  const finish = await getPublicFinish(slug, lang);
  if (!finish) notFound();
  const l = catalogLabels[lang];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <Link
        href={`/${lang}/finishes`}
        className="text-sm text-gold hover:text-gold-light"
      >
        <span aria-hidden="true" className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {l.backFinishes}
      </Link>

      <div className="mt-6 flex items-center gap-4">
        {finish.colorHex && (
          <span
            aria-hidden="true"
            className="size-10 shrink-0 rounded-full border border-line"
            style={{ backgroundColor: finish.colorHex }}
          />
        )}
        <h1
          lang={finish.textLanguage}
          className="font-display text-4xl text-gold sm:text-5xl"
        >
          {finish.name}
        </h1>
      </div>

      {finish.description && (
        <p
          lang={finish.textLanguage}
          className="mt-6 max-w-3xl whitespace-pre-line leading-8 text-ivory/90"
        >
          {finish.description}
        </p>
      )}
      {finish.textLanguage !== lang && (
        <p className="mt-2 text-sm text-muted">{dict[lang].fallbackNote}</p>
      )}

      {finish.images.length > 0 && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {finish.images.map((img, i) => (
            <SiteImage
              key={img.id}
              image={img}
              alt={`${finish.name} ${i + 1}`}
              priority={i === 0}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="aspect-[4/3] w-full rounded border border-line object-cover"
            />
          ))}
        </div>
      )}

      {finish.products.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-3xl text-gold">{l.productsWith}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {finish.products.map((p) => (
              <ProductCard key={p.slug} p={p} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
