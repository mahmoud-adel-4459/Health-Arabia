import { ArrowRight } from "iconsax-react";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getAboutContent } from "@/lib/public-content";
import styles from "@/components/pages/pages.module.css";

export const metadata: Metadata = {
  title: "About Our Company | Health Arabia",
  description:
    "HealthArabia is a premier Saudi-owned specialist medical recruitment consultancy assisting world-class clinical leaders to relocate seamlessly across the GCC.",
};

export default async function AboutPage() {
  const content = await getAboutContent();
  const hero = content.sections.hero;
  const visionMission = content.sections["vision-mission"]?.data;
  const approach = content.sections.approach?.data;
  const whyChooseUs = content.sections["why-choose-us"]?.data;

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/about" /> : null}

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
            <h1 className={styles.pageHeroTitle}>{hero?.title ?? "About our company"}</h1>
            <p className={styles.pageHeroBody}>
              {hero?.body ??
                "HealthArabia is a premier Saudi-owned specialist medical recruitment consultancy assisting world-class clinical leaders to relocate seamlessly."}
            </p>
          </div>
        </section>

        {/* Vision & Mission */}
        {visionMission ? (
          <section className={styles.aboutVisionMission}>
            <div className={`container ${styles.visionMissionGrid}`}>
              <div className={styles.visionMissionCard}>
                <h2 className={styles.vmTitle}>{visionMission.vision.title}</h2>
                <p className={styles.vmBody}>{visionMission.vision.body}</p>
              </div>
              <div className={styles.visionMissionCard}>
                <h2 className={styles.vmTitle}>{visionMission.mission.title}</h2>
                <p className={styles.vmBody}>{visionMission.mission.body}</p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Relocation Journey / Approach */}
        {approach ? (
          <section className={styles.aboutApproach}>
            <div className="container">
              <div className={styles.approachHeader}>
                <p className={styles.eyebrow}>{approach.eyebrow}</p>
                <h2 className={styles.approachTitle}>
                  {content.sections.approach?.title ?? "Your Relocation Journey Step-by-Step"}
                </h2>
              </div>
              <div className={styles.stepsRow}>
                {approach.steps.map((item, index) => (
                  <div key={item.step} style={{ display: "contents" }}>
                    <div className={styles.stepCard}>
                      <span className={styles.stepNumName}>
                        {item.step}. {item.name}
                      </span>
                      <p className={styles.stepDesc}>{item.desc}</p>
                    </div>
                    {index < approach.steps.length - 1 ? (
                      <ArrowRight size={24} className={styles.stepArrow} variant="Linear" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Why Choose Us */}
        {whyChooseUs ? (
          <section className={styles.aboutWhy}>
            <div className="container">
              <div className={styles.sectionHeader}>
                <p className={styles.eyebrow}>{whyChooseUs.eyebrow}</p>
                <h2 className={styles.sectionTitle}>
                  {content.sections["why-choose-us"]?.title ?? "A Higher Standard of Recruitment"}
                </h2>
              </div>
              <div className={styles.whyGrid}>
                {whyChooseUs.items.map((item) => (
                  <div key={item.num} className={styles.whyCard}>
                    <span className={styles.whyBadge}>{item.num}</span>
                    <h3 className={styles.whyTitle}>{item.title}</h3>
                    <p className={styles.whyDesc}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      {content.footer ? <SiteFooter content={content.footer} /> : null}
    </>
  );
}
