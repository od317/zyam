import Link from "next/link";
import type { Language } from "@/app/lib/i18n";
import { dict } from "@/app/lib/dictionary";
import { LanguageSwitcher } from "./language-switcher";

const links = [
  "services",
  "projects",
  "products",
  "finishes",
  "about",
] as const;

export function Header({ lang }: { lang: Language }) {
  const t = dict[lang];
  const nav = links.map((k) => (
    <Link
      key={k}
      href={`/${lang}/${k}`}
      className="py-2 text-ivory/90 transition-colors hover:text-gold"
    >
      {t.nav[k]}
    </Link>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:rounded focus:bg-gold focus:px-3 focus:py-2 focus:text-ink"
      >
        {t.skip}
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={`/${lang}`}
          className="font-display text-xl font-bold tracking-wide text-gold"
        >
          ZYAM DESIGN
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">{nav}</nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher lang={lang} />
          <Link
            href={`/${lang}/contact`}
            className="hidden rounded border border-gold px-4 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-ink sm:block"
          >
            {t.consult}
          </Link>

          {/* Mobile menu: a native <details>, so it needs no JavaScript */}
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded border border-line px-3 py-2 text-sm">
              {t.menu}
            </summary>
            <div className="absolute end-0 mt-2 flex w-56 flex-col rounded border border-line bg-ink-2 p-4 text-sm shadow-xl">
              {nav}
              <Link
                href={`/${lang}/contact`}
                className="mt-3 rounded bg-gold px-3 py-2 text-center font-semibold text-ink"
              >
                {t.consult}
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
