import { PORTFOLIO_AS_OF, PORTFOLIO_SUMMARY } from "./portfolio";

/* =========================
   Types
   ========================= */

export type TransparencyTag =
  | "Data"
  | "Compute"
  | "Market"
  | "Journal"
  | "Fix"
  | "Policy";

export type EvidenceItem = {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
};

export type PolicyItem = {
  k: string;
  v: string;
};

export type TransparencyEntry = {
  slug: string;
  date: string;
  title: string;
  detail: string;
  tag: TransparencyTag;

  // what shows on /transparency/[slug]
  content: string[];
  receipts?: { label: string; href: string; kind?: "csv" | "json" | "note" | "other" }[];
};

export type TimelineEvent = {
  date: string;
  title: string;
  detail: string;
  href: string;
  tag: TransparencyTag;
};

/* =========================
   Synced config
   ========================= */

// ✅ single source of truth for the day
export const TRANSPARENCY_AS_OF = PORTFOLIO_AS_OF;

// ✅ sync “Last ingest” + show the same Net Value / Day Change from portfolio
export const TRANSPARENCY_SUMMARY = {
  note:
    "Receipts-first log. This is placeholder data now — later it will be loaded from your backend and remain append-only.",
  href: "/transparency",
  ctaLabel: "View receipts",
  kpis: [
    { label: "Last ingest", value: TRANSPARENCY_AS_OF },
    ...PORTFOLIO_SUMMARY.kpis, // Net value / Day change / Cash
  ],
} as const;

/* =========================
   Evidence + policy
   ========================= */

export const EVIDENCE: readonly EvidenceItem[] = [
  {
    title: "Raw snapshot file",
    body: "Original export / upload kept unchanged (CSV).",
    href: "/transparency",
    linkLabel: "View receipt",
  },
  {
    title: "Normalized holdings JSON",
    body: "Parsed + validated rows used for tables and metrics.",
    href: "/transparency",
    linkLabel: "View JSON",
  },
  {
    title: "Computation summary",
    body: "Weights, exposure, totals, and checks performed for the run.",
    href: "/transparency",
    linkLabel: "View compute",
  },
] as const;

export const POLICY: readonly PolicyItem[] = [
  {
    k: "Append-only",
    v: "Snapshots and receipts are added as new records. Old entries aren’t overwritten.",
  },
  {
    k: "Time-stamped",
    v: "Every metric shows the as-of date so numbers always match a specific snapshot.",
  },
  {
    k: "Separation of UI and data",
    v: "Components stay stable while the data source can switch to backend APIs later.",
  },
] as const;

/* =========================
   Entries (for /transparency/[slug])
   ========================= */

export const TRANSPARENCY_ENTRY_BY_SLUG: Record<string, TransparencyEntry> = {
  "snapshot-uploaded": {
    slug: "snapshot-uploaded",
    date: TRANSPARENCY_AS_OF,
    title: "Snapshot uploaded",
    detail: "Fidelity positions CSV ingested and archived as the source of truth.",
    tag: "Data",
    content: [
      "Raw CSV stored unchanged as the source-of-truth receipt.",
      "Snapshot ID generated and linked to downstream compute steps.",
      "Future: file hash + signature recorded for tamper-evidence.",
    ],
    receipts: [
      { label: "Raw snapshot (CSV)", href: "/transparency", kind: "csv" },
    ],
  },

  "schema-validation": {
    slug: "schema-validation",
    date: TRANSPARENCY_AS_OF,
    title: "Schema validation passed",
    detail: "Columns checked (symbol, qty, avg, price). Missing fields flagged.",
    tag: "Data",
    content: [
      "Verified required columns exist and have valid types.",
      "Rows with missing/invalid fields flagged (future: quarantined).",
      "Normalization step only runs when validation passes.",
    ],
    receipts: [{ label: "Validation report", href: "/transparency", kind: "note" }],
  },

  "holdings-normalized": {
    slug: "holdings-normalized",
    date: TRANSPARENCY_AS_OF,
    title: "Holdings normalized",
    detail: "Rows trimmed, types coerced, and symbols standardized for storage.",
    tag: "Compute",
    content: [
      "Trimmed whitespace, normalized symbols, coerced numeric fields.",
      "Produced normalized JSON used by tables/metrics.",
      "Future: keep raw + normalized artifacts side-by-side.",
    ],
    receipts: [{ label: "Normalized holdings (JSON)", href: "/transparency", kind: "json" }],
  },

  "portfolio-totals": {
    slug: "portfolio-totals",
    date: TRANSPARENCY_AS_OF,
    title: "Portfolio totals computed",
    detail: "Net value, cash, weights, and exposure recalculated from positions.",
    tag: "Compute",
    content: [
      "Calculated net value from positions + cash.",
      "Computed weights and exposure based on totals.",
      "Cross-checks: totals match sum of rows.",
    ],
    receipts: [{ label: "Compute summary", href: "/transparency", kind: "note" }],
  },

  "benchmark-refreshed": {
    slug: "benchmark-refreshed",
    date: TRANSPARENCY_AS_OF,
    title: "Benchmark refreshed",
    detail: "SPY series updated for performance comparison charts.",
    tag: "Market",
    content: [
      "Pulled benchmark prices for the comparison window.",
      "Stored series used by the performance charts.",
      "Future: pin vendor/source + timestamp for reproducibility.",
    ],
  },

  "journal-published": {
    slug: "journal-published",
    date: "2025-12-23",
    title: "Journal entry published",
    detail: "Decision notes tied to the day’s context and timestamped.",
    tag: "Journal",
    content: [
      "Wrote decision notes tied to the snapshot date.",
      "Linked journal to the receipt timeline for auditability.",
    ],
  },

  "ui-ux-pass": {
    slug: "ui-ux-pass",
    date: "2025-12-22",
    title: "UI/UX pass",
    detail: "Spacing + mobile layout tightened to keep everything readable.",
    tag: "Fix",
    content: [
      "Improved spacing, alignment, and mobile readability.",
      "Kept components stable so data sources can swap later.",
    ],
  },
};

/* =========================
   Timeline (derived from entries)
   ========================= */

export const TRANSPARENCY_EVENTS: readonly TimelineEvent[] = Object.values(
  TRANSPARENCY_ENTRY_BY_SLUG
)
  .map((e) => ({
    date: e.date,
    title: e.title,
    detail: e.detail,
    tag: e.tag,
    href: `/transparency/${e.slug}`, // ✅ slug route
  }))
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export function getTransparencyEntry(slug: string): TransparencyEntry | null {
  return TRANSPARENCY_ENTRY_BY_SLUG[slug] ?? null;
}