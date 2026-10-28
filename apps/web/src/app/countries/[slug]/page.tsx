import { Moneys, People } from "iconsax-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCountryDetails } from "@/lib/public-content";
import styles from "@/components/pages/pages.module.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCountryDetails(slug);
  if (!data) return { title: "Country Guide | Health Arabia" };
  return {
    title: `${data.country.name} Healthcare Guide | Health Arabia`,
    description: data.country.summary ?? `Medical practice and relocation guide for ${data.country.name}.`,
  };
}

export default async function CountryDetailsPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCountryDetails(slug);

  if (!data) {
    notFound();
  }

  const { country, header, footer } = data;
  const sections = country.guideSections;

  // Split sections into left and right columns matching Figma frame 358:1339
  // Left: Location, Social Climate (or first half)
  // Right: Map + Population, General Info, Currency (or second half)
  const leftSections = sections.slice(0, Math.ceil(sections.length / 2));
  const rightSections = sections.slice(Math.ceil(sections.length / 2));

  return (
    <>
      {header ? <SiteHeader content={header} activeHref="/countries" /> : null}

      <main>
        {/* Country Hero with Stats Pills */}
        <section className={styles.pageHero}>
          {country.heroImageUrl ? (
            <>
              <img src={country.heroImageUrl} alt="" className={styles.pageHeroBgImg} aria-hidden="true" />
              <div className={styles.pageHeroOverlay} aria-hidden="true" />
            </>
          ) : null}
          <div className={`container ${styles.pageHeroContent}`}>
            <h1 className={styles.pageHeroTitle}>{country.name}</h1>
            <div className={styles.heroPills}>
              <div className={styles.heroPill}>
                <People size={24} className={styles.heroPillIcon} variant="Bold" />
                <span>
                  <strong>Population:</strong> 14 million Saudis & expats
                </span>
              </div>
              <div className={styles.heroPill}>
                <Moneys size={24} className={styles.heroPillIcon} variant="Bold" />
                <span>
                  <strong>Currency:</strong> SR 5.8 = £1.00 | SR 3.65 = $US 1.00
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Guide Content */}
        <section className={styles.countriesSection}>
          <div className="container">
            {!country.isGuidePublished || sections.length === 0 ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyStateTitle}>Guide In Preparation</h3>
                <p className={styles.emptyStateText}>
                  The comprehensive medical relocation guide for {country.name} is currently being prepared by our consultants.
                </p>
              </div>
            ) : (
              <div className={styles.countryDetailsGrid}>
                {/* Left Column */}
                <div className={styles.guideCol}>
                  {leftSections.map((sec) => (
                    <div key={sec.id} className={styles.infoCard}>
                      <h2 className={styles.infoCardTitle}>{sec.title}</h2>
                      <p className={styles.infoCardBody}>{sec.body}</p>
                    </div>
                  ))}
                </div>

                {/* Right Column: Map + Info Cards */}
                <div className={styles.guideCol}>
                  <div className={styles.mapCard}>
                    <img
                      src="/images/common/map-illustration.png"
                      alt={`${country.name} Map Illustration`}
                      className={styles.mapIllustration}
                    />
                  </div>

                  {rightSections.map((sec) => (
                    <div key={sec.id} className={styles.infoCard}>
                      <h2 className={styles.infoCardTitle}>{sec.title}</h2>
                      <p className={styles.infoCardBody}>{sec.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {footer ? <SiteFooter content={footer} /> : null}
    </>
  );
}
