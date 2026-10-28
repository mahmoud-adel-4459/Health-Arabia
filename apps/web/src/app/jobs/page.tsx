import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getJobsContent } from "@/lib/public-content";
import { JobsFilterSidebar } from "@/components/pages/JobsFilterSidebar";
import { JobsSortControl } from "@/components/pages/JobsSortControl";
import { PublicJobCard } from "@/components/pages/PublicJobCard";
import styles from "@/components/pages/pages.module.css";
import homeStyles from "@/components/home/home.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Available Jobs | HealthArabia",
  description:
    "Explore premier consultant, specialist, and medical leadership opportunities across leading healthcare complexes in Saudi Arabia and the GCC.",
};

type PageProps = {
  searchParams: Promise<{
    specialty?: string;
    country?: string;
    location?: string;
    type?: string;
    experience?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function AvailableJobsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const content = await getJobsContent(searchParams);

  const heroBg = content.hero?.data?.bgImage || "/images/home/hero-bg.png";
  const search = content.hero?.data?.search || {
    specialtyLabel: "Specialty",
    specialtyPlaceholder: "Select Specialty",
    locationLabel: "Location",
    locationPlaceholder: "All GCC Countries",
    jobTypeLabel: "Job Type",
    jobTypePlaceholder: "All Positions",
    submitLabel: "Search Jobs",
  };

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/jobs" /> : null}

      <main>
        {/* Hero Section matching Figma 351:1303 */}
        <section className={styles.pageHero}>
          <img src={heroBg} alt="" className={styles.pageHeroBgImg} aria-hidden="true" />
          <div className={styles.pageHeroOverlay} />
          <div className={`container ${styles.pageHeroContent}`}>
            <h1 className={styles.pageHeroTitle}>{content.hero?.title || "Find Your Career Opportunity"}</h1>
            <p className={styles.pageHeroBody}>
              {content.hero?.body ||
                "HealthArabia partners directly with premium government, military, and private entities across Saudi Arabia and the GCC region to source high-caliber candidates."}
            </p>
          </div>
        </section>

        {/* Hero Search Bar */}
        <form action="/jobs" method="get" className={`container ${homeStyles.searchBar}`}>
          <div className={homeStyles.searchField}>
            <label className={homeStyles.searchLabel}>{search.specialtyLabel}</label>
            <div className={homeStyles.selectWrap}>
              <select name="specialty" defaultValue={searchParams.specialty || ""} className={homeStyles.select}>
                <option value="">{search.specialtyPlaceholder}</option>
                {content.filterOptions.specialties.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={homeStyles.searchField}>
            <label className={homeStyles.searchLabel}>{search.locationLabel}</label>
            <div className={homeStyles.selectWrap}>
              <select name="country" defaultValue={searchParams.country || ""} className={homeStyles.select}>
                <option value="">{search.locationPlaceholder}</option>
                {content.filterOptions.countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={homeStyles.searchField}>
            <label className={homeStyles.searchLabel}>{search.jobTypeLabel}</label>
            <div className={homeStyles.selectWrap}>
              <select name="type" defaultValue={searchParams.type || ""} className={homeStyles.select}>
                <option value="">{search.jobTypePlaceholder}</option>
                {content.filterOptions.employmentTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className={homeStyles.searchButton}>
            {search.submitLabel}
          </button>
        </form>

        {/* Jobs Layout: Left Filter Sidebar + Right Jobs Feed */}
        <section className={styles.jobsSection}>
          <div className={`container ${styles.jobsLayout}`}>
            <JobsFilterSidebar options={content.filterOptions} />

            <div className={styles.jobsFeedContainer}>
              <JobsSortControl total={content.pagination.total} />

              {content.jobs.length === 0 ? (
                <div className={styles.emptyState}>
                  <h3 className={styles.emptyStateTitle}>No job vacancies found</h3>
                  <p className={styles.emptyStateText}>
                    Try clearing or broadening your search filters to view more available clinical roles.
                  </p>
                </div>
              ) : (
                <div className={styles.jobsFeed}>
                  {content.jobs.map((job) => (
                    <PublicJobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {content.footer ? <SiteFooter content={content.footer} /> : null}
    </>
  );
}
