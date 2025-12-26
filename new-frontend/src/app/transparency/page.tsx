// new-frontend/src/app/transparency/page.tsx
import styles from "./page.module.css";
import Header from "../../componets/Header_bar/Header_bar";
import FeatureCard from "../../componets/FeatureCard/FeatureCard";
import SnapshotCard from "../../componets/SnapshotCard/SnapshotCard";
import TransparencyTimeline from "../../componets/TransparencyTimeline/TransparencyTimeline";
import Footer from "../../componets/Footer/Footer";

// ✅ site-wide shared data
import { BRAND_NAME, LINKS } from "../../lib/site";

// ✅ transparency-specific data ONLY (+ types)
import {
  TRANSPARENCY_AS_OF,
  TRANSPARENCY_SUMMARY,
  EVIDENCE,
  TRANSPARENCY_EVENTS,
  POLICY,
  type TimelineEvent,
} from "../../lib/transparency";

export default function TransparencyPage() {
  // ✅ ensure correct type for the timeline component
  const events: readonly TimelineEvent[] = TRANSPARENCY_EVENTS;

  return (
    <div className={styles.page}>
      <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />

      <main className={styles.main}>
        <section className={styles.top}>
          <div>
            <h1 className={styles.h1}>Transparency</h1>
            <p className={styles.lede}>
              Receipts-first. Every change is time-stamped, so the history stays auditable.
            </p>

            <div className={styles.asofRow}>
              <span className={styles.asofDot} />
              <span className={styles.asofText}>As-of: {TRANSPARENCY_AS_OF}</span>
            </div>
          </div>

          <div className={styles.topActions}>
            <a className={styles.ghostBtn} href="/portfolio">Open portfolio →</a>
          </div>
        </section>

        <section className={styles.summaryGrid}>
          <div className={styles.snapWrap}>
            <SnapshotCard
              note={TRANSPARENCY_SUMMARY.note}
              href={TRANSPARENCY_SUMMARY.href}
              kpis={TRANSPARENCY_SUMMARY.kpis}
              ctaLabel={TRANSPARENCY_SUMMARY.ctaLabel}
            />
          </div>

          <div className={styles.policyCard}>
            <div className={styles.policyTop}>
              <div>
                <div className={styles.policyTitle}>Audit rules</div>
                <div className={styles.policySub}>How this stays trustworthy over time</div>
              </div>
              <span className={styles.badge}>policy</span>
            </div>

            <div className={styles.policyGrid}>
              {POLICY.map((x) => (
                <div key={x.k} className={styles.policyItem}>
                  <div className={styles.k}>{x.k}</div>
                  <div className={styles.v}>{x.v}</div>
                </div>
              ))}
            </div>

            <div className={styles.smallNote}>Keep the UI. Swap the data source later.</div>
          </div>
        </section>

        <section className={styles.sectionDivider}>
          <TransparencyTimeline items={events} />
        </section>

        <section className={styles.evidence}>
          <div className={styles.evidenceTop}>
            <div>
              <div className={styles.evidenceTitle}>Evidence</div>
              <div className={styles.evidenceSub}>
                Links will later point to real files / signed receipts / API views.
              </div>
            </div>
            <span className={styles.badge}>receipts</span>
          </div>

          <div className={styles.grid}>
            {EVIDENCE.map((c) => (
              <FeatureCard
                key={c.title}
                title={c.title}
                body={c.body}
                href={c.href}
                linkLabel={c.linkLabel}
              />
            ))}
          </div>
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
            title="Journal"
            body="Decision notes tied to dates so you can audit your thinking."
            href="/trades"
            linkLabel="Read journal"
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}