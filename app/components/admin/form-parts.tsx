"use client";

import { useState } from "react";
import { FieldError, input, label } from "./fields";

export type PriceMode = "exact" | "range" | "hidden" | "on_request";

type PriceLabels = {
  priceMode: string;
  priceModes: Record<PriceMode, string>;
  priceMin: string;
  priceRangeMin: string;
  priceMax: string;
};

// The same price rules the server checks: exact needs one number, range needs two, the rest need none.
export function PriceFields({
  t,
  mode,
  min,
  max,
  onMode,
  onMin,
  onMax,
  errors,
}: {
  t: PriceLabels;
  mode: PriceMode;
  min: string;
  max: string;
  onMode: (m: PriceMode) => void;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label className={label} htmlFor="price-mode">
          {t.priceMode}
        </label>
        <select
          id="price-mode"
          value={mode}
          onChange={(e) => onMode(e.target.value as PriceMode)}
          className={input}
        >
          {(Object.keys(t.priceModes) as PriceMode[]).map((m) => (
            <option key={m} value={m}>
              {t.priceModes[m]}
            </option>
          ))}
        </select>
        <FieldError message={errors.priceMode} />
      </div>
      {(mode === "exact" || mode === "range") && (
        <div>
          <label className={label}>
            {mode === "range" ? t.priceRangeMin : t.priceMin}
          </label>
          <input
            type="number"
            inputMode="decimal"
            dir="ltr"
            value={min}
            onChange={(e) => onMin(e.target.value)}
            className={input}
          />
          <FieldError message={errors.priceMin} />
        </div>
      )}
      {mode === "range" && (
        <div>
          <label className={label}>{t.priceMax}</label>
          <input
            type="number"
            inputMode="decimal"
            dir="ltr"
            value={max}
            onChange={(e) => onMax(e.target.value)}
            className={input}
          />
          <FieldError message={errors.priceMax} />
        </div>
      )}
    </div>
  );
}

type Option = { id: number; name: string };

export function Checklist({
  title,
  options,
  value,
  onChange,
  placeholder,
}: {
  title: string;
  options: Option[];
  value: number[];
  onChange: (v: number[]) => void;
  placeholder: string;
}) {
  const [filter, setFilter] = useState("");
  const shown = options.filter((o) =>
    o.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-stone-300">
        {title} ({value.length})
      </legend>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={placeholder}
        className={`${input} mb-2`}
      />
      <div className="max-h-56 overflow-y-auto rounded border border-stone-800 p-2">
        {shown.map((o) => (
          <label key={o.id} className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={value.includes(o.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, o.id]
                    : value.filter((x) => x !== o.id),
                )
              }
            />
            {o.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
