import styles from "./page.module.css";

export type TimelineItem = {
  date: string;
  title: string;
  detail?: string;
  href?: string;
  tag?: string;
};

export default function TransparencyTimeline({
  title = "Transparency timeline",
  subtitle = "Receipts you can click through.",
  items,
}: {
  title?: string;
  subtitle?: string;
  items: TimelineItem[];
}) {
  return (
    <section className={styles.section}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.h2}>{title}</h2>
          <p className={styles.p}>{subtitle}</p>
        </div>
        <a className={styles.viewAll} href="/transparency">
          View all →
        </a>
      </div>

      <div className={styles.list}>
        {items.map((it, idx) => {
          const Row = (
            <div className={styles.row}>
              <div className={styles.left}>
                <div className={styles.date}>{it.date}</div>
                <div className={styles.dot} aria-hidden="true" />
                {idx !== items.length - 1 ? <div className={styles.line} aria-hidden="true" /> : null}
              </div>

              <div className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardTitle}>{it.title}</div>
                  {it.tag ? <div className={styles.tag}>{it.tag}</div> : null}
                </div>
                {it.detail ? <div className={styles.detail}>{it.detail}</div> : null}
                {it.href ? <div className={styles.link}>Open →</div> : null}
              </div>
            </div>
          );

          return it.href ? (
            <a key={`${it.date}-${it.title}`} className={styles.a} href={it.href}>
              {Row}
            </a>
          ) : (
            <div key={`${it.date}-${it.title}`} className={styles.wrap}>
              {Row}
            </div>
          );
        })}
      </div>
    </section>
  );
}