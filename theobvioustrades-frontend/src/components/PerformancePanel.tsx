// /src/components/PerformancePanel.tsx
'use client';

import * as React from 'react';
// (Recharts imports not needed anymore because EquityCurve handles the chart)

// ✅ relative imports per your preference
import { usePerformanceData } from '../hooks/usePerformance';
import KpiCard from './performance/KpiCard';
import EquityCurve from './performance/EquityCurve';
import { fmtPercent, normalizePct } from '../lib/format';
import { pickPortfolio } from '../lib/api'; // <-- read nested rollups groups

// ---- Minimal UI primitives (kept from your original) ----
function cn(...a: (string | undefined)[]) { return a.filter(Boolean).join(' '); }
function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-2xl border bg-white/50 dark:bg-neutral-900/50', className)}>{children}</div>;
}
function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-4 pt-4', className)}>{children}</div>;
}
function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('font-semibold text-neutral-800 dark:text-neutral-100', className)}>{children}</div>;
}
function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-4 pb-4', className)}>{children}</div>;
}
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800', className)} />;
}

// ---- helpers (reuse your approach; now driven by live series) ----
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00');

type CurvePoint = { date: Date; value: number };
function accumulateCurve<T extends { day: string }>(
  rows: T[],
  dailyRetAccessor: (r: T) => number | null | undefined
): CurvePoint[] {
  const curve: CurvePoint[] = [];
  let acc = 1;
  for (const r of rows) {
    const inc = normalizePct(dailyRetAccessor(r) ?? 0); // safe for 0.0012 or 0.12 style inputs
    acc *= 1 + inc;
    curve.push({ date: fmtDate(r.day), value: acc });
  }
  return curve;
}

function percentChange(a: number, b: number) {
  return a === 0 ? 0 : b / a - 1;
}

function pickSince(length: number, daysBack: number) {
  if (!length) return { fromIdx: 0, toIdx: 0 };
  const toIdx = length - 1;
  const fromIdx = Math.max(0, length - 1 - daysBack);
  return { fromIdx, toIdx };
}

export default function PerformancePanel({ days = 180 }: { days?: number }) {
  // 🔌 Live data from FastAPI
  const { isLoading, isError, error, rollups, series } = usePerformanceData();

  // Loading / error / empty states
  if (isLoading) {
    return (
      <PanelShell>
        <Skeleton className="h-8 w-40" />
        <div className="h-64" />
      </PanelShell>
    );
  }
  if (isError) {
    return (
      <PanelShell>
        <div className="text-sm text-red-600">Error: {error}</div>
      </PanelShell>
    );
  }
  if (!series || series.length === 0) {
    return (
      <PanelShell>
        <div className="text-sm">No data yet. Upload ROTH performance and refresh.</div>
      </PanelShell>
    );
  }

  // Optionally restrict to the last N days for the chart
  const sliced = days ? series.slice(-days) : series;

  // Build cumulative curves (Portfolio vs VOO vs QQQ)
  const pCurve = accumulateCurve(sliced, (r) => r.portfolio_ret);
  const vCurve = accumulateCurve(sliced, (r) => r.voo_ret);
  const qCurve = accumulateCurve(sliced, (r) => r.qqq_ret);

  // KPI windows using cumulative curves
  const spanAll = pickSince(pCurve.length, pCurve.length - 1);
  const spanW = pickSince(pCurve.length, 5);
  const spanM = pickSince(pCurve.length, 21);

  const kpi = (span: { fromIdx: number; toIdx: number }) => {
    const from = span.fromIdx;
    const to = span.toIdx;
    return {
      p: percentChange(pCurve[from].value, pCurve[to].value),
      v: percentChange(vCurve[from].value, vCurve[to].value),
      q: percentChange(qCurve[from].value, qCurve[to].value),
    };
  };

  const kAll = kpi(spanAll);
  const kW = kpi(spanW);
  const kM = kpi(spanM);

  // ----- YTD fallback if backend doesn't send rollups.ytd -----
  let ytdPct = 0;
  if (pCurve.length > 0) {
    const lastIdx = pCurve.length - 1;
    const thisYear = new Date(sliced[lastIdx].day).getFullYear();
    const firstIdxThisYear = sliced.findIndex(r => new Date(r.day).getFullYear() === thisYear);
    if (firstIdxThisYear >= 0) {
      ytdPct = percentChange(pCurve[firstIdxThisYear].value, pCurve[lastIdx].value);
      // If tracking started mid-year (first point of the year is also first point overall),
      // force YTD to equal Since-Start.
      if (firstIdxThisYear === 0) ytdPct = percentChange(pCurve[0].value, pCurve[lastIdx].value);
  }
}

  const sinceStartPct = pickPortfolio(rollups?.since_start);
  const last30dPct    = pickPortfolio(rollups?.last_30d);
  const last7dPct     = pickPortfolio(rollups?.last_7d);
  const ytdRollupPct  = pickPortfolio(rollups?.ytd); // may be undefined if not provided

  // Use ?? so a real 0% from backend isn't replaced by a fallback
  const sinceStartShown = sinceStartPct ?? percentChange(pCurve[0].value, pCurve[pCurve.length - 1].value);
  const last30dShown    = last30dPct    ?? percentChange(pCurve[Math.max(0, pCurve.length - 22)].value, pCurve[pCurve.length - 1].value);
  const last7dShown     = last7dPct     ?? percentChange(pCurve[Math.max(0, pCurve.length - 6)].value,  pCurve[pCurve.length - 1].value);
  const ytdShown        = ytdRollupPct  ?? ytdPct;

  const last = sliced[sliced.length - 1];

  return (
    <PanelShell>
      {/* KPI Row — now correctly reading nested rollups + computed YTD fallback */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Since Start" value={sinceStartShown} />
        <KpiCard label="~1 Month"   value={last30dShown} />
        <KpiCard label="~1 Week"    value={last7dShown} />
        <KpiCard label="YTD"        value={ytdShown} />
      </div>


      {/* Live chart from /series */}
      <EquityCurve series={series} days={days} />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Latest Daily Moves</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border">
              <div className="text-neutral-500">Date</div>
              <div className="font-medium">{last.day}</div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border">
              <div className="text-neutral-500">Portfolio (1d)</div>
              <div className="font-medium">{fmtPercent(last.portfolio_ret)}</div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border">
              <div className="text-neutral-500">VOO (1d)</div>
              <div className="font-medium">{fmtPercent(last.voo_ret)}</div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border">
              <div className="text-neutral-500">QQQ (1d)</div>
              <div className="font-medium">{fmtPercent(last.qqq_ret)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return <div className="w-full space-y-4">{children}</div>;
}
