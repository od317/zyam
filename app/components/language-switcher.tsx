"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LanguageSwitcher({ lang }: { lang: "ar" | "en" }) {
  const pathname = usePathname();
  const other = lang === "ar" ? "en" : "ar";
  const href = pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${other}`);
  return (
    <Link
      href={href}
      lang={other}
      hrefLang={other}
      className="text-sm text-gold hover:text-gold-light"
    >
      {other === "ar" ? "العربية" : "English"}
    </Link>
  );
}
