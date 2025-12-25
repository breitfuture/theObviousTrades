
'use client';

import { useEffect, useState } from "react";
import { getLatestSnapshot } from "../lib/api";

const fmtUSD = (n?: number | null) =>
  (n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function DashboardKpis() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getLatestSnapshot>>>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    getLatestSnapshot().then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!data) return <div className="text-neutral-500">Loading…</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl p-4 shadow">
        <div className="text-sm text-neutral-500">Portfolio (as of {data.snapshot_as_of})</div>
        <div className="text-2xl font-semibold">{fmtUSD(data.portfolio_value)}</div>
      </div>
      <div className="rounded-2xl p-4 shadow">
        <div className="text-sm text-neutral-500">Cash (SPAXX)</div>
        <div className="text-2xl font-semibold">{fmtUSD(data.cash_spaxx)}</div>
      </div>
      <div className="rounded-2xl p-4 shadow">
        <div className="text-sm text-neutral-500">Pending</div>
        <div className="text-2xl font-semibold">{fmtUSD(data.pending_amount)}</div>
      </div>
      <div className="rounded-2xl p-4 shadow">
        <div className="text-sm text-neutral-500">Unrealized P&L</div>
        <div className={`text-2xl font-semibold ${data.unrealized_pnl_total >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {fmtUSD(data.unrealized_pnl_total)}
        </div>
      </div>
    </div>
  );
}