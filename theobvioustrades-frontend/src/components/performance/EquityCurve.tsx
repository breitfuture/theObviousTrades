// /src/components/performance/EquityCurve.tsx
'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
// relative imports per your preference
import { SeriesPoint } from '../../lib/api';
import { normalizePct } from '../../lib/format';

type Props = { series: SeriesPoint[]; days?: number };

export default function EquityCurve({ series, days = 180 }: Props) {
  const sliced = useMemo(() => (days ? series.slice(-days) : series), [series, days]);

  // Build cumulative curves normalized to 1.0
  const data = useMemo(() => {
    let p = 1, v = 1, q = 1;
    return sliced.map((row) => {
      p *= 1 + normalizePct(row.portfolio_ret ?? 0);
      v *= 1 + normalizePct(row.voo_ret ?? 0);
      q *= 1 + normalizePct(row.qqq_ret ?? 0);
      return {
        date: row.day,
        Portfolio: p,
        VOO: v,
        QQQ: q,
      };
    });
  }, [sliced]);

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white">
        <div className="text-sm text-neutral-600">No series data.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm bg-white h-72 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="Portfolio" strokeWidth={2} fillOpacity={0.15} />
          <Area type="monotone" dataKey="VOO" strokeWidth={2} fillOpacity={0.1} />
          <Area type="monotone" dataKey="QQQ" strokeWidth={2} fillOpacity={0.1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
