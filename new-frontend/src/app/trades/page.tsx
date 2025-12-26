"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

import Header from "../../componets/Header_bar/Header_bar";
import JournalEntries from "../../componets/JournalEntries/JournalEntries";
import FeatureCard from "../../componets/FeatureCard/FeatureCard";
import Footer from "../../componets/Footer/Footer";

import { BRAND_NAME, LINKS } from "../../lib/site";
import { JOURNAL_AS_OF, JOURNAL_ENTRIES, JOURNAL_TAGS, type JournalEntry } from "../../lib/journal";

type JournalTag = (typeof JOURNAL_TAGS)[number];

export default function JournalPage() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<JournalTag>("All");

  const filtered: readonly JournalEntry[] = useMemo(() => {
    const query = q.trim().toLowerCase();

    // start from a normal array copy (so sort is safe/deterministic)
    let out: JournalEntry[] = [...JOURNAL_ENTRIES];

    // ✅ tag filter with proper TS narrowing (no `any`)
    if (tag !== "All") {
      out = out.filter((e) => e.tag === tag);
    }

    // ✅ search filter
    if (query) {
      out = out.filter((e) => {
        return (
          e.title.toLowerCase().includes(query) ||
          e.thesis.toLowerCase().includes(query) ||
          e.tag.toLowerCase().includes(query) ||
          e.date.includes(query)
        );
      });
    }

    // ✅ newest first
    out.sort((a, b) => (a.date < b.date ? 1 : -1));

    return out;
  }, [q, tag]);

  return (
    <div className={styles.page}>
      <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />

      <main className={styles.main}>
        <section className={styles.top}>
          <div>
            <h1 className={styles.h1}>Journal</h1>
            <p className={styles.lede}>
              Decision notes tied to dates. Built for audit: what you did, why you did it, and what changed.
            </p>

            <div className={styles.asofRow}>
              <span className={styles.asofDot} />
              <span className={styles.asofText}>As-of: {JOURNAL_AS_OF}</span>
            </div>
          </div>

          <div className={styles.topActions}>
            <a className={styles.ghostBtn} href="/portfolio">
              Open portfolio →
            </a>
          </div>
        </section>

        <section className={styles.controlsCard}>
          <div className={styles.controlsTop}>
            <div>
              <div className={styles.controlsTitle}>Browse entries</div>
              <div className={styles.controlsSub}>Search + filter. Later this becomes API-backed.</div>
            </div>
            <span className={styles.badge}>{filtered.length} shown</span>
          </div>

          <div className={styles.controlsRow}>
            <input
              className={styles.search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, thesis, tag, or date…"
            />

            <div className={styles.tags}>
              {JOURNAL_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`${styles.tagBtn} ${tag === t ? styles.tagActive : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.entries}>
          {/* ✅ no `any` */}
          <JournalEntries entries={filtered} />
        </section>

        <section className={styles.navGrid}>
          <FeatureCard
            title="Performance"
            body="Equity curve, drawdowns, and comparisons vs benchmarks."
            href="/performance"
            linkLabel="View performance"
          />
          <FeatureCard
            title="Portfolio"
            body="Positions, weights, and cash with a clean audit-friendly layout."
            href="/portfolio"
            linkLabel="Open portfolio"
          />
          <FeatureCard
            title="Transparency"
            body="Receipts-first timeline for snapshots, updates, and runs."
            href="/transparency"
            linkLabel="Open transparency"
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}