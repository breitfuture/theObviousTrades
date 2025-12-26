"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const data = [
  { d: "Jan", v: 100 },
  { d: "Feb", v: 104 },
  { d: "Mar", v: 102 },
  { d: "Apr", v: 110 },
  { d: "May", v: 108 },
  { d: "Jun", v: 116 },
  { d: "Jul", v: 121 },
  { d: "Aug", v: 119 },
  { d: "Sep", v: 128 },
  { d: "Oct", v: 133 },
  { d: "Nov", v: 137 },
  { d: "Dec", v: 142 },
];

function fmt(n: number) {
  return `${(n - 100).toFixed(1)}%`;
}

export default function EquityPreview() {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="d"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
        />
        <Tooltip
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
  );
}