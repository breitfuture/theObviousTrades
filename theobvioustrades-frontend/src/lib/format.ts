// /src/lib/format.ts

/** Format a number as USD currency */
export const fmtCurrency = (v?: number | null) =>
  ((v ?? 0) as number).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

/** Normalize percent-like inputs:
 *  Accepts 0.0876 or 8.76 and always returns 0.0876
 */
export const normalizePct = (p?: number | null): number => {
  if (p == null || isNaN(p as number)) return 0;
  const n = Number(p);
  return Math.abs(n) > 1 ? n / 100 : n;
};

/** Format a number as percent (handles decimals or whole numbers) */
export const fmtPercent = (p?: number | null, digits = 2) => {
  const n = normalizePct(p);
  return (
    (n * 100).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + '%'
  );
};

/* ---------- Legacy P/L naming (still valid if used elsewhere) ---------- */
export const plClass = (v?: number | null) => {
  if (v == null || isNaN(v as number)) return 'text-neutral-600';
  return v > 0 ? 'text-emerald-600' : v < 0 ? 'text-rose-600' : 'text-neutral-600';
};

export const plBadge = (v?: number | null) => {
  if (v == null || isNaN(v as number)) return 'bg-neutral-100 text-neutral-700';
  return v > 0
    ? 'bg-emerald-100 text-emerald-700'
    : v < 0
    ? 'bg-rose-100 text-rose-700'
    : 'bg-neutral-100 text-neutral-700';
};

export const plArrow = (v?: number | null) => {
  if (v == null || isNaN(v as number) || v === 0) return '—';
  return v > 0 ? '▲' : '▼';
};

/* ---------- New unified naming for PerformancePanel & KPI cards ---------- */

/** Text tone (green/red/neutral) for % values */
export const pctTone = (v?: number | null) => {
  const n = normalizePct(v);
  if (!isFinite(n) || n === 0) return 'text-neutral-600';
  return n > 0 ? 'text-emerald-600' : 'text-rose-600';
};

/** Background badge tone for small KPI indicators */
export const pctBadgeTone = (v?: number | null) => {
  const n = normalizePct(v);
  if (!isFinite(n) || n === 0) return 'bg-neutral-100 text-neutral-700';
  return n > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
};

/** Arrow indicator for up/down/flat movement */
export const signArrow = (v?: number | null) => {
  const n = normalizePct(v);
  if (!isFinite(n) || n === 0) return '—';
  return n > 0 ? '▲' : '▼';
};
