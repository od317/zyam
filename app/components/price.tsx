import type { Language } from "@/app/lib/i18n";
import type { PriceView } from "@/app/lib/public/common";
import { catalogLabels } from "@/app/lib/labels";

const CURRENCY = "USD"; // decision for you: the client's currency

export function Price({
  price,
  lang,
  className,
}: {
  price: PriceView | null;
  lang: Language;
  className?: string;
}) {
  if (!price) return null; // "hidden": nothing is shown
  // "-u-nu-latn" keeps Latin digits (1,200) in Arabic too. Remove it for Arabic-Indic digits.
  const fmt = new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  });
  const text =
    price.mode === "exact"
      ? fmt.format(price.amount)
      : price.mode === "range"
        ? `${fmt.format(price.min)} – ${fmt.format(price.max)}`
        : catalogLabels[lang].onRequest;
  return <span className={className}>{text}</span>;
}
