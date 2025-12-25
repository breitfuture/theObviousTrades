// src/app/portfolio/page.tsx
import ClientPerformancePanel from "../../components/performance/ClientPerformancePanel";
import {
  api,
  fetchDashboardLatest,
  fetchPositionsAsOf,
  fetchSeries,
  type DashboardLatest,
  type HistoryPositions,
} from "../../lib/api";

/* ---------- Types for summary (same as Dashboard) ---------- */
type Summary = {
  market_value: number;   // total account balance
  cost_value: number;     // invested cost basis
  invested_value: number; // invested market value (non-cash)
  pl_abs: number;         // unrealized P/L dollars
  pl_pct: number;         // unrealized P/L as a fraction (e.g. -0.0283)
  cash: number;           // SPAXX + PENDING (same logic as dashboard)
};

/* ---------- Small helpers ---------- */
const fmtCurrency = (v: number | null | undefined) =>
  ((v ?? 0) as number).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const fmtPercent = (v: number | null | undefined, digits = 2) => {
  const n = Number(v ?? 0);
  const dec = n > 1 ? n / 100 : n;
  return `${(dec * 100).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
};

const plClass = (v: number | null | undefined) =>
  v == null || isNaN(v)
    ? "text-neutral-600"
    : v > 0
    ? "text-emerald-600"
    : v < 0
    ? "text-rose-600"
    : "text-neutral-600";

/* ---------- Tiny SVG Line Chart (kept) ---------- */
type EquityPoint = { day: string; portfolio_value?: number | null };

function LineChart({
  points,
  height = 160,
  className = "",
}: {
  points: EquityPoint[];
  height?: number;
  className?: string;
}) {
  const width = 640;

  if (!points?.length) {
    return <div className="text-sm text-neutral-500">No data</div>;
  }

  const ys = points.map((p) => Number(p.portfolio_value ?? 0));
  const xs = points.map((_, i) => i);

  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padY = (maxY - minY) * 0.1 || 1;
  const y0 = minY - padY;
  const y1 = maxY + padY;

  const xToPx = (x: number) =>
    (x / Math.max(xs.length - 1, 1)) * width;
  const yToPx = (y: number) =>
    height - ((y - y0) / (y1 - y0)) * height;

  const d = points
    .map((p, i) =>
      `${i === 0 ? "M" : "L"}${xToPx(i).toFixed(2)},${yToPx(
        Number(p.portfolio_value ?? 0)
      ).toFixed(2)}`
    )
    .join(" ");

  const start = points[0];
  const end = points[points.length - 1];
  const s = Number(start.portfolio_value ?? 0);
  const e = Number(end.portfolio_value ?? 0);
  const change = s ? (e - s) / s : 0;
  const stroke = change >= 0 ? "#059669" : "#e11d48";

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <svg width={width} height={height} className="block">
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${d} L ${width},${height} L 0,${height} Z`}
          fill="url(#area)"
          stroke="none"
        />
        <path d={d} fill="none" stroke={stroke} strokeWidth={2} />
      </svg>
      <div className="flex items-center gap-2 text-sm mt-2">
        <span className="font-medium">
          {new Date(start.day).toLocaleDateString()} →{" "}
          {new Date(end.day).toLocaleDateString()}
        </span>
        <span className={`${plClass(change)} font-semibold`}>
          {fmtPercent(change)}
        </span>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default async function PortfolioPage() {
  // 1) Latest snapshot totals (built from positions_fidelity)
  const dash: DashboardLatest = await fetchDashboardLatest();

  // 2) Positions for the same snapshot
  const hist: HistoryPositions = await fetchPositionsAsOf(dash.snapshot_as_of);

  // 3) Equity series (performance_daily)
  const series = await fetchSeries({ days: 180 });
  const equity: EquityPoint[] = series.map((r) => ({
    day: r.day,
    portfolio_value: r.portfolio_value ?? null,
  }));

  // 4) Summary (same endpoint the Dashboard uses)
  const summary = await api<Summary>("/api/portfolio/summary");

  // ---------- Clean KPIs (match Dashboard) ----------
  const totalAccountBalance = summary.market_value;
  const cashBalance = summary.cash;
  const investedMarketValue = summary.invested_value;
  const investedCostBasis = summary.cost_value;
  const plAbs = summary.pl_abs;
  const plPct = summary.pl_pct;

  return (
    <main className="p-6 space-y-8">
      <header className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="text-sm text-neutral-500">
          As of {dash.snapshot_as_of}
        </p>
      </header>

      {/* KPIs (aligned with dashboard + no separate Pending card) */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPI
          label="Total Account Balance"
          value={fmtCurrency(totalAccountBalance)}
        />
        <KPI
          label="Invested Market Value"
          value={fmtCurrency(investedMarketValue)}
        />
        <KPI
          label="Invested Cost Basis"
          value={fmtCurrency(investedCostBasis)}
        />
        <KPI
          label="Unrealized P/L (abs)"
          value={
            <span className={plClass(plAbs)}>
              {fmtCurrency(plAbs)}
            </span>
          }
        />
        <KPI
          label="Unrealized P/L (%)"
          value={
            <span className={plClass(plAbs)}>
              {fmtPercent(plPct)}
            </span>
          }
        />
        <KPI label="Cash Balance" value={fmtCurrency(cashBalance)} />
      </section>

      {/* Equity curve */}
      <section className="max-w-6xl mx-auto rounded-2xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Equity Curve</h2>
          <span className="text-xs text-neutral-500">
            {equity.length} pts
          </span>
        </div>
        <LineChart points={equity} />
      </section>

      {/* ROTH vs VOO vs QQQ normalized curves + KPIs (existing component) */}
      <section className="max-w-6xl mx-auto">
        <ClientPerformancePanel days={180} />
      </section>

      {/* Positions (same snapshot) */}
      <section className="max-w-6xl mx-auto rounded-2xl border">
        <div className="p-4">
          <h2 className="text-lg font-medium">Positions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-t border-b bg-neutral-50 text-left">
                <Th>Ticker</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Avg Cost</Th>
                <Th className="text-right">Last</Th>
                <Th className="text-right">Market Value</Th>
                <Th className="text-right">Unrlzd P/L</Th>
                <Th className="text-right">Unrlzd P/L %</Th>
              </tr>
            </thead>
            <tbody>
              {hist.positions.map((p, i) => (
                <tr key={`${p.symbol}-${i}`} className="border-b">
                  <Td>{p.symbol}</Td>
                  <Td align="right">
                    {(p.qty ?? 0).toLocaleString()}
                  </Td>
                  <Td align="right">
                    {p.avg_cost == null
                      ? "—"
                      : fmtCurrency(p.avg_cost)}
                  </Td>
                  <Td align="right">
                    {p.price == null
                      ? "—"
                      : p.price.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                  </Td>
                  <Td align="right">
                    {fmtCurrency(p.market_value)}
                  </Td>
                  <Td align="right">
                    <span className={plClass(p.pl_abs)}>
                      {fmtCurrency(p.pl_abs)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className={plClass(p.pl_abs)}>
                      {fmtPercent(p.pl_pct ?? 0)}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

/* ---------- Presentational bits ---------- */
function KPI({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2 font-medium text-neutral-700 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left" as const,
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
