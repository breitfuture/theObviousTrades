"use client";

import { useState } from "react";
import styles from "./page.module.css";
import Header from "../../componets/Header_bar/Header_bar";
import EquityPreview, { RangeKey } from "../../componets/EquityPreview/EquityPreview";
import FeatureCard from "../../componets/FeatureCard/FeatureCard";
import Footer from "../../componets/Footer/Footer";

// ✅ site-wide shared data
import { BRAND_NAME, LINKS } from "../../lib/site";


export default function PerformancePage() {
  const [range, setRange] = useState<RangeKey>("1Y");

  return (
    <div className={styles.page}>
      <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />

      <main className={styles.main}>
        <section className={styles.top}>
          <div>
            <h1 className={styles.h1}>Performance</h1>
            <p className={styles.lede}>
              Equity curve, drawdowns, and benchmark comparisons. Clear enough to audit.
            </p>
          </div>

          <div className={styles.topActions}>
            <a className={styles.ghostBtn} href="/portfolio">Open portfolio →</a>
          </div>
        </section>

        <section className={styles.chartCard}>
          <div className={styles.chartTop}>
            <div>
              <div className={styles.chartTitle}>Equity curve</div>
              <div className={styles.chartSub}>Updated on close • placeholder series for now</div>
            </div>

            <div className={styles.controls}>
              <div className={styles.range}>
                <button
                  className={`${styles.rangeBtn} ${range === "1M" ? styles.rangeActive : ""}`}
                  type="button"
                  onClick={() => setRange("1M")}
                >
                  1M
                </button>
                <button
                  className={`${styles.rangeBtn} ${range === "3M" ? styles.rangeActive : ""}`}
                  type="button"
                  onClick={() => setRange("3M")}
                >
                  3M
                </button>
                <button
                  className={`${styles.rangeBtn} ${range === "1Y" ? styles.rangeActive : ""}`}
                  type="button"
                  onClick={() => setRange("1Y")}
                >
                  1Y
                </button>
                <button
                  className={`${styles.rangeBtn} ${range === "ALL" ? styles.rangeActive : ""}`}
                  type="button"
                  onClick={() => setRange("ALL")}
                >
                  All
                </button>
              </div>

              <div className={styles.benchmark}>
                <span className={styles.benchmarkLabel}>Benchmark</span>
                <span className={styles.badge}>SPY</span>
              </div>
            </div>
          </div>

          <div className={styles.chartBody}>
            <EquityPreview
              range={range}
              onRangeChange={setRange}
              height={230}
              // showControls={false} // keep off since your buttons are up here
            />
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.k}>CAGR</div>
              <div className={styles.v}>—</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.k}>Max drawdown</div>
              <div className={styles.v}>—</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.k}>vs SPY</div>
              <div className={styles.v}>—</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.k}>Sharpe</div>
              <div className={styles.v}>—</div>
            </div>
          </div>

          <div className={styles.note}>
            This page is built so real backend series can be swapped in later without changing layout.
          </div>
        </section>

        <section className={styles.grid}>
          <FeatureCard
            title="Portfolio"
            body="Holdings, weights, and cash with clean tables that load fast."
            href="/portfolio"
            linkLabel="Open portfolio"
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
            linkLabel="View timeline"
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}