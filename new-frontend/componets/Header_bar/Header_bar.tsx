"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

export type HeaderLink = {
  label: string;
  href: string;
};

export default function Header({
  brand = "the obvious trades",
  links,
  ctaLabel = "View Live",
  ctaHref = "/portfolio",
}: {
  brand?: string;
  links: HeaderLink[];
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 980) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/">
        <span className={styles.wordmark}>The Obvious Trades</span>
        </a>

        <nav className={styles.nav}>
          <div className={styles.links}>
            {links.map((l) => (
              <a key={l.href} className={styles.navLink} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>

          <div className={styles.actions}>
            <a className={styles.cta} href={ctaHref}>
              {ctaLabel}
            </a>

            <button
              type="button"
              className={styles.menuBtn}
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className={styles.menuBars} />
            </button>
          </div>
        </nav>
      </div>

      <div className={`${styles.mobileWrap} ${open ? styles.mobileOpen : ""}`}>
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
        <div className={styles.mobileMenu}>
          {links.map((l) => (
            <a
              key={l.href}
              className={styles.mobileLink}
              href={l.href}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a className={styles.mobileCta} href={ctaHref} onClick={() => setOpen(false)}>
            {ctaLabel}
          </a>
        </div>
      </div>
    </header>
  );
}