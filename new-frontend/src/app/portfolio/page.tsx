// new-frontend/src/app/portfolio/page.tsx
import styles from "./page.module.css";
import Header from "../../componets/Header_bar/Header_bar";
import SnapshotCard from "../../componets/SnapshotCard/SnapshotCard";
import FeatureCard from "../../componets/FeatureCard/FeatureCard";
import TransparencyTimeline from "../../componets/TransparencyTimeline/TransparencyTimeline";
import Footer from "../../componets/Footer/Footer";

// ✅ site-wide shared data
import { BRAND_NAME, LINKS } from "../../lib/site";

// ✅ portfolio-specific data ONLY
import {
  PORTFOLIO_AS_OF,
  PORTFOLIO_SUMMARY,
  POSITIONS,
  ALLOCATION,
  PORTFOLIO_ACTIVITY,
} from "../../lib/portfolio";

// ✅ use the same event type your timeline expects
import type { TimelineEvent } from "../../lib/transparency"; // if you don't have this, see note below

function money(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n === 0 ? "—" : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function PortfolioPage() {
  // ✅ ensure the timeline feed matches the TimelineEvent type
  const events: readonly TimelineEvent[] = PORTFOLIO_ACTIVITY;

  return (
    <div className={styles.page}>
      <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />

      <main className={styles.main}>
        <section className={styles.top}>
          <div>
            <h1 className={styles.h1}>Portfolio</h1>
            <p className={styles.lede}>
              Positions, cash, weights, and exposure with an audit-friendly layout.
            </p>

            <div className={styles.asofRow}>
              <span className={styles.asofDot} />
              <span className={styles.asofText}>As-of: {PORTFOLIO_AS_OF}</span>
            </div>
          </div>

          <div className={styles.topActions}>
            <a className={styles.ghostBtn} href="/performance">
              View performance →
            </a>
          </div>
        </section>

        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryTitle}>Latest snapshot</div>

            <SnapshotCard
              note={PORTFOLIO_SUMMARY.note}
              href={PORTFOLIO_SUMMARY.href}
              kpis={PORTFOLIO_SUMMARY.kpis}
              ctaLabel={PORTFOLIO_SUMMARY.ctaLabel}
            />
          </div>

          <div className={styles.allocationCard}>
            <div className={styles.allocTop}>
              <div>
                <div className={styles.allocTitle}>Allocation</div>
                <div className={styles.allocSub}>Quick breakdown (wire to API later)</div>
              </div>
              <span className={styles.badge}>as-of</span>
            </div>

            <div className={styles.allocGrid}>
              {ALLOCATION.map((x) => (
                <div key={x.label} className={styles.allocItem}>
                  <div className={styles.k}>{x.label}</div>
                  <div className={styles.v}>{x.value}</div>
                </div>
              ))}
            </div>

            <div className={styles.smallNote}>Keep the UI, swap the data source later.</div>
          </div>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.tableTop}>
            <div>
              <div className={styles.tableTitle}>Holdings</div>
              <div className={styles.tableSub}>One row per position. Sort/filter comes next.</div>
            </div>
            <div className={styles.tableActions}>
              <span className={styles.badge}>Positions</span>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th className={styles.num}>Qty</th>
                  <th className={styles.num}>Avg</th>
                  <th className={styles.num}>Price</th>
                  <th className={styles.num}>Value</th>
                  <th className={styles.num}>Weight</th>
                  <th className={styles.num}>Day</th>
                  <th className={styles.num}>P/L</th>
                </tr>
              </thead>
              <tbody>
                {POSITIONS.map((p) => (
                  <tr key={p.symbol}>
                    <td className={styles.sym}>{p.symbol}</td>
                    <td className={styles.name}>{p.name}</td>
                    <td className={styles.num}>{p.qty}</td>
                    <td className={styles.num}>{p.avg ? money(p.avg) : "—"}</td>
                    <td className={styles.num}>{p.price ? money(p.price) : "—"}</td>
                    <td className={styles.num}>{money(p.value)}</td>
                    <td className={styles.num}>{p.weight}</td>
                    <td className={styles.num}>{p.day}</td>
                    <td className={styles.num}>{p.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.tableNote}>
            When you connect pricing, you’ll populate{" "}
            <span className={styles.mono}>price / day / P/L / weight</span>.
          </div>
        </section>

        <section className={styles.sectionDivider}>
          {/* ✅ no more any */}
          <TransparencyTimeline items={events} />
        </section>

        <section className={styles.grid}>
          <FeatureCard
            title="Performance"
            body="Equity curve, drawdowns, and comparisons vs benchmarks."
            href="/performance"
            linkLabel="View performance"
          />
          <FeatureCard
            title="Journal"
            body="Trade ideas, post-mortems, and context tied to dates."
            href="/trades"
            linkLabel="Read journal"
          />
          <FeatureCard
            title="Transparency"
            body="Receipts-style timeline for snapshots, updates, and decisions."
            href="/transparency"
            linkLabel="Open transparency"
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}