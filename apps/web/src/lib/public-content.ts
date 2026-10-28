import type { FooterContent, HeaderContent, Section } from "./home-content";

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

// ---------------------------------------------------------------------------
// Shared / About
// ---------------------------------------------------------------------------

export type PageHero = {
  title: string | null;
  body: string | null;
  data?: {
    bgImage?: string | null;
    eyebrow?: string;
    subtitle?: string;
    search?: {
      specialtyLabel?: string;
      specialtyPlaceholder?: string;
      locationLabel?: string;
      locationPlaceholder?: string;
      jobTypeLabel?: string;
      jobTypePlaceholder?: string;
      submitLabel?: string;
    };
  } | null;
};

export type VisionMissionData = {
  vision: { title: string; body: string };
  mission: { title: string; body: string };
};

export type ApproachStep = { step: number; name: string; desc: string };
export type ApproachData = { eyebrow: string; steps: ApproachStep[] };

export type WhyChooseUsItem = { num: number; title: string; desc: string };
export type WhyChooseUsData = { eyebrow: string; items: WhyChooseUsItem[] };

export type AboutContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  sections: {
    hero?: Section<PageHero["data"]>;
    "vision-mission"?: Section<VisionMissionData>;
    approach?: Section<ApproachData>;
    "why-choose-us"?: Section<WhyChooseUsData>;
    [key: string]: Section<unknown> | undefined;
  };
};

export async function getAboutContent(): Promise<AboutContent> {
  const res = await fetch(`${apiUrl}/public/about?locale=en`, { cache: "no-store" });
  if (!res.ok) throw new Error(`About content failed: ${res.status}`);
  return (await res.json()) as AboutContent;
}

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

export type CountryListItem = {
  id: string;
  slug: string;
  isoCode: string;
  name: string;
  summary: string | null;
  heroImageUrl: string | null;
  isGuidePublished: boolean;
};

export type CountriesContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  hero: PageHero | null;
  countries: CountryListItem[];
};

export async function getCountriesContent(): Promise<CountriesContent> {
  const res = await fetch(`${apiUrl}/public/countries?locale=en`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Countries content failed: ${res.status}`);
  return (await res.json()) as CountriesContent;
}

export type CountryGuideSectionItem = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
};

export type CountryDetailsContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  country: {
    id: string;
    slug: string;
    isoCode: string;
    name: string;
    summary: string | null;
    heroImageUrl: string | null;
    isGuidePublished: boolean;
    cities: { id: string; name: string }[];
    guideSections: CountryGuideSectionItem[];
  };
};

export async function getCountryDetails(slug: string): Promise<CountryDetailsContent | null> {
  const res = await fetch(`${apiUrl}/public/countries/${encodeURIComponent(slug)}?locale=en`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Country details failed: ${res.status}`);
  return (await res.json()) as CountryDetailsContent;
}

// ---------------------------------------------------------------------------
// Hospitals
// ---------------------------------------------------------------------------

export type HospitalListItem = {
  id: string;
  slug: string | null;
  name: string;
  type: string | null;
  description: string | null;
  employeeCount: number | null;
  country: string | null;
  city: string | null;
  logoUrl: string | null;
};

export type HospitalsContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  hero: PageHero | null;
  facilities: HospitalListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getHospitalsContent(page = 1): Promise<HospitalsContent> {
  const res = await fetch(`${apiUrl}/public/hospitals?locale=en&page=${page}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Hospitals content failed: ${res.status}`);
  return (await res.json()) as HospitalsContent;
}

export type HospitalDetailsContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  facility: {
    id: string;
    slug: string | null;
    name: string;
    type: string | null;
    description: string | null;
    address: string | null;
    locationUrl: string | null;
    employeeCount: number | null;
    country: string | null;
    city: string | null;
    logoUrl: string | null;
  };
};

