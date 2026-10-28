import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import { getAboutContent } from "@/lib/public-content";
import { DoctorLoginForm } from "@/components/pages/DoctorLoginForm";
import styles from "@/components/pages/pages.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Doctor Login | HealthArabia",
  description: "Sign in to your HealthArabia healthcare career portal.",
};

export default async function DoctorLoginPage() {
  const content = await getAboutContent();

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/login/doctor" /> : null}

      <main className={styles.authPageWrapper}>
        {/* Left: Form side (Figma Frame 154: 692px x 680px) */}
        <section className={styles.authFormSide}>
          <Suspense fallback={<div className={styles.authCard}>Loading...</div>}>
            <DoctorLoginForm />
          </Suspense>
        </section>

        {/* Right: Visual banner matching Figma 375:1851 */}
        <section className={styles.authVisualSide}>
          <img
            src="/images/home/solution-doctors.png"
            alt=""
            className={styles.authVisualBgImg}
            aria-hidden="true"
          />
          <div className={styles.authVisualOverlay} />

          <div className={styles.authVisualContent}>
            <h2 className={styles.authVisualHeading}>
              Connecting Clinicians with Prime GCC Practices
            </h2>
            <p className={styles.authVisualBody}>
              Health Arabia partners directly with elite government, military, university, and private healthcare systems to bring medical professionals the region's best career paths.
            </p>

            <div className={styles.authRegisteredColleagues}>
              <div className={styles.authAvatarsGroup}>
                <img
                  src="/images/testimonials/sarah-ahmed.png"
                  alt=""
                  className={styles.authAvatarCircle}
                />
                <img
                  src="/images/testimonials/james-wilson.png"
                  alt=""
                  className={styles.authAvatarCircle}
                />
                <img
                  src="/images/testimonials/fatima-al-rashid.png"
                  alt=""
                  className={styles.authAvatarCircle}
                />
              </div>
              <span className={styles.authColleaguesText}>
                Over 12,000+ medical colleagues registered
              </span>
            </div>
          </div>
        </section>
      </main>

      <SimpleAuthFooter />
    </>
  );
}
