import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import { getAboutContent } from "@/lib/public-content";
import { FacilityLoginForm } from "@/components/pages/FacilityLoginForm";
import styles from "@/components/pages/pages.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hospital Portal Login | HealthArabia",
  description: "Access your secure hospital and clinical institution recruitment dashboard.",
};

export default async function FacilityLoginPage() {
  const content = await getAboutContent();

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/login/facility" /> : null}

      <main className={styles.authPageWrapper}>
        {/* Left: Form side (Figma Frame 154: 692px x 680px) */}
        <section className={styles.authFormSide}>
          <FacilityLoginForm />
        </section>

        {/* Right: Visual banner matching Figma 376:1993 */}
        <section className={`${styles.authVisualSide} ${styles.authVisualSide_facility}`}>
          <img
            src="/images/home/solution-hospitals.png"
            alt=""
            className={styles.authVisualBgImg}
            aria-hidden="true"
          />
          <div className={styles.authVisualOverlay} />

          <div className={styles.authVisualContent}>
            <h2 className={styles.authVisualHeading}>
              High-Caliber Clinical Talent on Demand
            </h2>
            <p className={styles.authVisualBody}>
              Sourcing verified medical consultants, specialty nurses, and healthcare managers with pre-mapped SCFHS credentials.
            </p>

            <div className={styles.authVisualStats}>
              <div className={styles.authVisualStatItem}>
                <strong>456+</strong>
                <span>Active Placements</span>
              </div>
              <div className={styles.authVisualStatItem}>
                <strong>200+</strong>
                <span>Hospital Clients</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SimpleAuthFooter />
    </>
  );
}

