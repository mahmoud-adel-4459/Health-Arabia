import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bookmark, Location, Moneys, TickCircle } from "iconsax-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getJobDetailsContent, type PublicJobItem } from "@/lib/public-content";
import styles from "@/components/pages/pages.module.css";

export const dynamic = "force-dynamic";

function formatSalary(salary: NonNullable<PublicJobItem["salary"]>) {
  const format = (value: string | null) =>
    value ? Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 }) : null;
  const range = [format(salary.min), format(salary.max)].filter(Boolean).join("–");
  return [salary.currency, range].filter(Boolean).join(" ") + (salary.period ? ` / ${salary.period}` : "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await getJobDetailsContent(id);
    return {
      title: `${data.job.title} | HealthArabia Jobs`,
      description: data.job.description,
    };
  } catch {
    return {
      title: "Job Details | HealthArabia",
    };
  }
}

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let content;
  try {
    content = await getJobDetailsContent(id);
  } catch {
    notFound();
  }

  const { job } = content;
  const location = [job.city, job.country].filter(Boolean).join(", ");

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/jobs" /> : null}

      <main className={styles.jobDetailsPage}>
        <div className="container">
          {/* Breadcrumb matching Figma 421:6082 */}
          <nav className={styles.jobDetailsBreadcrumb} aria-label="Breadcrumb">
            <Link href="/jobs">Available Jobs</Link>
            <ArrowRight size={14} color="currentColor" variant="Outline" />
            <span>Job Details</span>
          </nav>

          {/* Top Header Card */}
          <section className={styles.jobDetailsHeaderCard}>
            <div className={styles.jobDetailsHeaderLeft}>
              <span className={styles.jobDetailsRef}>
                REF: JO{String(job.referenceNumber).padStart(10, "0")}
              </span>
              <h1 className={styles.jobDetailsTitle}>{job.title}</h1>
              {/* 
                CRITICAL PRIVACY RULE: 
                Never expose facility name or identifying data to doctors.
                Confidential Client Institution representation.
              */}
              <p className={styles.jobDetailsSubtext}>Confidential Client Institution</p>

              <div className={styles.jobDetailsMetaRow}>
                {location ? (
                  <span className={styles.jobDetailsMetaItem}>
                    <Location size={20} color="var(--blue-400)" variant="Outline" />
                    {location}
                  </span>
                ) : null}
                {job.salary ? (
                  <span className={styles.jobDetailsMetaItem}>
                    <Moneys size={20} color="var(--blue-400)" variant="Outline" />
                    {formatSalary(job.salary)}
                  </span>
                ) : null}
                {job.employmentType ? (
                  <span className={styles.jobDetailsMetaItem}>
                    <strong style={{ color: "var(--green-500)" }}>{job.employmentType}</strong>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Actions: Apply Now (visitor link to join/login) and Save Job */}
            <div className={styles.jobDetailsHeaderActions}>
              <Link href={`/jobs/${job.id}/apply`} className={styles.applyButton}>
                Apply Now
              </Link>
              <button
                type="button"
                className={styles.saveJobButton}
                aria-label="Save Job"
              >
                <Bookmark size={20} color="currentColor" variant="Outline" />
                Save Job
              </button>
            </div>
          </section>

          {/* About the Hospital (Anonymized Overview matching Figma 421:6082) */}
          <section className={styles.jobDetailCard}>
            <h2 className={styles.jobDetailCardTitle}>About the Hospital</h2>
            <p className={styles.jobDetailCardBody}>
              {job.aboutHospital ||
                "This opportunity is with a premier accredited healthcare facility providing exceptional medical services across multiple specialties. The institution upholds world-class clinical standards and modern medical practices."}
            </p>
          </section>

          {/* Job Description */}
          <section className={styles.jobDetailCard}>
            <h2 className={styles.jobDetailCardTitle}>Job Description</h2>
            <p className={styles.jobDetailCardBody}>{job.description}</p>
          </section>

          {/* Key Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 ? (
            <section className={styles.jobDetailCard}>
              <h2 className={styles.jobDetailCardTitle}>Key Responsibilities</h2>
              <div className={styles.jobCheckList}>
                {job.responsibilities.map((resp, idx) => (
                  <div key={idx} className={styles.jobCheckItem}>
                    <span className={styles.jobCheckIcon}>
                      <TickCircle size={16} color="currentColor" variant="Bold" />
                    </span>
                    <span>{resp}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 ? (
            <section className={styles.jobDetailCard}>
              <h2 className={styles.jobDetailCardTitle}>Requirements</h2>
              <div className={styles.jobCheckList}>
                {job.requirements.map((req, idx) => (
                  <div key={idx} className={styles.jobCheckItem}>
                    <span className={styles.jobCheckIcon}>
                      <TickCircle size={16} color="currentColor" variant="Bold" />
                    </span>
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Benefits & Perks */}
          {job.benefits && job.benefits.length > 0 ? (
            <section className={styles.jobDetailCard}>
              <h2 className={styles.jobDetailCardTitle}>Benefits & Perks</h2>
              <div className={styles.jobCheckList}>
                {job.benefits.map((ben, idx) => (
                  <div key={idx} className={styles.jobCheckItem}>
                    <span className={styles.jobCheckIcon}>
                      <TickCircle size={16} color="currentColor" variant="Bold" />
                    </span>
                    <span>{ben}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      {content.footer ? <SiteFooter content={content.footer} /> : null}
    </>
  );
}
