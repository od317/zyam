import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage } from "@/app/lib/i18n";
import { dict } from "@/app/lib/dictionary";
import { getPublicProduct } from "@/app/lib/public/catalog";
import { catalogLabels } from "@/app/lib/labels";
import { SiteImage } from "@/app/components/site-image";
import { CURRENCY, Price } from "@/app/components/price";
import { ProductCard } from "@/app/components/product-card";
import { FinishCard } from "@/app/components/finish-card";
import { Metadata } from "next";
import { absolute, pageMetadata } from "@/app/lib/seo";
import { JsonLd } from "@/app/components/json-ld";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLanguage(lang)) return {};
  const p = await getPublicProduct(slug, lang);
  if (!p) return {};
  return pageMetadata({
    lang,
    path: `/products/${slug}`,
    title: p.name,
    description: p.description,
    image: p.images[0],
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLanguage(lang)) notFound();
  const product = await getPublicProduct(slug, lang);
  if (!product) notFound();
  const l = catalogLabels[lang];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          sku: product.code,
          description: product.description || undefined,
          category: product.category.name,
          image: product.images
            .map((i) => i.largeUrl)
            .filter((u): u is string => !!u)
            .map(absolute),
          // Only an exact price is published. Ranges, "on request" and "hidden" stay out.
          ...(product.price?.mode === "exact" && {
            offers: {
              "@type": "Offer",
              price: product.price.amount,
              priceCurrency: CURRENCY,
            },
          }),
        }}
      />
      <Link
        href={`/${lang}/products`}
        className="text-sm text-gold hover:text-gold-light"
      >
        <span aria-hidden="true" className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {l.backProducts}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          <SiteImage
            image={product.images[0] ?? null}
            alt={product.name}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-square w-full rounded border border-line object-cover"
          />
          {product.images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {product.images.slice(1).map((img, i) => (
                <SiteImage
                  key={img.id}
                  image={img}
                  alt={`${product.name} ${i + 2}`}
                  sizes="(min-width: 1024px) 12vw, 25vw"
                  className="aspect-square w-full rounded border border-line object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm tracking-widest text-muted">
            {l.code}: {product.code}
          </p>
          <h1
            lang={product.textLanguage}
            className="mt-2 font-display text-4xl text-gold sm:text-5xl"
          >
            {product.name}
          </h1>

          <p className="mt-3 text-sm text-muted">
            <Link
              href={`/${lang}/products?category=${encodeURIComponent(product.category.slug)}`}
              className="hover:text-gold"
            >
              {product.category.name}
            </Link>
            {product.series && (
              <>
                {" · "}
                <Link
                  href={`/${lang}/products?series=${encodeURIComponent(product.series.slug)}`}
                  className="hover:text-gold"
                >
                  {product.series.name}
                </Link>
              </>
            )}
          </p>

          <Price
            price={product.price}
            lang={lang}
            className="mt-6 block text-2xl text-ivory"
          />

          {product.description && (
            <p
              lang={product.textLanguage}
              className="mt-6 whitespace-pre-line leading-8 text-ivory/90"
            >
              {product.description}
            </p>
          )}
          {product.textLanguage !== lang && (
            <p className="mt-2 text-sm text-muted">{dict[lang].fallbackNote}</p>
          )}

          {product.specs.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-2xl text-gold">{l.specs}</h2>
              <dl className="mt-3 divide-y divide-line border-y border-line">
                {product.specs.map((s) => (
                  <div
                    key={s.key}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <dt className="text-muted">{s.name}</dt>
                    <dd>
                      {s.value}
                      {s.unit ? ` ${s.unit}` : ""}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <Link
            href={`/${lang}/contact`}
            className="mt-8 inline-block rounded bg-gold px-6 py-3 font-medium text-ink hover:bg-gold-light"
          >
            {dict[lang].consult}
          </Link>
        </div>
      </div>

      {product.finishes.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-3xl text-gold">
            {l.availableFinishes}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 lg:grid-cols-5">
            {product.finishes.map((f) => (
              <FinishCard key={f.slug} f={f} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {product.related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-3xl text-gold">{l.related}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {product.related.map((p) => (
              <ProductCard key={p.slug} p={p} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
