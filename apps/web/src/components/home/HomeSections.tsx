import { ArrowDown2, ArrowRight, Briefcase, Export, Hospital, Location, Moneys } from "iconsax-react";
import Link from "next/link";
import type {
  CtaData,
  HeroData,
  JobSummary,
  LatestJobsData,
  LinkItem,
  Option,
  PartnersData,
  PartnerWithUsData,
  Section,
  SectionIntro,
  StatsData,
} from "@/lib/home-content";
import styles from "./home.module.css";

function SeeMore({ link }: { link: LinkItem }) {
  return (
    <Link href={link.href ?? "#"} className={styles.seeMore}>
      {link.label}
      <ArrowRight size={24} color="currentColor" variant="Outline" />
    </Link>
  );
}

export function SectionHeader({
  intro,
  title,
  aside,
}: {
  intro: SectionIntro;
  title: string | null;
  aside?: React.ReactNode;
}) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <p className={styles.eyebrow}>{intro.eyebrow}</p>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {aside ?? (intro.seeMore ? <SeeMore link={intro.seeMore} /> : null)}
    </div>
  );
}

function SearchSelect({
  name,
  label,
  placeholder,
  options,
}: {
  name: string;
  label: string;
  placeholder: string;
  options: Option[];
}) {
  return (
    <label className={styles.searchField}>
      <span className={styles.searchLabel}>{label}</span>
      <span className={styles.selectWrap}>
        <select name={name} defaultValue="" className={styles.select}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ArrowDown2 size={20} color="var(--blue-500)" variant="Outline" className={styles.selectIcon} />
      </span>
    </label>
  );
}

