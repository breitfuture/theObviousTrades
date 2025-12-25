"use client";

type Summary = {
  equity?: number;   // total portfolio value
  day_pl?: number;   // today’s P&L
  ytd?: number;      // YTD return (decimal, e.g., 0.1234)
  cash?: number;     // cash balance
  as_of?: string;    // timestamp
  [k: string]: any;  // allow extra fields without breaking
};

const fmtUSD = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

const fmtPct = (n?: number) =>
  typeof n === "number"
    ? `${(n * 100).toFixed(1)}%`
    : "—";

export default function SummaryCards(s: Summary) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <Card label="Total Equity" value={fmtUSD(s.equity)} />
      <Card
        label="Day P&L"
        value={fmtUSD(s.day_pl)}
        tone={typeof s.day_pl === "number" ? (s.day_pl >= 0 ? "pos" : "neg") : "neutral"}
      />
      <Card label="YTD Return" value={fmtPct(s.ytd)} />
      <Card label="Cash" value={fmtUSD(s.cash)} />
    </div>
  );
}

function Card({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "pos" | "neg";
}) {
  const toneCls =
    tone === "pos" ? "text-green-600" : tone === "neg" ? "text-red-600" : "text-neutral-900";
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}
