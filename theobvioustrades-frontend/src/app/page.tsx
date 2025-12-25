// src/app/page.tsx
import Link from "next/link";
import { fetchDashboardLatest } from "../lib/api";
import { Kpi } from "../components/kpi/Kpi";
import { fmtCurrency, fmtPercent, plClass } from "../lib/format";

type Summary = {
  market_value: number;      // total account balance
  cost_value: number;        // invested cost basis (non-cash)
  invested_value: number;    // invested market value (non-cash)
  pl_abs: number;            // unrealized P/L (abs)
  pl_pct: number;            // unrealized P/L % (portfolio-level)
  cash: number;              // SPAXX + pending
};

export default async function HomePage() {
  // New: pull from the clean dashboard-latest endpoint
  const latest = await fetchDashboardLatest();

  // Values from backend
  const total = latest.total_value;
  const investedMarket = latest.non_cash_positions_value;
  const plAbs = latest.unrealized_pnl_total;

  // Cost basis = invested market value - unrealized P/L (same as before)
  const investedCost = investedMarket - plAbs;

  // Portfolio-level unrealized P/L % = P/L ÷ total account balance
  const plPct = total > 0 ? plAbs / total : 0;

  // Cash balance = total - invested market value
  const cash = total - investedMarket;

  const summary: Summary = {
    market_value: total,
    cost_value: investedCost,
    invested_value: investedMarket,
    pl_abs: plAbs,
    pl_pct: plPct,
    cash,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi
          label="Total Account Balance"
          value={fmtCurrency(summary.market_value)}
        />

        <Kpi
          label="Invested Market Value"
          value={fmtCurrency(summary.invested_value)}
        />

        <Kpi
          label="Invested Cost Basis"
          value={fmtCurrency(summary.cost_value)}
        />

        <Kpi
          label="Unrealized P/L (abs)"
          value={
            <span className={plClass(summary.pl_abs)}>
              {fmtCurrency(summary.pl_abs)}
            </span>
          }
        />

        <Kpi
          label="Unrealized P/L (%)"
          value={
            <span className={plClass(summary.pl_pct)}>
              {fmtPercent(summary.pl_pct)}
            </span>
          }
        />

        <Kpi
          label="Cash Balance"
          value={fmtCurrency(summary.cash)}
        />
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          title="Portfolio Performance"
          desc="Live KPIs, equity curve, and holdings."
          href="/portfolio"
          cta="Open Portfolio"
        />
        <Card
          title="Stock Charts"
          desc="TradingView-style research & overlays."
          href="/charts"
          cta="Open Charts"
        />
      </section>
    </div>
  );
}

function Card({
  title,
  desc,
  href,
  cta,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border p-4 flex flex-col">
      <div className="text-lg font-medium">{title}</div>
      <p className="text-sm text-neutral-600 mt-1 flex-1">{desc}</p>
      <div className="mt-3">
        <Link
          href={href}
          className="inline-block rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
