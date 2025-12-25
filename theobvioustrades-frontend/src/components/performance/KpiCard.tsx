// /components/performance/KpiCard.tsx
'use client';

import { fmtPercent, pctTone, pctBadgeTone, signArrow } from '../../lib/format';

export default function KpiCard({
  label,
  value,
  help,
  loading = false,
}: {
  label: string;
  value?: number | null;
  help?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white">
        <div className="h-4 w-24 bg-neutral-200 rounded mb-3 animate-pulse" />
        <div className="h-8 w-32 bg-neutral-200 rounded animate-pulse" />
      </div>
    );
  }

  const tone = pctTone(value);
  const badge = pctBadgeTone(value);
  const arrow = signArrow(value);

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white">
      <div className="text-sm text-neutral-600">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className={`text-2xl font-semibold ${tone}`}>{fmtPercent(value)}</div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badge}`}>{arrow}</span>
      </div>
      {help ? <div className="mt-2 text-xs text-neutral-500">{help}</div> : null}
    </div>
  );
}
