import styles from "./page.module.css";
import Header from "../../../componets/Header_bar/Header_bar";
import FeatureCard from "../../../componets/FeatureCard/FeatureCard";
import Footer from "../../../componets/Footer/Footer";

import { BRAND_NAME, LINKS } from "../../../lib/site";
import { getTransparencyEntry } from "../../../lib/transparency"; // or ../lib/mock/transparency if you chose that

type Props = {
  params: Promise<{ slug: string }>; // ✅ params is a Promise in your runtime
};

export default async function TransparencyEntryPage({ params }: Props) {
  const { slug } = await params; // ✅ unwrap
  const entry = getTransparencyEntry(slug);

  if (!entry) {
    return (
      <div className={styles.page}>
        <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />
        <main className={styles.main}>
          <h1 className={styles.h1}>Not found</h1>
          <p className={styles.p}>No transparency entry exists for: {slug}</p>
          <a className={styles.back} href="/transparency">← Back to transparency</a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header brand={BRAND_NAME} links={LINKS} ctaLabel="View Live" ctaHref="/portfolio" />

      <main className={styles.main}>
        <div className={styles.top}>
          <div className={styles.meta}>
            <div className={styles.date}>{entry.date}</div>
            <div className={styles.tag}>{entry.tag}</div>
          </div>

          <h1 className={styles.h1}>{entry.title}</h1>
          <p className={styles.lede}>{entry.detail}</p>

          <a className={styles.back} href="/transparency">← Back to timeline</a>
        </div>

        <section className={styles.card}>
          <div className={styles.cardTitle}>What happened</div>
          <ul className={styles.list}>
            {entry.content.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        {entry.receipts?.length ? (
          <section className={styles.card}>
            <div className={styles.cardTitle}>Receipts</div>
            <div className={styles.grid}>
              {entry.receipts.map((r) => (
                <FeatureCard
                  key={r.label}
                  title={r.label}
                  body={r.kind ? `Type: ${r.kind}` : "Receipt"}
                  href={r.href}
                  linkLabel="Open"
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}