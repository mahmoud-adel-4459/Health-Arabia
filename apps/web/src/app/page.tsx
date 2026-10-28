import {
  CvBanner,
  Hero,
  LatestJobs,
  Partners,
  PartnerWithUs,
  Stats,
  TeamCta,
} from "@/components/home/HomeSections";
import { Testimonials } from "@/components/home/Testimonials";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  type CtaData,
  type HeroData,
  type LatestJobsData,
  type PartnersData,
  type PartnerWithUsData,
  type SectionIntro,
  type StatsData,
  getHomeContent,
  section,
} from "@/lib/home-content";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const content = await getHomeContent();

  const heroSection = section<HeroData>(content, "hero");
  const statsSection = section<StatsData>(content, "stats");
  const latestJobsSection = section<LatestJobsData>(content, "latest-jobs");
  const cvBannerSection = section<CtaData>(content, "cv-banner");
  const partnersSection = section<PartnersData>(content, "partners");
  const testimonialsSection = section<SectionIntro>(content, "testimonials");
  const teamCtaSection = section<CtaData>(content, "team-cta");
  const partnerWithUsSection = section<PartnerWithUsData>(content, "partner-with-us");

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/" /> : null}
      <main>
        {heroSection ? <Hero section={heroSection} options={content.searchOptions} /> : null}
        {statsSection ? <Stats section={statsSection} /> : null}
        {latestJobsSection ? (
          <LatestJobs section={latestJobsSection} jobs={content.latestJobs} />
        ) : null}
        {cvBannerSection ? <CvBanner section={cvBannerSection} /> : null}
        {partnersSection ? <Partners section={partnersSection} /> : null}
        {testimonialsSection && content.testimonials.length > 0 ? (
          <Testimonials section={testimonialsSection} testimonials={content.testimonials} />
        ) : null}
        {teamCtaSection ? <TeamCta section={teamCtaSection} /> : null}
        {partnerWithUsSection ? <PartnerWithUs section={partnerWithUsSection} /> : null}
      </main>
      {content.footer ? <SiteFooter content={content.footer} /> : null}
    </>
  );
}
