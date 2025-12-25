"use client";

import { useEffect, useState } from "react";

/** ---- Base ---- */
const BASE =
  (process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:8000").replace(/\/+$/, "");

/** ---- Helpers ---- */
const fmtCurrency = (v?: number | null) =>
  ((v ?? 0) as number).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const fmtNumber = (v?: number | null, digits = 2) =>
  ((v ?? 0) as number).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const toDecimalPct = (v?: number | null) => {
  const n = Number(v ?? 0);
  return n > 1 ? n / 100 : n;
};
const fmtPercent = (v?: number | null, digits = 2) =>
  `${(toDecimalPct(v) * 100).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;

const pnlColor = (v?: number | null) =>
  v == null || v === 0 ? "text-neutral-600" : v > 0 ? "text-emerald-600" : "text-rose-600";

/** ---- Types (from /api/history/*) ---- */
type DashboardLatest = { snapshot_as_of: string };
type PositionRow = {
  symbol: string;
  qty: number;
  avg_cost: number | null;
  price: number | null;
  market_value: number;
  cost_value: number;
  pl_abs: number;
  pl_pct: number | null;
};
type HistoryPositions = { as_of: string; positions: PositionRow[] };

/** ---- Component ---- */
export default function PositionsTable() {
  const [rows, setRows] = useState<PositionRow[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) Get latest snapshot date
        const dashRes = await fetch(`${BASE}/api/history/dashboard-latest`, { cache: "no-store" });
        if (!dashRes.ok) throw new Error(`HTTP ${dashRes.status}`);
        const dash: DashboardLatest = await dashRes.json();

        // 2) Fetch positions for that date
        const posRes = await fetch(`${BASE}/api/history/positions?as_of=${dash.snapshot_as_of}`, { cache: "no-store" });
        if (!posRes.ok) throw new Error(`HTTP ${posRes.status}`);
        const data: HistoryPositions = await posRes.json();

        setAsOf(data.as_of);
        setRows(data.positions ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load positions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-sm text-neutral-500">Loading positions…</div>;
  if (err) return <div className="text-sm text-rose-600">Failed to load positions: {err}</div>;
  if (!rows.length) return <div className="text-sm text-neutral-500">No positions.</div>;

  const totals = rows.reduce(
    (acc, r) => {
      acc.marketValue += r.market_value ?? 0;
      acc.totalPL += r.pl_abs ?? 0;
      return acc;
    },
    { marketValue: 0, totalPL: 0 }
  );

  const numClass = "text-right tabular-nums";
  const rowClass = "text-sm leading-tight py-1.5";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-neutral-50">
        <div className="text-xs text-neutral-600">
          Source: <code>/api/history/positions?as_of=YYYY-MM-DD</code>
        </div>
        <div className="text-xs text-neutral-600">As of: {asOf ? new Date(asOf).toLocaleDateString() : "—"}</div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="bg-neutral-50 text-neutral-600 text-xs uppercase tracking-wide">
            <th className="text-left px-3 py-2">Symbol</th>
            <th className="text-right px-3 py-2">Qty</th>
            <th className="text-right px-3 py-2">Avg Cost</th>
            <th className="text-right px-3 py-2">Price</th>
            <th className="text-right px-3 py-2">Market Value</th>
            <th className="text-right px-3 py-2">Unrlzd P&amp;L</th>
            <th className="text-right px-3 py-2">Unrlzd %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol} className={`border-t border-neutral-100 ${rowClass}`}>
              <td className="px-3 font-medium">{r.symbol}</td>
              <td className={`px-3 ${numClass}`}>{fmtNumber(r.qty, 0)}</td>
              <td className={`px-3 ${numClass}`}>{r.avg_cost == null ? "—" : fmtCurrency(r.avg_cost)}</td>
              <td className={`px-3 ${numClass}`}>{r.price == null ? "—" : fmtCurrency(r.price)}</td>
              <td className={`px-3 ${numClass}`}>{fmtCurrency(r.market_value)}</td>
              <td className={`px-3 ${numClass} ${pnlColor(r.pl_abs)}`}>{fmtCurrency(r.pl_abs)}</td>
              <td className={`px-3 ${numClass} ${pnlColor(r.pl_abs)}`}>{fmtPercent(r.pl_pct)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-neutral-50 border-t border-neutral-200">
            <td className="px-3 py-2 text-xs text-neutral-600">Totals</td>
            <td className="px-3 py-2"></td>
            <td className="px-3 py-2"></td>
            <td className="px-3 py-2"></td>
            <td className={`px-3 py-2 ${numClass} font-semibold`}>{fmtCurrency(totals.marketValue)}</td>
            <td className={`px-3 py-2 ${numClass} ${pnlColor(totals.totalPL)}`}>{fmtCurrency(totals.totalPL)}</td>
            <td className="px-3 py-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