export function Hero({
  section,
  options,
}: {
  section: Section<HeroData>;
  options: { specialties: Option[]; countries: Option[]; employmentTypes: Option[] };
}) {
  const { search, bgImage } = section.data;
  return (
    <section className={styles.heroFrame}>
      <div className={styles.hero}>
        {bgImage ? (
          <div className={styles.heroBgWrap} aria-hidden="true">
            <img src={bgImage} alt="" className={styles.heroBgImg} />
            <div className={styles.heroBgOverlay} />
          </div>
        ) : null}
        <div className={`container ${styles.heroContent}`}>
          <h1 className={styles.heroTitle}>{section.title}</h1>
          <p className={styles.heroText}>{section.body}</p>
          <div className={styles.heroActions}>
            {section.data.actions.map((action) => (
              <Link
                key={action.label}
                href={action.href ?? "#"}
                className={`${styles.heroAction} ${styles[`heroAction_${action.variant}`]}`}
              >
                {action.label}
                {action.variant === "link" ? (
                  <ArrowRight size={20} color="currentColor" variant="Outline" />
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <form action={search.action} method="get" className={`container ${styles.searchBar}`}>
        <SearchSelect
          name="specialty"
          label={search.specialtyLabel}
          placeholder={search.specialtyPlaceholder}
          options={options.specialties}
        />
        <SearchSelect
          name="country"
          label={search.locationLabel}
          placeholder={search.locationPlaceholder}
          options={options.countries}
        />
        <SearchSelect
          name="type"
          label={search.jobTypeLabel}
          placeholder={search.jobTypePlaceholder}
          options={options.employmentTypes}
        />
        <button type="submit" className={styles.searchButton}>
          {search.submitLabel}
        </button>
      </form>
    </section>
  );
}

export function Stats({ section }: { section: Section<StatsData> }) {
  return (
    <section className={styles.stats}>
      <div className={`container ${styles.statsGrid}`}>
        {section.data.items.map((item, index) => (
          <div key={`${item.label}-${index}`} className={styles.statItem}>
            {item.icon === "hospital" ? (
              <Hospital size={48} color="var(--green-500)" variant="Linear" />
            ) : (
              <Briefcase size={48} color="var(--green-500)" variant="Linear" />
            )}
            <p className={styles.statValue}>{item.value}</p>
            <p className={styles.statLabel}>{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatSalary(salary: NonNullable<JobSummary["salary"]>) {
  const format = (value: string | null) =>
    value ? Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 }) : null;
  const range = [format(salary.min), format(salary.max)].filter(Boolean).join("–");
  return [salary.currency, range].filter(Boolean).join(" ") + (salary.period ? ` / ${salary.period}` : "");
}

function JobCard({ job, labels }: { job: JobSummary; labels: LatestJobsData }) {
  const location = [job.city, job.country].filter(Boolean).join(", ");
  return (
    <article className={styles.jobCard}>
      <div className={styles.jobTop}>
        <span className={styles.jobRef}>
          {labels.referencePrefix} JO{String(job.referenceNumber).padStart(10, "0")}
        </span>
        {job.employmentType ? <span className={styles.jobBadge}>{job.employmentType}</span> : null}
      </div>
      <h3 className={styles.jobTitle}>{job.title}</h3>
      <p className={styles.jobFacility}>{job.facilityName}</p>
      <p className={styles.jobDescription}>{job.description}</p>
      <div className={styles.jobMeta}>
        {location ? (
          <span className={styles.jobMetaItem}>
            <Location size={20} color="currentColor" variant="Outline" />
            {location}
          </span>
        ) : null}
        {job.salary ? (
          <span className={styles.jobMetaItem}>
            <Moneys size={20} color="currentColor" variant="Outline" />
            {formatSalary(job.salary)}
          </span>
        ) : null}
      </div>
      <div className={styles.jobFooter}>
        {job.isUrgent ? <span className={styles.jobUrgent}>🔥 {labels.urgentLabel}</span> : <span />}
        <Link href={`/jobs/${job.id}`} className={styles.jobDetails}>
          {labels.viewDetailsLabel}
          <ArrowRight size={20} color="currentColor" variant="Outline" />
        </Link>
      </div>
    </article>
  );
}

export function LatestJobs({ section, jobs }: { section: Section<LatestJobsData>; jobs: JobSummary[] }) {
  return (
    <section className={styles.latestJobs}>
      <div className="container">
        <SectionHeader intro={section.data} title={section.title} />
        <div className={styles.jobList}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} labels={section.data} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CvBanner({ section }: { section: Section<CtaData> }) {
  const { action } = section.data;
  return (
    <section className={styles.cvBanner}>
      <div className={`container ${styles.cvBannerInner}`}>
        <div className={styles.cvBannerText}>
          {section.data.eyebrow ? <p className={styles.eyebrow}>{section.data.eyebrow}</p> : null}
          <h2 className={styles.cvBannerTitle}>{section.title}</h2>
          <p className={styles.cvBannerBody}>{section.body}</p>
        </div>
        <Link href={action.href ?? "#"} className={styles.cvBannerButton}>
          <Export size={24} color="currentColor" variant="Linear" />
          {action.label}
        </Link>
      </div>
    </section>
  );
}

export function Partners({ section }: { section: Section<PartnersData> }) {
  return (
    <section className={styles.partners}>
      <div className="container">
        <SectionHeader intro={section.data} title={section.title} />
        <ul className={styles.partnerGrid}>
          {section.data.items.map((item) => (
            <li key={item.label}>
              <Link href={item.href ?? "#"} className={styles.partnerCard}>
                {item.image ? (
                  <>
                    <img src={item.image} alt="" className={styles.partnerCardImg} aria-hidden="true" />
                    <div className={styles.partnerCardOverlay} aria-hidden="true" />
                  </>
                ) : null}
                <span className={styles.partnerLabel}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TeamCta({ section }: { section: Section<CtaData> }) {
  const { action } = section.data;
  return (
    <section className={styles.teamCta}>
      <div className={`container ${styles.teamCtaInner}`}>
        <h2 className={styles.teamCtaTitle}>{section.title}</h2>
        <p className={styles.teamCtaBody}>{section.body}</p>
        <Link href={action.href ?? "#"} className={styles.teamCtaButton}>
          {action.label}
        </Link>
      </div>
    </section>
  );
}

export function PartnerWithUs({ section }: { section: Section<PartnerWithUsData> }) {
  return (
    <section className={styles.partnerWithUs}>
      <div className="container">
        <SectionHeader intro={section.data} title={section.title} />
        <div className={styles.solutionGrid}>
          {section.data.cards.map((card) => (
            <article key={card.title} className={styles.solutionCard}>
              {card.image ? (
                <div className={styles.solutionImageWrap}>
                  <img src={card.image} alt={card.title} className={styles.solutionImage} />
                </div>
              ) : (
                <div className={styles.solutionImage} aria-hidden="true" />
              )}
              <h3 className={styles.solutionTitle}>{card.title}</h3>
              <p className={styles.solutionBody}>{card.body}</p>
              <Link
                href={card.action.href ?? "#"}
                className={`${styles.solutionButton} ${card.tone === "dark" ? styles.solutionButtonDark : ""}`}
              >
                {card.action.label}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
