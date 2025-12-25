import styles from "./page.module.css";
import Header from "../../componets/Header_bar/Header_bar";
import EquityPreview from "../../componets/EquityPreview/EquityPreview";
import FeatureCard from "../../componets/FeatureCard/FeatureCard";
import SnapshotCard from "../../componets/SnapshotCard/SnapshotCard";
import TransparencyTimeline from "../../componets/TransparencyTimeline/TransparencyTimeline";
import JournalEntries from "../../componets/JournalEntries/JournalEntries";
import Footer from "../../componets/Footer/Footer";

const BRAND_NAME = "the obvious trades";

const LINKS = [
  { label: "Portfolio", href: "/portfolio" },
  { label: "Performance", href: "/performance" },
  { label: "Journal", href: "/trades" },
  { label: "Transparency", href: "/transparency" },
];

const JOURNAL = [
  {
    title: "Trim rules + why I reduced exposure",
    date: "2025-12-24",
    thesis: "I cut size to protect the base case and avoid letting a winner become a risk.",
    href: "/trades/trim-rules",
    tag: "Post-mortem",
  },
  {
    title: "Watchlist: setups I’m tracking into next week",
    date: "2025-12-23",
    thesis: "A short list of names with invalidation levels and what would change my mind.",
    href: "/trades/watchlist-week",
    tag: "Watchlist",
  },
  {
    title: "Why this system exists",
    date: "2025-12-20",
    thesis: "If it isn’t timestamped and written down, it didn’t happen.",
    href: "/trades/why-this-exists",
    tag: "Meta",
  },
];

const TIMELINE = [
  {
    date: "2025-12-24",
    title: "Snapshot uploaded",
    detail: "Fidelity positions CSV ingested and normalized.",
    href: "/transparency",
    tag: "Data",
  },
  {
    date: "2025-12-24",
    title: "Portfolio totals computed",
    detail: "Net value, cash, weights, and exposure recalculated.",
    href: "/portfolio",
    tag: "Compute",
  },
  {
    date: "2025-12-24",
    title: "Benchmark updated",
    detail: "SPY series refreshed for comparison charts.",
    href: "/performance",
    tag: "Market",
  },
  {
    date: "2025-12-23",
    title: "Journal entry published",
    detail: "Decision notes tied to the day’s context.",
    href: "/trades",
    tag: "Journal",
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />

      {/* LANDING TOP PAGES WITH GRAPG AND BUTTONS */}
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

            <div className={styles.note}>
              Data is time-stamped. History stays visible.
            </div>
          </div>
        </section>

        {/* ADITIONAL INFO AREA */}
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
              note="Hook this to your API later. For now it’s a placeholder that sets the vibe."
              href="/portfolio"
              kpis={[
                { label: "Net value", value: "$—" },
                { label: "Day change", value: "—" },
                { label: "Cash", value: "—" },
              ]}
              ctaLabel="View Live"
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