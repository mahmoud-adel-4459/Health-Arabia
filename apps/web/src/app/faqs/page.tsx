import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { FaqAccordion } from "@/components/pages/FaqAccordion";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getFaqsContent } from "@/lib/public-content";
import styles from "@/components/pages/pages.module.css";

const fallbackMetadata: Metadata = {
  title: "Frequently Asked Questions | Health Arabia",
  description:
    "Clear answers to common questions about medical licensing, SCFHS registration, consultant relocation, and hospital placements in the GCC.",
};

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("FAQ", fallbackMetadata);
}

export default async function FaqsPage() {
  const content = await getFaqsContent();
  const hero = content.hero;
  const faqs = content.faqs;

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/faqs" /> : null}

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
            <h1 className={styles.pageHeroTitle}>{hero?.title ?? "Frequently Asked Questions"}</h1>
            <p className={styles.pageHeroBody}>
              {hero?.body ??
                "HealthArabia partners directly with premium government, military, and private entities across Saudi Arabia and the GCC region to source high-caliber candidates."}
            </p>
          </div>
        </section>

        {/* FAQs Section */}
        <section className={styles.faqSection}>
          <div className={`container ${styles.faqContainer}`}>
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>{hero?.data?.eyebrow ?? "CLEAR ANSWERS"}</p>
              <h2 className={styles.sectionTitle}>
                {hero?.data?.subtitle ?? "Frequently Asked Questions"}
              </h2>
            </div>

            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      </main>

      {content.footer ? <SiteFooter content={content.footer} /> : null}
    </>
  );
}
