import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import { getAboutContent } from "@/lib/public-content";
import styles from "@/components/pages/pages.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join Health Arabia | Start Now",
  description:
    "Select how you would like to proceed on the GCC region's premier specialist healthcare career & recruitment platform.",
};

function ArrowRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12.025 15.6833C11.8667 15.6833 11.7083 15.625 11.5833 15.5C11.3417 15.2583 11.3417 14.8583 11.5833 14.6167L16.2 10L11.5833 5.38333C11.3417 5.14167 11.3417 4.74167 11.5833 4.5C11.825 4.25833 12.225 4.25833 12.4667 4.5L17.525 9.55833C17.7667 9.8 17.7667 10.2 17.525 10.4417L12.4667 15.5C12.3417 15.625 12.1833 15.6833 12.025 15.6833Z"
        fill="currentColor"
      />
      <path
        d="M16.9417 10.625H2.91667C2.575 10.625 2.29167 10.3417 2.29167 10C2.29167 9.65833 2.575 9.375 2.91667 9.375H16.9417C17.2833 9.375 17.5667 9.65833 17.5667 10C17.5667 10.3417 17.2833 10.625 16.9417 10.625Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default async function JoinStartNowPage() {
  const content = await getAboutContent();

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/join" /> : null}

      <main className={styles.startNowPageWrapper}>
        <div className={styles.startNowContainer}>
          {/* Header block: Title & Subtitle matching Figma 375:1460 */}
          <div className={styles.startNowHeaderBlock}>
            <h1 className={styles.startNowTitle}>Join Health Arabia</h1>
            <p className={styles.startNowSubtitle}>
              Select how you would like to proceed on the GCC region&apos;s premier specialist healthcare career &amp; recruitment platform.
            </p>
          </div>

          {/* Cards Grid matching Figma 375:1624 */}
          <div className={styles.startNowCardsGrid}>
            {/* Card 1: Healthcare Professional (Candidate Portal) */}
            <div className={styles.startNowCard}>
              <div className={styles.startNowCardTop}>
                <div className={styles.startNowCardHeaderRow}>
                  <div className={styles.startNowIconBoxDoctor}>
                    <Image
                      src="/images/common/stethoscope-green.svg"
                      alt=""
                      width={24}
                      height={24}
                      priority
                    />
                  </div>
                  <div className={styles.startNowCardTitleGroup}>
                    <h2 className={styles.startNowCardTitle}>Healthcare Professional</h2>
                    <span className={styles.startNowBadgeDoctor}>CANDIDATE PORTAL</span>
                  </div>
                </div>

                <p className={styles.startNowCardDescription}>
                  Doctors, nurses, pharmacists, and medical specialists looking for career opportunities and professional licensing transition support across leading healthcare facilities in Saudi Arabia &amp; the Gulf.
                </p>
              </div>

              <Link href="/login/doctor" className={styles.startNowBtnDoctor}>
                <span>Get Started</span>
                <ArrowRightIcon />
              </Link>
            </div>

            {/* Card 2: Hospital / Clinic (Employer Portal) */}
            <div className={styles.startNowCard}>
              <div className={styles.startNowCardTop}>
                <div className={styles.startNowCardHeaderRow}>
                  <div className={styles.startNowIconBoxFacility}>
                    <Image
                      src="/images/common/hospital-navy.svg"
                      alt=""
                      width={24}
                      height={24}
                      priority
                    />
                  </div>
                  <div className={styles.startNowCardTitleGroup}>
                    <h2 className={styles.startNowCardTitle}>Hospital / Clinic</h2>
                    <span className={styles.startNowBadgeFacility}>EMPLOYER PORTAL</span>
                  </div>
                </div>

                <p className={styles.startNowCardDescription}>
                  Premier government, military, university, and private healthcare clients seeking high-caliber clinical consultants, administrative executives, or whole department medical staffing solutions.
                </p>
              </div>

              <Link href="/login/facility" className={styles.startNowBtnFacility}>
                <span>Get Started</span>
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SimpleAuthFooter />
    </>
  );
}
