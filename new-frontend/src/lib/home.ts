// src/lib/home.ts
import type { JournalEntry } from "./journal";
import { JOURNAL_ENTRIES } from "./journal";

import type { TimelineEvent } from "./transparency";
import { PORTFOLIO_ACTIVITY } from "./portfolio";

// top 3 newest on home
export const JOURNAL: readonly JournalEntry[] = JOURNAL_ENTRIES.slice(0, 3);

// top 3 timeline events on home
export const TIMELINE: readonly TimelineEvent[] = PORTFOLIO_ACTIVITY.slice(0, 3);