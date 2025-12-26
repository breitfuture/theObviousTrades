// new-frontend/src/app/page.tsx (or src/app/page.tsx)
// (keep the path the same as your project)

import styles from "./page.module.css";
import Header from "../componets/Header_bar/Header_bar";
import EquityPreview from "../componets/EquityPreview/EquityPreview";
import FeatureCard from "../componets/FeatureCard/FeatureCard";
import SnapshotCard from "../componets/SnapshotCard/SnapshotCard";
import TransparencyTimeline from "../componets/TransparencyTimeline/TransparencyTimeline";
import JournalEntries from "../componets/JournalEntries/JournalEntries";
import Footer from "../componets/Footer/Footer";

// ✅ shared site-wide data (header/nav)
import { BRAND_NAME, LINKS } from "../lib/site";

// ✅ home-only feeds
import { JOURNAL, TIMELINE } from "../lib/home";

// ✅ SAME SOURCE as the Portfolio page
import { PORTFOLIO_SUMMARY } from "../lib/portfolio";

export default function Home() {
  // ✅ keep naming consistent with how your UI thinks about it
  const SNAPSHOT = PORTFOLIO_SUMMARY;

  return (
    <div className={styles.page}>
      <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.left}>
            <div className={styles.pills}>
              <span className={styles.pill}>Daily snapshots</span>
              <span className={styles.pill}>Receipts-first</span>
              <span className={styles.pill}>Tracked over time</span>
            </div>

            <h1 className={styles.title}>
              Transparent portfolio tracking and documented decisions.
            </h1>

            <p className={styles.subtitle}>
              Real positions → clean dashboards, performance history, and a journal you can audit.
            </p>

            <div className={styles.actions}>
              <a className={styles.primary} href="/portfolio">Explore Dashboard</a>
              <a className={styles.secondary} href="/commentary">Read Commentary</a>
            </div>

            <div className={styles.meta}>
              <span className={styles.dot} />
              <span>As-of dates shown on every metric</span>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.chartCard}>
              <div className={styles.chartTop}>
                <div className={styles.chartTitle}>Equity curve</div>
                <div className={styles.chartTag}>preview</div>
              </div>

              <div className={styles.chartBody}>
                <EquityPreview />
              </div>

              <div className={styles.chartBottom}>
                <div className={styles.kv}>
                  <div className={styles.k}>Range</div>
                  <div className={styles.v}>1Y</div>
                </div>
                <div className={styles.kv}>
                  <div className={styles.k}>Benchmark</div>
                  <div className={styles.v}>SPY</div>
                </div>
                <div className={styles.kv}>
                  <div className={styles.k}>Update</div>
                  <div className={styles.v}>latest close</div>
                </div>
              </div>
            </div>

            <div className={styles.note}>Data is time-stamped. History stays visible.</div>
          </div>
        </section>

        <div className={styles.grid}>
          <FeatureCard
            title="Portfolio"
            body="Positions, cash, weights, and exposure with clean tables that load fast."
            href="/portfolio"
            linkLabel="Open portfolio"
          />

          <FeatureCard
            title="Performance"
            body="Equity curve, drawdowns, and comparisons vs benchmarks over time."
            href="/performance"
            linkLabel="View performance"
          />

          <FeatureCard
            title="Journal"
            body="Trade ideas and post-mortems tied to dates so you can audit decisions."
            href="/trades"
            linkLabel="Read journal"
          />

          <div className={styles.cardAltWrap}>
            <SnapshotCard
              note={SNAPSHOT.note}
              href={SNAPSHOT.href}
              kpis={SNAPSHOT.kpis}
              ctaLabel={SNAPSHOT.ctaLabel}
            />
          </div>
        </div>

        <div className={styles.sectionDivider}>
          <JournalEntries entries={JOURNAL} />
          <TransparencyTimeline items={TIMELINE} />
        </div>
      </main>

      <Footer />
    </div>
  );
}