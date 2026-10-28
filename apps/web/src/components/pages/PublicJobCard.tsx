import Link from "next/link";
import { ArrowRight, Location, Moneys } from "iconsax-react";
import type { PublicJobItem } from "@/lib/public-content";
import homeStyles from "@/components/home/home.module.css";

function formatSalary(salary: NonNullable<PublicJobItem["salary"]>) {
  const format = (value: string | null) =>
    value ? Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 }) : null;
  const range = [format(salary.min), format(salary.max)].filter(Boolean).join("–");
  return [salary.currency, range].filter(Boolean).join(" ") + (salary.period ? ` / ${salary.period}` : "");
}

export function PublicJobCard({ job }: { job: PublicJobItem }) {
  const location = [job.city, job.country].filter(Boolean).join(", ");
  return (
    <article className={homeStyles.jobCard}>
      <div className={homeStyles.jobTop}>
        <span className={homeStyles.jobRef}>
          REF: JO{String(job.referenceNumber).padStart(10, "0")}
        </span>
        {job.employmentType ? <span className={homeStyles.jobBadge}>{job.employmentType}</span> : null}
      </div>
      <h3 className={homeStyles.jobTitle}>{job.title}</h3>
      {/* 
        CRITICAL PRIVACY RULE: 
        Never expose the facility/hospital name or identifying facility data to doctors.
        Generic category/client institution representation matching Figma anonymity.
      */}
      <p className={homeStyles.jobFacility}>Confidential Client Institution</p>
      <p className={homeStyles.jobDescription}>{job.description}</p>
      <div className={homeStyles.jobMeta}>
        {location ? (
          <span className={homeStyles.jobMetaItem}>
            <Location size={20} color="currentColor" variant="Outline" />
            {location}
          </span>
        ) : null}
        {job.salary ? (
          <span className={homeStyles.jobMetaItem}>
            <Moneys size={20} color="currentColor" variant="Outline" />
            {formatSalary(job.salary)}
          </span>
        ) : null}
      </div>
      <div className={homeStyles.jobFooter}>
        {job.isUrgent ? <span className={homeStyles.jobUrgent}>🔥 Urgently Hiring</span> : <span />}
        <Link href={`/jobs/${job.id}`} className={homeStyles.jobDetails}>
          View detail
          <ArrowRight size={20} color="currentColor" variant="Outline" />
        </Link>
      </div>
    </article>
  );
}
