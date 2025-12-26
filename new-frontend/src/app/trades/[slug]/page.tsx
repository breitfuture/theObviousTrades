// src/app/trades/[slug]/page.tsx
import styles from "./page.module.css";

import Header from "../../../componets/Header_bar/Header_bar";
import FeatureCard from "../../../componets/FeatureCard/FeatureCard";
import Footer from "../../../componets/Footer/Footer";

import { BRAND_NAME, LINKS } from "../../../lib/site";
import { getJournalEntry, JOURNAL_ENTRY_AS_OF } from "../../../lib/journalEntries";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function fmtDate(iso: string) {
  const dt = new Date(iso + "T00:00:00");
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

const SECTIONS = [
  { key: "context", label: "Context" },
  { key: "plan", label: "Plan" },
  { key: "execution", label: "Execution" },
  { key: "result", label: "Result" },
  { key: "lessons", label: "Lessons" },
] as const;

function anchor(label: string) {
  return label.toLowerCase().replace(/\s+/g, "-");
}

export default async function TradeEntryPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getJournalEntry(slug);

  if (!entry) {
    return (
      <div className={styles.page}>
        <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />
        <main className={styles.main}>
          <section className={styles.top}>
            <div>
              <h1 className={styles.h1}>Entry not found</h1>
              <p className={styles.lede}>This slug doesn’t exist in your mock dataset yet.</p>
            </div>
            <div className={styles.topActions}>
              <a className={styles.ghostBtn} href="/trades">Back to Journal →</a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />

      <main className={styles.main}>
        <section className={styles.top}>
          <div>
            <div className={styles.breadcrumbs}>
              <a className={styles.crumb} href="/trades">Journal</a>
              <span className={styles.sep}>/</span>
              <span className={styles.crumbActive}>{entry.slug}</span>
            </div>

            <h1 className={styles.h1}>{entry.title}</h1>
            <p className={styles.lede}>{entry.thesis}</p>

            <div className={styles.metaRow}>
              <span className={styles.metaBadge}>{entry.tag}</span>
              <span className={styles.metaText}>{fmtDate(entry.date)}</span>
              <span className={styles.metaDot} />
              <span className={styles.metaText}>As-of: {JOURNAL_ENTRY_AS_OF}</span>
            </div>
          </div>

          <div className={styles.topActions}>
            <a className={styles.ghostBtn} href="/trades">Back to Journal →</a>
          </div>
        </section>

        <section className={styles.layout}>
          <article className={styles.article}>
            <div className={styles.articleTop}>
              <div className={styles.articleTitle}>Write-up</div>
              <div className={styles.articleSub}>Structured so it stays readable + auditable.</div>
            </div>

            <Section id={anchor("Context")} title="Context" items={entry.context} />
            <Section id={anchor("Plan")} title="Plan" items={entry.plan} />
            <Section id={anchor("Execution")} title="Execution" items={entry.execution} />
            <Section id={anchor("Result")} title="Result" items={entry.result} />
            <Section id={anchor("Lessons")} title="Lessons" items={entry.lessons} />
          </article>

          <aside className={styles.side}>
            <div className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <div className={styles.cardTitle}>On this page</div>
                  <div className={styles.cardSub}>Jump to a section</div>
                </div>
                <span className={styles.badge}>toc</span>
              </div>

              <nav className={styles.toc}>
                {SECTIONS.map((s) => (
                  <a key={s.key} className={styles.tocLink} href={`#${anchor(s.label)}`}>
                    <span className={styles.tocDot} />
                    <span className={styles.tocText}>{s.label}</span>
                    <span className={styles.tocArrow}>→</span>
                  </a>
                ))}
              </nav>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <div className={styles.cardTitle}>Receipts</div>
                  <div className={styles.cardSub}>Links to evidence (later: signed URLs)</div>
                </div>
                <span className={styles.badge}>evidence</span>
              </div>

              <div className={styles.receipts}>
                {entry.receipts.map((r) => (
                  <a key={r.label} className={styles.receiptRow} href={r.href}>
                    <span className={styles.receiptLeft}>
                      <span className={styles.receiptLabel}>{r.label}</span>
                      {r.kind ? <span className={styles.receiptKind}>{r.kind}</span> : null}
                    </span>
                    <span className={styles.receiptArrow}>→</span>
                  </a>
                ))}
              </div>

              <div className={styles.smallNote}>
                Keep this panel stable. Later, you’ll load receipts from your backend per entry.
              </div>
            </div>

            <div className={styles.navGrid}>
              <FeatureCard
                title="Transparency"
                body="Receipts-first timeline for snapshots, updates, and runs."
                href="/transparency"
                linkLabel="Open transparency"
              />
              <FeatureCard
                title="Portfolio"
                body="Positions, weights, and cash with an audit-friendly layout."
                href="/portfolio"
                linkLabel="Open portfolio"
              />
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Section({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.h2}>{title}</h2>
        <a className={styles.sectionLink} href={`#${id}`} aria-label={`Link to ${title}`}>
          #
        </a>
      </div>

      <ul className={styles.list}>
        {items.map((x, i) => (
          <li key={i} className={styles.li}>
            {x}
          </li>
        ))}
      </ul>
    </section>
  );
}