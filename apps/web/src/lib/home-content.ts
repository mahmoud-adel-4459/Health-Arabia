export type LinkItem = { label: string; href: string | null };
export type Option = { value: string; label: string };

export type HeaderContent = {
  nav: (LinkItem & { hasMenu?: boolean })[];
  jobsLink: LinkItem;
  secondaryLink: LinkItem | null;
  joinMenu: { label: string; items: (LinkItem & { icon: "doctor" | "facility" })[] };
};

export type FooterContent = {
  tagline: string;
  columns: { title: string; links: LinkItem[] }[];
  copyright: { prefix: string; company: string; suffix: string };
};

export type Section<T> = { title: string | null; body: string | null; data: T };

export type HeroData = {
  bgImage?: string | null;
  actions: (LinkItem & { variant: "outline" | "primary" | "link" })[];
  search: {
    action: string;
    specialtyLabel: string;
    specialtyPlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    jobTypeLabel: string;
    jobTypePlaceholder: string;
    submitLabel: string;
  };
};
export type StatsData = { items: { icon: "hospital" | "briefcase"; value: string; label: string }[] };
export type SectionIntro = { eyebrow: string; seeMore?: LinkItem };
export type LatestJobsData = SectionIntro & {
  viewDetailsLabel: string;
  urgentLabel: string;
  referencePrefix: string;
};
export type CtaData = { eyebrow?: string; action: LinkItem };
export type PartnersData = SectionIntro & { items: (LinkItem & { image?: string | null })[] };
export type PartnerWithUsData = SectionIntro & {
  cards: { title: string; body: string; image?: string | null; action: LinkItem; tone: "primary" | "dark" }[];
};

export type Testimonial = {
  id: string;
  authorName: string;
  authorTitle: string;
  authorLocation: string | null;
  quote: string;
  photoUrl: string | null;
};

export type JobSummary = {
  id: string;
  referenceNumber: number;
  title: string;
  facilityName: string;
  description: string;
  isUrgent: boolean;
  employmentType: string | null;
  city: string | null;
  country: string | null;
  salary: { min: string | null; max: string | null; currency: string | null; period: string | null } | null;
};

export type HomeContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  sections: Record<string, Section<unknown>>;
  testimonials: Testimonial[];
  latestJobs: JobSummary[];
  searchOptions: { specialties: Option[]; countries: Option[]; employmentTypes: Option[] };
};

export function section<T>(content: HomeContent, key: string): Section<T> | null {
  return (content.sections[key] as Section<T> | undefined) ?? null;
}

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

export const defaultHeaderContent: HeaderContent = {
  nav: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Countries", href: "/countries", hasMenu: true },
    { label: "Hospitals", href: "/hospitals" },
    { label: "FAQ’s", href: "/faqs" },
    { label: "Contact Us", href: "/contact" },
  ],
  jobsLink: { label: "Available Jobs", href: "/jobs" },
  secondaryLink: { label: "Nursing Services for Homes", href: null },
  joinMenu: {
    label: "Join as",
    items: [
      { label: "Join as Healthcare Professional", href: "/login/doctor", icon: "doctor" },
      { label: "Join as Hospital / Clinic", href: "/register/facility", icon: "facility" },
    ],
  },
};

export const defaultFooterContent: FooterContent = {
  tagline:
    "Connecting great clinicians to the practices that need them. Trusted partner across the Kingdom of Saudi Arabia and the wider GCC region.",
  columns: [
    {
      title: "Quick Links",
      links: [
        { label: "Search Jobs", href: "/jobs" },
        { label: "For Hospitals", href: "/hospitals" },
        { label: "About Us", href: "/about" },
        { label: "Contact Our Consultants", href: "/contact" },
        { label: "Latest Healthcare News", href: null },
      ],
    },
    {
      title: "GCC Destinations",
      links: [
        { label: "Saudi Arabia", href: "/countries" },
        { label: "United Arab Emirates", href: "/countries" },
        { label: "Qatar", href: "/countries" },
        { label: "Bahrain", href: "/countries" },
        { label: "Oman & Kuwait", href: "/countries" },
      ],
    },
    {
      title: "Contact Info",
      links: [
        { label: "Al Olaya District, Riyadh, KSA", href: null },
        { label: "info@healtharabia.com", href: "mailto:info@healtharabia.com" },
        { label: "+966 11 465 0000", href: "tel:+966114650000" },
        { label: "Sunday - Thursday: 9AM - 5PM", href: null },
      ],
    },
  ],
  copyright: { prefix: "Copyright © 2026", company: "QEEMATECH", suffix: "All Rights Reserved" },
};

export async function getHomeContent(): Promise<HomeContent> {
  if (!apiUrl) {
    throw new Error("API_URL is not configured");
  }
  const response = await fetch(`${apiUrl}/public/home?locale=en`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Homepage content request failed with status ${response.status}`);
  }
  return (await response.json()) as HomeContent;
}

