// src/lib/journalEntries.ts
import type { JournalTag } from "./journal";

export type ReceiptLink = {
  label: string;
  href: string;
  kind?: "csv" | "json" | "image" | "note" | "other";
};

export type JournalEntryDetail = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  tag: Exclude<JournalTag, "All">;
  thesis: string;

  context: string[];
  plan: string[];
  execution: string[];
  result: string[];
  lessons: string[];

  receipts: ReceiptLink[];
};

export const JOURNAL_ENTRY_AS_OF = "2025-12-26" as const;

/**
 * Keys MUST match the slug used in the URL (/trades/[slug])
 * Example: href "/trades/trim-rules" => key "trim-rules"
 */
export const JOURNAL_ENTRY_BY_SLUG: Record<string, JournalEntryDetail> = {
  "trim-rules": {
    slug: "trim-rules",
    title: "Trim rules + why I reduced exposure",
    date: "2025-12-24",
    tag: "Post-mortem",
    thesis:
      "I trimmed to protect the base case and avoid letting a winner turn into portfolio risk.",

    context: [
      "Position grew beyond target weight due to price movement.",
      "Volatility increased and catalyst timing got less clear.",
      "I wanted to keep exposure but reduce tail risk.",
    ],
    plan: [
      "Trim to return to max weight cap.",
      "Keep a core position for the base case.",
      "Re-add only if the setup resets with clear invalidation.",
    ],
    execution: [
      "Scaled out in 2 tranches instead of one market order.",
      "Moved the stop to a clean invalidation level (not noise).",
      "Logged the decision and updated the snapshot.",
    ],
    result: [
      "Exposure dropped; drawdown risk decreased.",
      "Still participating if the trend continues.",
      "Decision is auditable: timestamps + rules recorded.",
    ],
    lessons: [
      "Trims aren’t about predicting tops — they’re about controlling risk.",
      "Write the rule before the emotion shows up.",
      "If you can’t explain the trim in one sentence, don’t do it.",
    ],
    receipts: [
      { label: "Snapshot CSV (raw)", href: "/transparency", kind: "csv" },
      { label: "Normalized holdings JSON", href: "/transparency", kind: "json" },
      { label: "Run compute summary", href: "/transparency", kind: "note" },
    ],
  },

  "watchlist-week": {
    slug: "watchlist-week",
    title: "Watchlist: setups I’m tracking into next week",
    date: "2025-12-23",
    tag: "Watchlist",
    thesis:
      "A short list of names with clear invalidation levels and what would change my mind.",

    context: [
      "Market is range-bound; I’m prioritizing clean levels.",
      "Only taking trades with defined risk + catalyst or structure.",
    ],
    plan: ["Track 3–5 names, no forcing trades.", "Act only if price reaches my zones."],
    execution: [
      "Built a short list and wrote invalidation first.",
      "Set alerts (not orders) to avoid impulse entries.",
    ],
    result: ["If none trigger, that’s fine — capital preserved.", "Journal stays the source of truth."],
    lessons: ["A watchlist is a plan, not a promise.", "If invalidation isn’t obvious, it’s not a setup."],
    receipts: [{ label: "Watchlist note", href: "/transparency", kind: "note" }],
  },
};

/** This is what /trades/[slug]/page.tsx imports */
export function getJournalEntry(slug: string): JournalEntryDetail | null {
  return JOURNAL_ENTRY_BY_SLUG[slug] ?? null;
}