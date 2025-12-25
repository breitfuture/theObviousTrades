"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

type Pt = { date: string; equity: number };

const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const OPTIONS = [30, 90, 180, 365] as const;

export default function PerformanceChart() {
  const [windowDays, setWindowDays] = useState<(typeof OPTIONS)[number]>(180);
  const [data, setData] = useState<Pt[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${base}/api/portfolio/equity_curve?window=${windowDays}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const pts: Pt[] = Array.isArray(json) ? json : [];
        pts.sort((a, b) => a.date.localeCompare(b.date));
        if (!cancelled) setData(pts);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load equity curve");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [windowDays]);

  const fmtUSD = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const sorted = useMemo(() => [...data].sort((a, b) => a.date.localeCompare(b.date)), [data]);

  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Performance</h3>
        <div className="flex gap-2">
          {OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setWindowDays(opt)}
              className={`rounded px-2 py-1 text-xs border ${windowDays === opt ? "bg-black text-white" : "bg-white"}`}
              aria-pressed={windowDays === opt}
            >
              {opt}d
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-sm text-neutral-500">Loading equity curve…</div>}
      {err && <div className="text-sm text-rose-600">Error: {err}</div>}
      {!loading && !err && sorted.length === 0 && (
        <div className="text-sm text-neutral-500">No equity data.</div>
      )}

      {!loading && !err && sorted.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sorted} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                minTickGap={24}
                tickFormatter={(d: string) => new Date(d).toLocaleDateString()}
              />
              <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v: number) => fmtUSD(v)} />
              <Tooltip
                formatter={(v: number) => fmtUSD(v)}
                labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
              />
              <Line type="monotone" dataKey="equity" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
