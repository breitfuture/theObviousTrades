import styles from "./page.module.css";

export type JournalEntry = {
  title: string;
  date: string;
  thesis: string;
  href: string;
  tag?: string;
};

export default function JournalEntries({
  title = "Recent journal entries",
  subtitle = "Short, dated, and tied to decisions.",
  entries,
}: {
  title?: string;
  subtitle?: string;
  entries: JournalEntry[];
}) {
  return (
    <section className={styles.section}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.h2}>{title}</h2>
          <p className={styles.p}>{subtitle}</p>
        </div>
        <a className={styles.viewAll} href="/trades">
          View journal →
        </a>
      </div>

      <div className={styles.grid}>
        {entries.map((e) => (
          <a key={e.href} className={styles.card} href={e.href}>
            <div className={styles.cardTop}>
              <div className={styles.date}>{e.date}</div>
              {e.tag ? <div className={styles.tag}>{e.tag}</div> : null}
            </div>

            <div className={styles.title}>{e.title}</div>
            <div className={styles.thesis}>{e.thesis}</div>

            <div className={styles.open}>Open →</div>
          </a>
        ))}
      </div>
    </section>
  );
}