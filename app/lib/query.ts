// One value from the query string, trimmed and length-capped (never trust the URL).
export const one = (v: string | string[] | undefined, max = 80) =>
  (Array.isArray(v) ? v[0] : v)?.trim().slice(0, max) || undefined;