export async function getHospitalDetails(slug: string): Promise<HospitalDetailsContent | null> {
  const res = await fetch(`${apiUrl}/public/hospitals/${encodeURIComponent(slug)}?locale=en`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Hospital details failed: ${res.status}`);
  return (await res.json()) as HospitalDetailsContent;
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type FaqsContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  hero: PageHero | null;
  faqs: FaqItem[];
};

export async function getFaqsContent(): Promise<FaqsContent> {
  const res = await fetch(`${apiUrl}/public/faqs?locale=en`, { cache: "no-store" });
  if (!res.ok) throw new Error(`FAQs content failed: ${res.status}`);
  return (await res.json()) as FaqsContent;
}

// ---------------------------------------------------------------------------
// Contact Us
// ---------------------------------------------------------------------------

export type ContactSubjectItem = {
  id: string;
  code: string;
  label: string;
};

export type DirectContactsData = {
  phone?: string;
  hours?: string;
  location?: string;
  mapImage?: string;
};

export type ContactContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  sections: {
    hero?: Section<PageHero["data"]>;
    "direct-contacts"?: Section<DirectContactsData>;
    [key: string]: Section<unknown> | undefined;
  };
  subjects: ContactSubjectItem[];
};

export async function getContactContent(): Promise<ContactContent> {
  const res = await fetch(`${apiUrl}/public/contact?locale=en`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Contact content failed: ${res.status}`);
  return (await res.json()) as ContactContent;
}

// ---------------------------------------------------------------------------
// Jobs Listing & Details (Stage 3)
// ---------------------------------------------------------------------------

export type PublicJobItem = {
  id: string;
  referenceNumber: number;
  title: string;
  description: string;
  isUrgent: boolean;
  minYearsExperience: number | null;
  employmentType: string | null;
  specialty: string | null;
  city: string | null;
  country: string | null;
  salary: {
    min: string | null;
    max: string | null;
    currency: string | null;
    period: string | null;
  } | null;
};

export type PublicJobDetail = PublicJobItem & {
  aboutHospital?: string | null;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  positions: number;
};

export type JobsContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  hero: PageHero | null;
  filterOptions: {
    specialties: { value: string; label: string }[];
    countries: { value: string; label: string }[];
    employmentTypes: { value: string; label: string }[];
    experienceLevels: { value: string; label: string }[];
  };
  jobs: PublicJobItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type JobDetailsContent = {
  locale: "EN" | "AR";
  header: HeaderContent | null;
  footer: FooterContent | null;
  job: PublicJobDetail;
};

export async function getJobsContent(searchParams?: {
  specialty?: string;
  country?: string;
  location?: string;
  type?: string;
  experience?: string;
  q?: string;
  page?: string;
  sort?: string;
}): Promise<JobsContent> {
  const params = new URLSearchParams();
  params.set("locale", "en");
  if (searchParams) {
    for (const [key, val] of Object.entries(searchParams)) {
      if (val) params.set(key, val);
    }
  }
  const res = await fetch(`${apiUrl}/public/jobs?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Jobs content failed: ${res.status}`);
  return (await res.json()) as JobsContent;
}

export async function getJobDetailsContent(id: string): Promise<JobDetailsContent> {
  const res = await fetch(`${apiUrl}/public/jobs/${id}?locale=en`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Job details failed: ${res.status}`);
  return (await res.json()) as JobDetailsContent;
}

// ---------------------------------------------------------------------------
// Managed Cities
// ---------------------------------------------------------------------------

export type ManagedCity = {
  id: string;
  nameEn: string;
  nameAr: string;
  name: string;
  countryId: string;
  countryName: string;
  displayName: string;
};

export async function getManagedCities(locale: "EN" | "AR" = "EN"): Promise<ManagedCity[]> {
  try {
    const res = await fetch(`${apiUrl}/public/cities?locale=${locale.toLowerCase()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.cities ?? [];
  } catch (err) {
    console.error("Failed to fetch managed cities:", err);
    return [];
  }
}


