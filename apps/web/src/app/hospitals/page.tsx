import { ArrowLeft, ArrowRight } from "iconsax-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getHospitalsContent } from "@/lib/public-content";
import styles from "@/components/pages/pages.module.css";

export const metadata: Metadata = {
  title: "Hospital & Healthcare Directory | Health Arabia",
  description:
    "Discover verified partner hospitals and leading clinical healthcare complexes across Saudi Arabia and the GCC.",
};

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function HospitalsPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const content = await getHospitalsContent(page);
  const hero = content.hero;
  const { facilities, pagination } = content;

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/hospitals" /> : null}

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
            <h1 className={styles.pageHeroTitle}>{hero?.title ?? "Healthcare Establishments"}</h1>
            <p className={styles.pageHeroBody}>
              {hero?.body ??
                "HealthArabia partners directly with premium government, military, and private entities across Saudi Arabia and the GCC region to source high-caliber candidates."}
            </p>
          </div>
        </section>

        {/* Directory Section */}
        <section className={styles.hospitalsSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>{hero?.data?.eyebrow ?? "SELECT A HOSPITAL"}</p>
              <h2 className={styles.sectionTitle}>
                {hero?.data?.subtitle ?? "Please find below information relating to our client institutions."}
              </h2>
            </div>

            {facilities.length === 0 ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyStateTitle}>No Public Facilities Listed Yet</h3>
                <p className={styles.emptyStateText}>
                  Our directory of approved public hospital facilities is currently being updated. Only verified,
                  accredited partner institutions are published here.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.hospitalsGrid}>
                  {facilities.map((facility) => (
                    <article key={facility.id} className={styles.hospitalCard}>
                      {facility.logoUrl ? (
                        <img src={facility.logoUrl} alt="" className={styles.hospitalCardImg} aria-hidden="true" />
                      ) : (
                        <img
                          src="/images/hospitals/hospital-card.png"
                          alt=""
                          className={styles.hospitalCardImg}
                          aria-hidden="true"
                        />
                      )}
                      <div className={styles.hospitalCardOverlay} aria-hidden="true" />
                      <div className={styles.hospitalCardContent}>
                        {facility.type ? (
                          <span className={styles.hospitalBadge}>
                            {facility.type.charAt(0) + facility.type.slice(1).toLowerCase()}
                          </span>
                        ) : null}
                        <h3 className={styles.hospitalName}>{facility.name}</h3>
                        {facility.description ? (
                          <p className={styles.hospitalDesc}>{facility.description}</p>
                        ) : null}
                        <Link
                          href={facility.slug ? `/hospitals/${facility.slug}` : "#"}
                          className={styles.btnOutline}
                        >
                          See Guide
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>

                {pagination.totalPages > 1 ? (
                  <nav className={styles.pagination} aria-label="Pagination">
                    {pagination.page > 1 ? (
                      <Link
                        href={`/hospitals?page=${pagination.page - 1}`}
                        className={styles.pageBtn}
                        aria-label="Previous page"
                      >
                        <ArrowLeft size={20} color="currentColor" />
                      </Link>
                    ) : null}

                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                      <Link
                        key={p}
                        href={`/hospitals?page=${p}`}
                        className={`${styles.pageBtn} ${p === pagination.page ? styles.pageBtnActive : ""}`}
                        aria-current={p === pagination.page ? "page" : undefined}
                      >
                        {p}
                      </Link>
                    ))}

                    {pagination.page < pagination.totalPages ? (
                      <Link
                        href={`/hospitals?page=${pagination.page + 1}`}
                        className={styles.pageBtn}
                        aria-label="Next page"
                      >
                        <ArrowRight size={20} color="currentColor" />
                      </Link>
                    ) : null}
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>

      {content.footer ? <SiteFooter content={content.footer} /> : null}
    </>
  );
}
