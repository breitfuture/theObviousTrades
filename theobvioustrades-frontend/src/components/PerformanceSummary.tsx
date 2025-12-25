
'use client';

import { useEffect, useState } from 'react';

type Perf = {
  total_cost: number | null;
  total_value: number | null;
  pl_abs: number | null;
  pl_pct: number | null;
  as_of: string | null;
};

const fmtMoney = (n: number | null | undefined) =>
  typeof n === 'number' && Number.isFinite(n)
    ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
    : '—';

const fmtPct = (n: number | null | undefined) =>
  typeof n === 'number' && Number.isFinite(n)
    ? (n * 100).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%'
    : '—';

export default function PerformanceSummary() {
  const [data, setData] = useState<Perf | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/portfolio/performance', { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        setData(json?.data ?? null);
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load performance');
      }
    })();
  }, []);

  if (err) return <div className="text-red-600">Failed to load performance: {err}</div>;
  if (!data) return <div>Loading…</div>;

  const cards = [
    { label: 'Portfolio Value', value: fmtMoney(data.total_value) },
    { label: 'Cost Basis', value: fmtMoney(data.total_cost) },
    { label: 'P&L ($)', value: fmtMoney(data.pl_abs) },
    { label: 'P&L (%)', value: fmtPct(data.pl_pct) },
  ];

  return (
    <div className="mb-4">
      <div className="text-sm text-gray-500 mb-2">As of: {data.as_of ?? '—'}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div key={`kpi-${i}`} className="rounded-2xl border p-4 shadow-sm">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className="text-xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
