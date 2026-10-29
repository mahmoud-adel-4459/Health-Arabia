import Image from "next/image";
import Link from "next/link";
import type { FooterContent } from "@/lib/home-content";
import { Copyright } from "./Copyright";
import styles from "./site.module.css";

export function SiteFooter({ content }: { content: FooterContent }) {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerGrid}`}>
        <div className={styles.footerBrand}>
          <Image
            src={content.brand?.logoUrl ?? "/brand/health-arabia-logo.png"}
            alt={content.brand?.name ?? "Health Arabia"}
            width={272}
            height={48}
            className={styles.footerLogo}
            unoptimized={!!content.brand?.logoUrl && !content.brand.logoUrl.startsWith("/")}
          />
          <p className={styles.footerTagline}>{content.tagline}</p>
          {content.social && content.social.length > 0 && (
            <ul className={styles.footerSocial} aria-label="Social media">
              {content.social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>
                </li>
              ))}
            </ul>
          )}
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
        <Copyright {...content.copyright} />
      </div>
    </footer>
  );
}
