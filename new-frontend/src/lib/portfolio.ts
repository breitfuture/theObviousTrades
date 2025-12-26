// src/lib/mock/portfolio.ts
import type { PositionRow } from "./types";

/* =========================
   Config
   ========================= */

export const PORTFOLIO_AS_OF = "2025-12-24" as const;

/* =========================
   Helpers
   ========================= */

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pct(n: number) {
  return `${n.toFixed(2)}%`;
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/* =========================
   Base universe
   ========================= */

const UNIVERSE = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "SPY", name: "SPDR S&P 500" },
];

/* =========================
   Generate positions
   ========================= */

const rawPositions: PositionRow[] = UNIVERSE.map((u) => {
  const qty = Math.floor(rand(5, 40));
  const avg = rand(80, 350);
  const price = avg * rand(0.9, 1.25);

  const value = qty * price;
  const pnlDollar = (price - avg) * qty;
  const pnlPct = ((price - avg) / avg) * 100;
  const dayMove = rand(-2.2, 2.2);

  return {
    symbol: u.symbol,
    name: u.name,
    qty,
    avg: Number(avg.toFixed(2)),
    price: Number(price.toFixed(2)),
    value: Number(value.toFixed(2)),
    weight: "—", // filled later
    day: pct(dayMove),
    pnl: `${pnlDollar >= 0 ? "+" : ""}${money(pnlDollar)}`,
  };
});

/* =========================
   Cash position
   ========================= */

const CASH_VALUE = 18420.55;

rawPositions.push({
  symbol: "CASH",
  name: "Cash",
  qty: 1,
  avg: 0,
  price: 0,
  value: CASH_VALUE,
  weight: "—",
  day: "—",
  pnl: "—",
});

/* =========================
   Totals + weights
   ========================= */

const NET_VALUE = rawPositions.reduce((a, b) => a + b.value, 0);

export const POSITIONS: PositionRow[] = rawPositions.map((p) => ({
  ...p,
  weight: pct((p.value / NET_VALUE) * 100),
}));

/* =========================
   Portfolio summary
   ========================= */

const DAY_CHANGE_PCT = rand(-1.4, 1.8);
const DAY_CHANGE_VALUE = NET_VALUE * (DAY_CHANGE_PCT / 100);

export const PORTFOLIO_SUMMARY = {
  note: "This snapshot is time-stamped. Later it will come from /portfolio/summary.",
  href: "/portfolio",
  ctaLabel: "View Live",
  kpis: [
    { label: "Net value", value: money(NET_VALUE) },
    {
      label: "Day change",
      value: `${DAY_CHANGE_PCT >= 0 ? "+" : ""}${pct(DAY_CHANGE_PCT)} (${money(DAY_CHANGE_VALUE)})`,
    },
    { label: "Cash", value: money(CASH_VALUE) },
  ],
} as const;

/* =========================
   Allocation
   ========================= */

export const ALLOCATION = [
  {
    label: "Large cap",
    value: pct(62.3),
  },
  {
    label: "Index",
    value: pct(21.7),
  },
  {
    label: "Cash",
    value: pct((CASH_VALUE / NET_VALUE) * 100),
  },
  {
    label: "Exposure",
    value: pct(100 - (CASH_VALUE / NET_VALUE) * 100),
  },
] as const;

/* =========================
   Activity log
   ========================= */

export const PORTFOLIO_ACTIVITY = [
  {
    date: PORTFOLIO_AS_OF,
    title: "Positions snapshot ingested",
    detail: "Holdings, pricing, and cash normalized.",
    href: "/transparency",
    tag: "Data",
  },
  {
    date: PORTFOLIO_AS_OF,
    title: "Weights & exposure computed",
    detail: "Position weights and net exposure recalculated.",
    href: "/portfolio",
    tag: "Compute",
  },
  {
    date: PORTFOLIO_AS_OF,
    title: "Daily P/L marked",
    detail: "Market prices applied for end-of-day snapshot.",
    href: "/portfolio",
    tag: "Market",
  },
] as const;