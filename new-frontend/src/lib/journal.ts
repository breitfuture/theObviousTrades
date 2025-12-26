// src/lib/journal.ts
import { JOURNAL_ENTRY_BY_SLUG } from "./journalEntries";

export const JOURNAL_AS_OF = "2025-12-26" as const;

export const JOURNAL_TAGS = [
  "All",
  "Post-mortem",
  "Watchlist",
  "Meta",
  "Setup",
  "Risk",
] as const;

export type JournalTag = (typeof JOURNAL_TAGS)[number];

export type JournalEntry = {
  title: string;
  date: string; // YYYY-MM-DD
  thesis: string;
  href: string; // /trades/<slug>
  tag: Exclude<JournalTag, "All">;
};

// ✅ single source of truth: build list from the slug map
export const JOURNAL_ENTRIES: readonly JournalEntry[] = Object.values(JOURNAL_ENTRY_BY_SLUG)
  .map((e) => ({
    title: e.title,
    date: e.date,
    thesis: e.thesis,
    href: `/trades/${e.slug}`,
    tag: e.tag,
  }))
  .sort((a, b) => (a.date < b.date ? 1 : -1));