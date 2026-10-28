import Image from "next/image";
import Link from "next/link";
import type { FooterContent } from "@/lib/home-content";
import styles from "./site.module.css";

export function SiteFooter({ content }: { content: FooterContent }) {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerGrid}`}>
        <div className={styles.footerBrand}>
          <Image
            src="/brand/health-arabia-logo.png"
            alt="Health Arabia"
            width={272}
            height={48}
            className={styles.footerLogo}
          />
          <p className={styles.footerTagline}>{content.tagline}</p>
        </div>

        {content.columns.map((column) => (
          <div key={column.title} className={styles.footerColumn}>
            <h2 className={styles.footerHeading}>{column.title}</h2>
            <ul className={styles.footerLinks}>
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.href ? (
                    link.href.startsWith("/") ? (
                      <Link href={link.href}>{link.label}</Link>
                    ) : (
                      <a href={link.href}>{link.label}</a>
                    )
                  ) : (
                    <span>{link.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`container ${styles.copyright}`}>
        <span>{content.copyright.prefix}</span>
        <strong className={styles.copyrightCompany}>{content.copyright.company}</strong>
        <span>| {content.copyright.suffix}</span>
      </div>
    </footer>
  );
}
