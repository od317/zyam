import Link from "next/link";
import type { Language } from "@/app/lib/i18n";
import type { toFinishCard } from "@/app/lib/public/cards";
import { SiteImage } from "./site-image";

type Card = ReturnType<typeof toFinishCard>;

export function FinishCard({ f, lang }: { f: Card; lang: Language }) {
  return (
    <Link
      href={`/${lang}/finishes/${f.slug}`}
      className="group block overflow-hidden rounded border border-line bg-ink-2/75"
    >
      <div className="aspect-square overflow-hidden">
        {f.image || !f.colorHex ? (
          <SiteImage
            image={f.image}
            alt={f.name}
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ backgroundColor: f.colorHex }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="flex items-center gap-3 p-4">
        {f.colorHex && (
          <span
            aria-hidden="true"
            className="size-4 shrink-0 rounded-full border border-line"
            style={{ backgroundColor: f.colorHex }}
          />
        )}
        <h3 lang={f.textLanguage} className="font-display text-lg text-gold">
          {f.name}
        </h3>
      </div>
    </Link>
  );
}
