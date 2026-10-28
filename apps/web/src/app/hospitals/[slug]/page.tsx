import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getHospitalDetails } from "@/lib/public-content";
import styles from "@/components/pages/pages.module.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getHospitalDetails(slug);
  if (!data) return { title: "Hospital Details | Health Arabia" };
  return {
    title: `${data.facility.name} | Health Arabia`,
    description: data.facility.description ?? `Clinical overview and facilities guide for ${data.facility.name}.`,
  };
}

export default async function HospitalDetailsPage({ params }: Props) {
  const { slug } = await params;
  const data = await getHospitalDetails(slug);

  if (!data) {
    notFound();
  }

  const { facility, header, footer } = data;
  const locationLine = [facility.city, facility.country].filter(Boolean).join(", ");

  return (
    <>
      {header ? <SiteHeader content={header} activeHref="/hospitals" /> : null}

      <main>
        {/* Page Hero */}
        <section className={styles.pageHero}>
          {facility.logoUrl ? (
            <>
              <img src={facility.logoUrl} alt="" className={styles.pageHeroBgImg} aria-hidden="true" />
              <div className={styles.pageHeroOverlay} aria-hidden="true" />
            </>
          ) : (
            <>
              <img
                src="/images/hospitals/hospital-card.png"
                alt=""
                className={styles.pageHeroBgImg}
                aria-hidden="true"
              />
              <div className={styles.pageHeroOverlay} aria-hidden="true" />
            </>
          )}
          <div className={`container ${styles.pageHeroContent}`}>
            <h1 className={styles.pageHeroTitle}>{facility.name}</h1>
          </div>
        </section>

        {/* Hospital Details Layout matching Figma frame 371:1881 */}
        <section className={styles.hospitalsSection}>
          <div className={`container ${styles.hospitalDetailsLayout}`}>
            {/* Top Overview Card */}
            <div className={styles.infoCard}>
              <h2 className={styles.infoCardTitle}>HOSPITAL DETAILS</h2>
              <div className={styles.infoCardBody}>
                {facility.description ? (
                  <p>{facility.description}</p>
                ) : (
                  <p>
                    Verified medical partner institution accredited by regional healthcare governing bodies.
                  </p>
                )}
                {facility.employeeCount ? (
                  <p style={{ marginTop: "12px", fontWeight: "bold" }}>
                    Capacity / Team Size: Approximately {facility.employeeCount} beds & staff members.
                  </p>
                ) : null}
              </div>
            </div>

            {/* Bottom 2 Columns: Location & Map */}
            <div className={styles.hospitalDetailsCols}>
              <div className={styles.infoCard}>
                <h2 className={styles.infoCardTitle}>LOCATION</h2>
                <div className={styles.infoCardBody}>
                  <p>
                    Located in {locationLine || "the GCC region"}.
                  </p>
                  {facility.address ? <p style={{ marginTop: "8px" }}>{facility.address}</p> : null}
                  <p style={{ marginTop: "16px" }}>
                    HealthArabia facilitates direct candidate placement, credential evaluation, and on-ground
                    relocation support to this facility.
                  </p>
                </div>
              </div>

              <div className={styles.mapCard}>
                <img
                  src="/images/common/map-illustration.png"
                  alt="Hospital Location Map Illustration"
                  className={styles.mapIllustration}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {footer ? <SiteFooter content={footer} /> : null}
    </>
  );
}
