import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCountriesContent } from "@/lib/public-content";
import styles from "@/components/pages/pages.module.css";

export const metadata: Metadata = {
  title: "GCC Destinations & Countries | Health Arabia",
  description:
    "Explore healthcare and medical consultant relocation opportunities across Saudi Arabia, UAE, Qatar, Bahrain, Oman, and Kuwait.",
};

export default async function CountriesPage() {
  const content = await getCountriesContent();
  const hero = content.hero;
  const countries = content.countries;

  // Split into Figma layout: first 2 countries in top row, remaining in bottom row
  const topCountries = countries.slice(0, 2);
  const bottomCountries = countries.slice(2);

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/countries" /> : null}

      <main>
        {/* Page Hero */}
        <section className={styles.pageHero}>
          {hero?.data?.bgImage ? (
            <>
              <img src={hero.data.bgImage} alt="" className={styles.pageHeroBgImg} aria-hidden="true" />
              <div className={styles.pageHeroOverlay} aria-hidden="true" />
            </>
          ) : null}
          <div className={`container ${styles.pageHeroContent}`}>
            <h1 className={styles.pageHeroTitle}>{hero?.title ?? "Explore Opportunities"}</h1>
            <p className={styles.pageHeroBody}>
              {hero?.body ??
                "Relocating to the Arabian Peninsula offers medical professionals unparalleled career progression, tax-free packages, and a rich lifestyle standard."}
            </p>
          </div>
        </section>

        {/* Countries Grid */}
        <section className={styles.countriesSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>{hero?.data?.eyebrow ?? "SELECT A COUNTRY"}</p>
              <h2 className={styles.sectionTitle}>
                {hero?.data?.subtitle ?? "Find below information relating to the countries"}
              </h2>
            </div>

            {countries.length === 0 ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyStateTitle}>No Country Guides Available</h3>
                <p className={styles.emptyStateText}>
                  Country destination information is currently being updated. Please check back shortly.
                </p>
              </div>
            ) : (
              <div className={styles.countriesGrid}>
                {topCountries.length > 0 ? (
                  <div className={styles.countriesTopRow}>
                    {topCountries.map((c, idx) => (
                      <article
                        key={c.id}
                        className={`${styles.countryCard} ${idx === 0 ? styles.countryCardLarge : ""}`}
                      >
                        {c.heroImageUrl ? (
                          <img src={c.heroImageUrl} alt="" className={styles.countryCardImg} aria-hidden="true" />
                        ) : null}
                        <div className={styles.countryCardOverlay} aria-hidden="true" />
                        <div className={styles.countryCardContent}>
                          <h3 className={styles.countryCardName}>{c.name}</h3>
                          {c.summary ? <p className={styles.countryCardSummary}>{c.summary}</p> : null}
                          <Link
                            href={`/countries/${c.slug}`}
                            className={idx === 0 ? styles.btnPrimary : styles.btnOutline}
                          >
                            See Guide
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}

                {bottomCountries.length > 0 ? (
                  <div className={styles.countriesBottomRow}>
                    {bottomCountries.map((c) => (
                      <article key={c.id} className={styles.countryCard}>
                        {c.heroImageUrl ? (
                          <img src={c.heroImageUrl} alt="" className={styles.countryCardImg} aria-hidden="true" />
                        ) : null}
                        <div className={styles.countryCardOverlay} aria-hidden="true" />
                        <div className={styles.countryCardContent}>
                          <h3 className={styles.countryCardName}>{c.name}</h3>
                          {c.summary ? <p className={styles.countryCardSummary}>{c.summary}</p> : null}
                          <Link href={`/countries/${c.slug}`} className={styles.btnOutline}>
                            See Guide
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </main>

      {content.footer ? <SiteFooter content={content.footer} /> : null}
    </>
  );
}
