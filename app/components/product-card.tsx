import Link from "next/link";
import type { Language } from "@/app/lib/i18n";
import type { toProductCard } from "@/app/lib/public/cards";
import { SiteImage } from "./site-image";
import { Price } from "./price";

type Card = ReturnType<typeof toProductCard>;

export function ProductCard({ p, lang }: { p: Card; lang: Language }) {
  return (
    <Link
      href={`/${lang}/products/${p.slug}`}
      className="group block overflow-hidden rounded border border-line bg-ink-2/75"
    >
      <div className="aspect-square overflow-hidden">
        <SiteImage
          image={p.image}
          alt={p.name}
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <p className="text-xs tracking-widest text-muted">{p.code}</p>
        <h3
          lang={p.textLanguage}
          className="mt-1 font-display text-lg text-gold"
        >
          {p.name}
        </h3>
        <Price
          price={p.price}
          lang={lang}
          className="mt-2 block text-sm text-ivory/90"
        />
      </div>
    </Link>
  );
}
