import type { Language } from "@/app/lib/i18n";
import type { PriceView } from "@/app/lib/public/common";
import { catalogLabels } from "@/app/lib/labels";

export const CURRENCY = "USD"; // decision for you: the client's currency

export function Price({
  price,
  lang,
  className,
  from = false,
}: {
  price: PriceView | null;
  lang: Language;
  className?: string;
  from?: boolean; // services: show "Starting from" before an exact price
}) {
  if (!price) return null;
  const l = catalogLabels[lang];
  const fmt = new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  });
  const text =
    price.mode === "exact"
      ? `${from ? `${l.startingFrom} ` : ""}${fmt.format(price.amount)}`
      : price.mode === "range"
        ? `${fmt.format(price.min)} – ${fmt.format(price.max)}`
        : l.onRequest;
  return <span className={className}>{text}</span>;
}
