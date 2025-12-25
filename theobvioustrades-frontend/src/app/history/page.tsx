// src/app/transparency/history/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

type Snapshot = string;

type Position = {
  symbol: string;
  account_name: string | null;
  qty: number;
  avg_cost: number;
  cost_value: number;
  price: number | null;
  market_value: number | null;
};

type PositionsResponse = {
  as_of: string;
  totals: {
    cost: number;
    market: number | null;
    pl_abs: number | null;
    pl_pct: number | null;
  };
  positions: Position[];
};

function fmtCurrency(v?: number | null) {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

function fmtNumber(v?: number | null, d = 2) {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtPercent(v?: number | null, d = 2) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(d)}%`;
}

async function api(path: string) {
  const full = `${API}${path}`;
  const res = await fetch(full, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} for ${full}\n${text}`);
  }
  return res.json();
}

export default function HistoryPage() {
  const [dates, setDates] = useState<Snapshot[]>([]);
  const [selected, setSelected] = useState<Snapshot | null>(null);
  const [data, setData] = useState<PositionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load list of snapshot dates
  useEffect(() => {
    (async () => {
      try {
        const s: Snapshot[] = await api('/api/history/snapshots');
        setDates(s);
        if (s.length && !selected) setSelected(s[0]); // default to most recent
      } catch (e: any) {
        setErr(e?.message || 'Failed to load snapshots');
      }
    })();
  }, []);

  // Load positions for selected snapshot
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const resp: PositionsResponse = await api(
          `/api/history/positions?as_of=${encodeURIComponent(selected)}`
        );
        setData(resp);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load positions');
      } finally {
        setLoading(false);
      }
    })();
  }, [selected]);

  const totals = data?.totals;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Transparency / History</h1>
        <div className="text-sm text-neutral-600">
          {selected ? `Snapshot: ${selected}` : '—'}
        </div>
      </div>

      {/* Snapshot date picker */}
      <div className="flex gap-2 flex-wrap">
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => setSelected(d)}
            className={`px-3 py-1 rounded-full border ${
              selected === d ? 'bg-black text-white' : 'bg-white'
            } hover:bg-black hover:text-white transition`}
            title={`View positions as of ${d}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-neutral-500">Total Cost</div>
            <div className="text-xl font-semibold">
              {fmtCurrency(totals.cost)}
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-neutral-500">Market Value</div>
            <div className="text-xl font-semibold">
              {fmtCurrency(totals.market)}
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-neutral-500">P/L (abs)</div>
            <div className="text-xl font-semibold">
              {fmtCurrency(totals.pl_abs)}
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-neutral-500">P/L %</div>
            <div className="text-xl font-semibold">
              {totals.pl_pct == null ? '—' : fmtPercent(totals.pl_pct)}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border overflow-x-auto">
        {err && <div className="p-4 text-red-600">{err}</div>}
        {loading && <div className="p-4">Loading…</div>}
        {!loading && data && (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b">
              <tr>
                <th className="text-left p-3">Symbol</th>
                <th className="text-left p-3">Account</th>
                <th className="text-right p-3">Qty</th>
                <th className="text-right p-3">Avg Cost</th>
                <th className="text-right p-3">Cost Value</th>
                <th className="text-right p-3">Price</th>
                <th className="text-right p-3">Market Value</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((p) => (
                <tr
                  key={`${p.symbol}-${p.account_name ?? ''}`}
                  className="border-b last:border-b-0"
                >
                  <td className="p-3 font-medium">{p.symbol}</td>
                  <td className="p-3">{p.account_name ?? '—'}</td>
                  <td className="p-3 text-right">{fmtNumber(p.qty, 4)}</td>
                  <td className="p-3 text-right">{fmtCurrency(p.avg_cost)}</td>
                  <td className="p-3 text-right">{fmtCurrency(p.cost_value)}</td>
                  <td className="p-3 text-right">{fmtCurrency(p.price)}</td>
                  <td className="p-3 text-right">
                    {fmtCurrency(p.market_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Activity preview (diff selected snapshot vs previous one, if available) */}
      <ActivityPreview dates={dates} selected={selected} />
    </div>
  );
}

function ActivityPreview({
  dates,
  selected,
}: {
  dates: string[];
  selected: string | null;
}) {
  const pair = useMemo(() => {
    if (!selected || !dates.length) return null;

    // dates is newest → oldest, e.g. [2025-12-05, 2025-12-04, ...]
    const idx = dates.indexOf(selected);
    if (idx === -1) return null;

    // If this is the earliest snapshot, there's nothing earlier to compare against
    if (idx === dates.length - 1) {
      return { from: null as string | null, to: selected };
    }

    // Compare selected snapshot to the next older one
    return { from: dates[idx + 1], to: dates[idx] };
  }, [dates, selected]);

  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    if (!pair || !pair.to || !pair.from) {
      setRows(null);
      return;
    }

    (async () => {
  // At this point TypeScript still thinks pair.from could be null, so enforce narrowing
  const from = pair.from as string;
  const to = pair.to as string;

  const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
  const res = await fetch(
    `${API}/api/history/activity?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { cache: 'no-store' },
  );

      if (res.ok) {
        const j = await res.json();
        setRows(j.changes || []);
      } else {
        setRows(null);
      }
    })();
  }, [pair?.from, pair?.to]);

  if (!pair || !pair.to) return null;

  return (
    <div className="space-y-3">
      <div className="text-base font-semibold">Recent Activity (inferred)</div>

      {/* Earliest snapshot: nothing to diff against */}
      {!pair.from && (
        <div className="text-sm text-neutral-600">
          This is the earliest snapshot, so there&apos;s no prior activity to compare
          against.
        </div>
      )}

      {/* No changes for this date pair */}
      {pair.from && !rows?.length && (
        <div className="text-sm text-neutral-600">
          No changes between {pair.from} and {pair.to}.
        </div>
      )}

      {/* There ARE inferred trades */}
      {pair.from && !!rows?.length && (
        <div className="rounded-2xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b">
              <tr>
                <th className="text-left p-3">Symbol</th>
                <th className="text-left p-3">Action</th>
                <th className="text-right p-3">Δ Qty</th>
                <th className="text-right p-3">Price (to)</th>
                <th className="text-right p-3">Notional</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.symbol}-${r.action}-${pair.to}`}
                  className="border-b last:border-b-0"
                >
                  <td className="p-3 font-medium">{r.symbol}</td>
                  <td className="p-3">{r.action}</td>
                  <td className="p-3 text-right">
                    {fmtNumber(r.delta_qty, 4)}
                  </td>
                  <td className="p-3 text-right">
                    {fmtCurrency(r.price_to)}
                  </td>
                  <td className="p-3 text-right">
                    {fmtCurrency(r.notional_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-neutral-500">
        This is a quick diff between the selected snapshot and the prior one.
        We&apos;ll add manual commentary & richer metrics next.
      </div>
    </div>
  );
}
