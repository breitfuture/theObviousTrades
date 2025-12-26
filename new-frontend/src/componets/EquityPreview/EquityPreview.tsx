"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";


import { EQUITY_SERIES_1Y } from "../../lib/performance";

export type EquityPoint = { d: string; v: number };
export type RangeKey = "1M" | "3M" | "1Y" | "ALL";

function fmt(n: number) {
  return `${(n - 100).toFixed(1)}%`;
}

function parseISO(d: string) {
  // safe parse for YYYY-MM-DD
  return new Date(d + "T00:00:00");
}

function toISO(dt: Date) {
  return dt.toISOString().slice(0, 10);
}

function addDays(dt: Date, days: number) {
  const x = new Date(dt);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * Takes whatever points you have and fills in missing days between them
 * using a simple linear interpolation.
 * This makes 1M/3M/1Y ranges always work even if you only recorded 60 days.
 */
function fillDaily(points: readonly EquityPoint[]): EquityPoint[] {
  if (!points.length) return [];

  // sort by date asc
  const sorted = [...points].sort((a, b) => parseISO(a.d).getTime() - parseISO(b.d).getTime());

  const out: EquityPoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    out.push({ ...cur });

    const next = sorted[i + 1];
    if (!next) break;

    const curDt = parseISO(cur.d);
    const nextDt = parseISO(next.d);

    const gapDays = Math.round((nextDt.getTime() - curDt.getTime()) / (1000 * 60 * 60 * 24));
    if (gapDays <= 1) continue;

    // linear interpolate missing days
    for (let k = 1; k < gapDays; k++) {
      const t = k / gapDays;
      const v = cur.v + (next.v - cur.v) * t;
      out.push({
        d: toISO(addDays(curDt, k)),
        v: Number(v.toFixed(2)),
      });
    }
  }

  return out;
}

function sliceForRange(data: readonly EquityPoint[], range: RangeKey) {
  if (range === "1M") return data.slice(-30);
  if (range === "3M") return data.slice(-90);
  if (range === "1Y") return data.slice(-365);
  return data;
}

function makeTickFormatter(range: RangeKey) {
  // X-axis label style based on range
  return (label: string) => {
    const dt = parseISO(label);

    if (range === "1M") {
      // show day-of-month (Dec 05)
      return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
    }

    if (range === "3M") {
      // show month + day (Nov 12)
      return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
    }

    // 1Y / ALL: show month (Oct, Nov, Dec...)
    return dt.toLocaleDateString(undefined, { month: "short" });
  };
}

function tooltipLabel(label: string) {
  const dt = parseISO(label);
  // always show full date in tooltip
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function EquityPreview({
  height = 190,
  range: rangeProp,
  onRangeChange,
  showControls = false,
}: {
  height?: number;
  range?: RangeKey;
  onRangeChange?: (r: RangeKey) => void;
  showControls?: boolean;
}) {
  const [rangeState, setRangeState] = useState<RangeKey>("1Y");
  const range = rangeProp ?? rangeState;

  const setRange = (r: RangeKey) => {
    onRangeChange?.(r);
    if (rangeProp === undefined) setRangeState(r);
  };

  // 1) fill missing days so ranges always have enough points
  const fullDaily = useMemo(() => fillDaily(EQUITY_SERIES_1Y as EquityPoint[]), []);

  // 2) slice for range
  const data = useMemo(() => sliceForRange(fullDaily, range), [fullDaily, range]);

  // 3) tick formatting depends on range
  const tickFormatter = useMemo(() => makeTickFormatter(range), [range]);

  // 4) choose how many tick labels to show (points still render either way)
  const xInterval =
    range === "1M" ? 4 :       // show ~every 5th label
    range === "3M" ? 12 :      // show ~every 13th label
    "preserveStartEnd";        // auto for 1Y/ALL

  return (
    <div>
      {showControls && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={() => setRange("1M")} style={btn(range === "1M")}>1M</button>
          <button onClick={() => setRange("3M")} style={btn(range === "3M")}>3M</button>
          <button onClick={() => setRange("1Y")} style={btn(range === "1Y")}>1Y</button>
          <button onClick={() => setRange("ALL")} style={btn(range === "ALL")}>All</button>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />

          <XAxis
            dataKey="d"
            axisLine={false}
            tickLine={false}
            interval={xInterval as any}
            minTickGap={18}
            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
            tickFormatter={tickFormatter}
          />

          <Tooltip
            labelFormatter={(label) => tooltipLabel(String(label))}
            contentStyle={{
              background: "rgba(10,12,18,0.92)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              color: "rgba(255,255,255,0.9)",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.65)" }}
            formatter={(value: any) => fmt(Number(value))}
          />

          <Line
            type="monotone"
            dataKey="v"
            stroke="rgba(110,160,255,0.9)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function btn(active: boolean): CSSProperties {
  return {
    appearance: "none",
    border: "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.86)",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    cursor: "pointer",
  };
}