import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/security";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

const header = {
  EN: {
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
  },
};

const footer = {
  EN: {
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
  },
};

const homeBlocks = [
  {
    key: "hero",
    page: "HOME" as const,
    sortOrder: 0,
    title: "Connecting Great Clinicians With Leading Healthcare Practices",
    body: "Personal recruitment and consultancy service for medical professionals seeking opportunities across the Middle East — from Specialist to Head of Department.",
    data: {
      bgImage: "/images/home/hero-bg.png",
      actions: [
        { label: "Available Jobs", href: "/jobs", variant: "outline" },
        { label: "Apply Now", href: "/join", variant: "primary" },
        { label: "For Hospitals & Clinics", href: "/join", variant: "link" },
      ],
      search: {
        action: "/jobs",
        specialtyLabel: "Specialty",
        specialtyPlaceholder: "Select Specialty",
        locationLabel: "Location",
        locationPlaceholder: "All GCC Countries",
        jobTypeLabel: "Job Type",
        jobTypePlaceholder: "All Positions",
        submitLabel: "Search Jobs",
      },
    },
  },
  {
    key: "stats",
    page: "HOME" as const,
    sortOrder: 1,
    title: null,
    body: null,
    data: {
      items: [
        { icon: "hospital", value: "60 Employers", label: "Located in the Middle East" },
        { icon: "briefcase", value: "60 Employers", label: "Waiting for Candidates" },
      ],
    },
  },
  {
    key: "latest-jobs",
    page: "HOME" as const,
    sortOrder: 2,
    title: "Latest Opportunities",
    body: null,
    data: {
      eyebrow: "Immediate Vacancies",
      seeMore: { label: "See More", href: "/jobs" },
      viewDetailsLabel: "View details",
      urgentLabel: "Urgently Hiring",
      referencePrefix: "REF:",
    },
  },
  {
    key: "cv-banner",
    page: "HOME" as const,
    sortOrder: 3,
    title: "Ready to Begin Your Medical Career?",
    body: "Click here to begin the application process. You can upload your CV which will be reviewed by one of our medical recruitment consultants. We ensure complete confidentiality.",
    data: { eyebrow: "Want to Apply?", action: { label: "Upload Your CV", href: "/join" } },
  },
  {
    key: "partners",
    page: "HOME" as const,
    sortOrder: 4,
    title: "Our Partner Hospitals & Healthcare Facilities",
    body: null,
    data: {
      eyebrow: "Our Partners",
      seeMore: { label: "See More", href: "/hospitals" },
      items: [
        { label: "Government Hospitals", href: "/hospitals", image: "/images/home/partner-government.png" },
        { label: "Military Hospitals", href: "/hospitals", image: "/images/home/partner-military.png" },
        { label: "University Hospitals", href: "/hospitals", image: "/images/home/partner-university.png" },
        { label: "Private Clinics & Centres", href: "/hospitals", image: "/images/home/partner-private.png" },
        { label: "National Guard Health Affairs", href: "/hospitals", image: "/images/home/partner-national-guard.png" },
        { label: "View All Partners", href: "/hospitals", image: "/images/home/partner-all.png" },
      ],
    },
  },
  {
    key: "testimonials",
    page: "HOME" as const,
    sortOrder: 5,
    title: "Success Stories",
    body: null,
    data: { eyebrow: "Clinician Testimonials" },
  },
  {
    key: "team-cta",
    page: "HOME" as const,
    sortOrder: 6,
    title: "Ready to Build Your Medical Team?",
    body: "Partner with Health Arabia to secure high-caliber clinical consultants and administrative staff. Contact our consultants today.",
    data: { action: { label: "Request Medical Staff Now", href: "/join" } },
  },
  {
    key: "partner-with-us",
    page: "HOME" as const,
    sortOrder: 7,
    title: "Tailored Solutions for Clinicians & Institutions",
    body: null,
    data: {
      eyebrow: "Partner With Us",
      seeMore: { label: "See More", href: "/join" },
      cards: [
        {
          title: "For Doctors & Healthcare Professionals",
          body: "Discover verified medical opportunities across leading hospitals and healthcare institutions in the GCC. We guide you through credentialing, licensing, and placement.",
          image: "/images/home/solution-doctors.png",
          action: { label: "Get Started", href: "/join" },
          tone: "primary",
        },
        {
          title: "For Hospitals & Clinics",
          body: "Find qualified healthcare professionals through a trusted medical recruitment partner. Secure high-caliber clinical consultants and administrative staff.",
          image: "/images/home/solution-hospitals.png",
          action: { label: "Get Started", href: "/join" },
          tone: "dark",
        },
      ],
    },
  },
];

const aboutBlocks = [
  {
    key: "hero",
    page: "ABOUT" as const,
    sortOrder: 0,
    title: "About our company",
    body: "HealthArabia is a premier Saudi-owned specialist medical recruitment consultancy assisting world-class clinical leaders to relocate seamlessly.",
    data: {
      bgImage: "/images/home/hero-bg.png",
    },
  },
  {
    key: "vision-mission",
    page: "ABOUT" as const,
    sortOrder: 1,
    title: null,
    body: null,
    data: {
      vision: {
        title: "Our Vision",
        body: "To be the most reliable and efficient gateway for qualified Western medical professionals seeking high-profile consultant, specialist, and leadership opportunities across the Arabian Peninsula.",
      },
      mission: {
        title: "Our Mission",
        body: "To deliver a premier, personalized, and fully transparent medical recruitment experience. We combine deep GCC market knowledge with dedicated candidate support systems to guarantee seamless integration.",
      },
    },
  },
  {
    key: "approach",
    page: "ABOUT" as const,
    sortOrder: 2,
    title: "Your Relocation Journey Step-by-Step",
    body: null,
    data: {
      eyebrow: "OUR APPROACH",
      steps: [
        { step: 1, name: "Apply", desc: "CV Upload & Initial Assessment" },
        { step: 2, name: "Consult", desc: "Qualifications Review & Goals Align" },
        { step: 3, name: "Match", desc: "Targeted Hospital Submissions" },
        { step: 4, name: "Interview", desc: "Direct Clinical Board Meetings" },
        { step: 5, name: "Placement", desc: "Credentialing & Relocation Support" },
      ],
    },
  },
  {
    key: "why-choose-us",
    page: "ABOUT" as const,
    sortOrder: 3,
    title: "A Higher Standard of Recruitment",
    body: null,
    data: {
      eyebrow: "WHY CHOOSE US",
      items: [
        {
          num: 1,
          title: "Personal Service",
          desc: "A dedicated medical consultant acts as your single point of contact throughout the entire process.",
        },
        {
          num: 2,
          title: "Expert Matching",
          desc: "Deep understanding of GCC credentialing regulations and complex clinical hierarchies.",
        },
        {
          num: 3,
          title: "End-to-End Support",
          desc: "From license evaluation and document translation to secure relocation assistance.",
        },
        {
          num: 4,
          title: "Trusted Network",
          desc: "Direct pathways to the premier flagship clinical complexes across Saudi & the Gulf.",
        },
      ],
    },
  },
];

const countriesBlocks = [
  {
    key: "hero",
    page: "COUNTRIES" as const,
    sortOrder: 0,
    title: "Explore Opportunities",
    body: "Relocating to the Arabian Peninsula offers medical professionals unparalleled career progression, tax-free packages, and a rich lifestyle standard.",
    data: {
      bgImage: "/images/home/hero-bg.png",
      eyebrow: "SELECT A COUNTRY",
      subtitle: "Find below information relating to the countries",
    },
  },
];

const hospitalsBlocks = [
  {
    key: "hero",
    page: "HOSPITALS" as const,
    sortOrder: 0,
    title: "Healthcare Establishments",
    body: "HealthArabia partners directly with premium government, military, and private entities across Saudi Arabia and the GCC region to source high-caliber candidates.",
    data: {
      bgImage: "/images/hospitals/hospital-card.png",
      eyebrow: "SELECT A HOSPITAL",
      subtitle: "Please find below information relating to our client institutions.",
    },
  },
];

const faqBlocks = [
  {
    key: "hero",
    page: "FAQ" as const,
    sortOrder: 0,
    title: "Healthcare Establishments",
    body: "HealthArabia partners directly with premium government, military, and private entities across Saudi Arabia and the GCC region to source high-caliber candidates.",
    data: {
      bgImage: "/images/home/hero-bg.png",
      eyebrow: "CLEAR ANSWERS",
      subtitle: "Frequently Asked Questions",
    },
  },
];

const contactBlocks = [
  {
    key: "hero",
    page: "CONTACT" as const,
    sortOrder: 0,
    title: "Contact Us",
    body: "HealthArabia partners directly with premium government, military, and private entities across Saudi Arabia and the GCC region to source high-caliber candidates.",
    data: {
      bgImage: "/images/home/hero-bg.png",
    },
  },
  {
    key: "direct-contacts",
    page: "CONTACT" as const,
    sortOrder: 1,
    title: "Direct Contacts",
    body: null,
    data: {
      phone: "+44 7622 719082",
      hours: "Mon–Fri, 9AM–6PM GMT",
      location: "London, United Kingdom",
      mapImage: "/images/common/map-illustration.png",
    },
  },
];

const jobsBlocks = [
  {
    key: "hero",
    page: "JOBS" as const,
    sortOrder: 0,
    title: "Find Your Career Opportunity",
    body: "HealthArabia partners directly with premium government, military, and private entities across Saudi Arabia and the GCC region to source high-caliber candidates.",
    data: {
      bgImage: "/images/home/hero-bg.png",
      search: {
        specialtyLabel: "Specialty",
        specialtyPlaceholder: "Select Specialty",
        locationLabel: "Location",
        locationPlaceholder: "All GCC Countries",
        jobTypeLabel: "Job Type",
        jobTypePlaceholder: "All Positions",
        submitLabel: "Search Jobs",
      },
    },
  },
];


const testimonials = [
  {
    authorName: "Dr. Sarah Ahmed",
    authorTitle: "Cardiologist",
    authorLocation: "Riyadh",
    quote:
      "The credentialing assistance provided by AlMahrer was exceptional. They handled my SCFHS license registration flawlessly, making my transition from London to Riyadh seamless.",
    photoStorageKey: "/images/testimonials/sarah-ahmed.png",
  },
  {
    authorName: "Nurse James Wilson",
    authorTitle: "ICU Nurse Specialist",
    authorLocation: "Jeddah",
    quote:
      "I highly recommend AlMahrer for clinical professionals seeking GCC relocation. Transparent consultation, swift coordination of interviews, and generous family package negotiation support.",
    photoStorageKey: "/images/testimonials/james-wilson.png",
  },
  {
    authorName: "Dr. Fatima Al-Rashid",
    authorTitle: "Consultant Paediatrician",
    authorLocation: "Doha",
    quote:
      "The local regional knowledge within AlMahrer is outstanding. They mapped my credentials directly to a flagship pediatric complex in Qatar with a highly competitive package.",
    photoStorageKey: "/images/testimonials/fatima-al-rashid.png",
  },
];

const countries = [
  {
    slug: "saudi-arabia",
    nameEn: "Saudi Arabia",
    nameAr: "المملكة العربية السعودية",
    isoCode: "SA",
    sortOrder: 0,
    summaryEn:
      "The largest healthcare sector in the GCC, spanning premier government complexes, advanced military centers, and private clinical networks. Urgent demand for Consultants.",
    heroImage: "/images/countries/saudi-arabia.png",
    isGuidePublished: true,
    populationStat: "14 million are Saudis and the rest expatriates",
    currencyStat: "SR 5.8 = £1.00  |  SR 3.65 = $US 1.00",
    sections: [
      {
        title: "LOCATION",
        body: "The Kingdom of Saudi Arabia dominates the Arabian Peninsular in most ways. It's land area dwarfs the other nations; it takes up the entire block of land from the borders with Iraq and Jordan in the north to it's southern borders with Oman and Yemen over 1500 kms away. The Red Sea coast stretches for all of that distance, the Arabian Gulf coast for over 500kms from the north until it reaches the Qatar Peninsular. The total land area is over 2 million sq kms although more than one third of this area is taken up by the worlds largest sand desert, the Rub Al Khali or Empty Quarter. Other than the Empty Quarter and the Nafud, the large sand desert in the north most of the rest of the country is made up of scrub desert plains. The exception is in the west where the Hejaz mountain range parallels the west coast for a substantial part of its length. Distances are large; Jeddah, the major west coast city is over 1000 kms away from Riyadh and this in turn is over 400 kms away from the major cities of the east coast.",
      },
      {
        title: "SOCIAL CLIMATE",
        body: "Of all the gulf nations Saudi Arabia epitomises the meeting point of traditional Arabic/Islamic culture and the influence of life in a modern oncology nation. Saudi Arabia is the least familiar of social environments for the expatriate to enter. In Saudi Arabia alone of the states of the Arabian Peninsular women cannot drive. There is segregation of the sexes and restaurants have family sections where women, silent or not, must sit. There are separate sections for women on public transport (not the airlines). Dress codes apply and need to be adhered to. One of the fundamental ideas is to keep women and men separate except for family members. Unmarried men and women cannot cohabit under any circumstances. This said, the above rules are more stringent for Muslim women who are required to wear a cloak and head dress at all times outside the home and cannot travel alone. For expatriates there is some flexibility; coats can be used although women must sit in the back, and the dress code can mean wearing the cloak loosely with modest clothing. At the minimum the dress code is skirts below the knees, sleeves below the elbow and modest necklines. There is no problem for women wandering around the souks and shopping areas and being out with other women is preferable to travelling or walking alone. Per men it is not acceptable to go bare-chested or in shorts. These rules do not apply away from public places and amongst single-sex groups.",
      },
      {
        title: "POPULATION",
        body: "The total population of Saudi Arabia is uncertain. Official estimates put the figure at 22 million of which 16 million are Saudis and the rest expatriates of many varied nationalities, but mainly from India, Pakistan, The Philippines, and Egypt and there are large communities of these nationalities in each large city. The Saudis themselves are a desert peoples with long established trading and pilgrimage routes in the west and to a more limited extent in the east. The peoples of the central areas tend to have been less exposed to foreign peoples due to their isolation. In west and east the influx of peoples from other nations over many years has led to greater diversity of peoples within the population than is the case in the interior. The population spread is based on three main urban areas, large regional towns (mostly area military/administrative centres and oasis towns) and smaller centres of population.",
      },
      {
        title: "GENERAL INFORMATION",
        body: "The Saudi Arabian economy is based on oil in a large way. The Kingdom produces between 8 – 10 million barrels of oil a day and oil revenue finances all sector of the economy. The economic base has been diversified to a degree into heavy industry, petrochemicals and agriculture however a large proportion of all activities are by-products of the oil industry or suppliers to it, or very heavily subsidised. The reliance on oil does mean that Saudi Arabia, more than most other nations is subject to the direct economic influence and budgetary effect of rises and falls in the price of oil. Oil has been the source of the remarkable achievements in growth and development of Saudi Arabia. In the last 40 years a modern infrastructure has been created for 17 million people. The country is unrecognisable from even 30 years ago. Major roadways link the main cities, electricity reaches almost all, major diseases once endemic have almost disappeared, good quality healthcare is free to all and both boys and girls at school and men and women in the universities are educated free of charge.",
      },
      {
        title: "CURRENCY",
        body: "The currency of Saudi Arabia is the Saudi Riyal (SAR). Pegged to the US Dollar at approximately 3.75 SAR = 1 USD (or 5.8 SAR = 1 GBP), providing financial predictability for international consultants. Modern banking systems enable seamless international salary remittances.",
      },
    ],
  },
  {
    slug: "bahrain",
    nameEn: "Bahrain",
    nameAr: "البحرين",
    isoCode: "BH",
    sortOrder: 1,
    summaryEn: "Premium specialist centers offering clinical excellence and comfortable coastal living.",
    heroImage: "/images/countries/bahrain.png",
    isGuidePublished: true,
  },
  {
    slug: "qatar",
    nameEn: "Qatar",
    nameAr: "قطر",
    isoCode: "QA",
    sortOrder: 2,
    summaryEn: "World-class academic health and research centers focusing on state-of-the-art tech.",
    heroImage: "/images/countries/qatar.png",
    isGuidePublished: true,
  },
  {
    slug: "united-arab-emirates",
    nameEn: "United Arab Emirates",
    nameAr: "الإمارات العربية المتحدة",
    isoCode: "AE",
    sortOrder: 3,
    summaryEn: "Flagship facilities in Dubai & Abu Dhabi offering diverse expat communities.",
    heroImage: "/images/countries/united-arab-emirates.png",
    isGuidePublished: true,
  },
  {
    slug: "oman",
    nameEn: "Oman",
    nameAr: "عمان",
    isoCode: "OM",
    sortOrder: 4,
    summaryEn: "Regional clinical networks backed by stunning geography and ancient heritage.",
    heroImage: "/images/countries/oman.png",
    isGuidePublished: true,
  },
  {
    slug: "kuwait",
    nameEn: "Kuwait",
    nameAr: "الكويت",
    isoCode: "KW",
    sortOrder: 5,
    summaryEn: "State-of-the-art private specialized care setups in premium locations.",
    heroImage: "/images/countries/kuwait.png",
    isGuidePublished: true,
  },
];

const faqs = [
  {
    question: "How do I apply for a job?",
    answer:
      "You can start by submitting your CV through our secure portal or applying directly to any listed vacancy on our Available Jobs page. A dedicated medical recruitment consultant will evaluate your clinical profile within 48 hours and coordinate next steps.",
  },
  {
    question: "How do I submit my CV?",
    answer:
      "Simply click 'Upload Your CV' on the homepage or through our application portal. Fill in your professional credentials, and attach your latest resume. Complete confidentiality is guaranteed.",
  },
  {
    question: "Can I apply from outside Saudi Arabia?",
    answer:
      "Yes. We specialize in international medical recruitment and relocation, helping healthcare practitioners from the UK, Europe, North America, and globally transition to the GCC.",
  },
  {
    question: "What specialties do you recruit?",
    answer:
      "We recruit across all clinical specialties including Cardiology, Intensive Care, Pediatrics, Surgery, Oncology, Emergency Medicine, and Senior Healthcare Management.",
  },
  {
    question: "How does the recruitment process work?",
    answer:
      "Our 5-step process covers Application & CV Assessment, Consultation & Qualifications Review, Targeted Hospital Submissions, Clinical Board Interviews, and Credentialing & Relocation Support.",
  },
  {
    question: "How long does the process take?",
    answer:
      "The timeline typically spans 2 to 4 months, depending on the regulatory licensing authority (such as SCFHS or DOH) and notice periods.",
  },
  {
    question: "Can hospitals request recruitment services?",
    answer:
      "Yes. Healthcare facilities and clinics can partner with Health Arabia to request high-caliber consultants and specialist clinical teams directly.",
  },
  {
    question: "Which GCC countries do you cover?",
    answer:
      "We cover Saudi Arabia, the United Arab Emirates, Qatar, Bahrain, Oman, and Kuwait.",
  },
];

const contactSubjects = [
  { code: "JOB_APPLICATION", nameEn: "Job Application", nameAr: "طلب توظيف", sortOrder: 0 },
  { code: "HOSPITAL_STAFFING", nameEn: "Hospital Staffing", nameAr: "توظيف للمستشفيات", sortOrder: 1 },
  { code: "CREDENTIALING", nameEn: "Credentialing & Licensing", nameAr: "التراخيص والاعتماد", sortOrder: 2 },
  { code: "GENERAL", nameEn: "General Inquiry", nameAr: "استفسار عام", sortOrder: 3 },
];

async function main() {
  await prisma.siteSetting.upsert({
    where: { key: "header" },
    update: { value: header },
    create: { key: "header", value: header },
  });
  await prisma.siteSetting.upsert({
    where: { key: "footer" },
    update: { value: footer },
    create: { key: "footer", value: footer },
  });

  const allBlocks = [
    ...homeBlocks,
    ...aboutBlocks,
    ...countriesBlocks,
    ...hospitalsBlocks,
    ...faqBlocks,
    ...contactBlocks,
    ...jobsBlocks,
  ];

  for (const block of allBlocks) {
    const fields = {
      title: block.title,
      body: block.body,
      data: block.data,
      sortOrder: block.sortOrder,
      isPublished: true,
    };
    await prisma.contentBlock.upsert({
      where: { page_key_locale: { page: block.page, key: block.key, locale: "EN" } },
      update: fields,
      create: { page: block.page, key: block.key, locale: "EN", ...fields },
    });
  }

  await prisma.testimonial.deleteMany({ where: { locale: "EN" } });

  for (let index = 0; index < testimonials.length; index++) {
    const t = testimonials[index];
    const asset = await prisma.fileAsset.upsert({
      where: { storageKey: t.photoStorageKey },
      update: {},
      create: {
        storageKey: t.photoStorageKey,
        originalName: t.photoStorageKey.split("/").pop() ?? "avatar.png",
        mimeType: "image/png",
        sizeBytes: 1250000,
        kind: "CONTENT_IMAGE",
        visibility: "PUBLIC",
      },
    });

    await prisma.testimonial.create({
      data: {
        authorName: t.authorName,
        authorTitle: t.authorTitle,
        authorLocation: t.authorLocation,
        quote: t.quote,
        locale: "EN",
        sortOrder: index,
        isPublished: true,
        photoId: asset.id,
      },
    });
  }

  // Seed GCC countries
  for (const c of countries) {
    let heroAssetId: string | null = null;
    if (c.heroImage) {
      const asset = await prisma.fileAsset.upsert({
        where: { storageKey: c.heroImage },
        update: {},
        create: {
          storageKey: c.heroImage,
          originalName: c.heroImage.split("/").pop() ?? "country.png",
          mimeType: "image/png",
          sizeBytes: 1600000,
          kind: "CONTENT_IMAGE",
          visibility: "PUBLIC",
        },
      });
      heroAssetId = asset.id;
    }

    const country = await prisma.country.upsert({
      where: { slug: c.slug },
      update: {
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        isoCode: c.isoCode,
        isGcc: true,
        isActive: true,
        sortOrder: c.sortOrder,
        summaryEn: c.summaryEn,
        heroImageId: heroAssetId,
        isGuidePublished: c.isGuidePublished,
      },
      create: {
        slug: c.slug,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        isoCode: c.isoCode,
        isGcc: true,
        isActive: true,
        sortOrder: c.sortOrder,
        summaryEn: c.summaryEn,
        heroImageId: heroAssetId,
        isGuidePublished: c.isGuidePublished,
      },
    });

    if (c.sections && c.sections.length > 0) {
      await prisma.countryGuideSection.deleteMany({ where: { countryId: country.id } });
      for (let sIdx = 0; sIdx < c.sections.length; sIdx++) {
        const sec = c.sections[sIdx];
        await prisma.countryGuideSection.create({
          data: {
            countryId: country.id,
            locale: "EN",
            title: sec.title,
            body: sec.body,
            sortOrder: sIdx,
          },
        });
      }
    }
  }

  // Seed UAE country & Abu Dhabi city for the hospital
  const uaeCountry = await prisma.country.findUnique({ where: { slug: "united-arab-emirates" } });
  let abuDhabiCity = null;
  if (uaeCountry) {
    abuDhabiCity = await prisma.city.upsert({
      where: { countryId_nameEn: { countryId: uaeCountry.id, nameEn: "Abu Dhabi" } },
      update: {},
      create: {
        countryId: uaeCountry.id,
        nameEn: "Abu Dhabi",
        nameAr: "أبو ظبي",
        isActive: true,
        sortOrder: 0,
      },
    });

    await prisma.city.upsert({
      where: { countryId_nameEn: { countryId: uaeCountry.id, nameEn: "Dubai" } },
      update: {},
      create: {
        countryId: uaeCountry.id,
        nameEn: "Dubai",
        nameAr: "دبي",
        isActive: true,
        sortOrder: 1,
      },
    });
  }

  // Seed sample approved hospital confirmed in Figma (Zayed Military Hospital)
  const hospitalLogoAsset = await prisma.fileAsset.upsert({
    where: { storageKey: "/images/hospitals/hospital-card.png" },
    update: {},
    create: {
      storageKey: "/images/hospitals/hospital-card.png",
      originalName: "hospital-card.png",
      mimeType: "image/png",
      sizeBytes: 1550000,
      kind: "FACILITY_LOGO",
      visibility: "PUBLIC",
    },
  });

  const defaultPasswordHash = await hashPassword("Password123!");

  const facilityOfficerEmail = "officer.zayed@healtharabia.com";
  const officerUser = await prisma.user.upsert({
    where: { email: facilityOfficerEmail },
    update: { status: "APPROVED", passwordHash: defaultPasswordHash },
    create: {
      email: facilityOfficerEmail,
      passwordHash: defaultPasswordHash,
      role: "FACILITY",
      status: "APPROVED",
      displayName: "Recruitment Officer",
    },
  });

  // Seed sample approved doctor (Dr. Sarah Ahmed from Figma)
  const doctorEmail = "doctor.sarah@healtharabia.com";
  const doctorMobile = "+966501234567";
  const doctorUser = await prisma.user.upsert({
    where: { mobileE164: doctorMobile },
    update: {
      email: doctorEmail,
      status: "APPROVED",
      passwordHash: defaultPasswordHash,
    },
    create: {
      email: doctorEmail,
      mobileE164: doctorMobile,
      passwordHash: defaultPasswordHash,
      role: "DOCTOR",
      status: "APPROVED",
      displayName: "Dr. Sarah Ahmed",
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: doctorUser.id },
    update: {
      fullName: "Dr. Sarah Ahmed",
      jobTitle: "Consultant Paediatric Cardiologist",
      yearsOfExperience: 10,
    },
    create: {
      userId: doctorUser.id,
      fullName: "Dr. Sarah Ahmed",
      jobTitle: "Consultant Paediatric Cardiologist",
      yearsOfExperience: 10,
    },
  });

  // Seed a sample PENDING_REVIEW doctor for status testing
  const pendingMobile = "+966509876543";
  await prisma.user.upsert({
    where: { mobileE164: pendingMobile },
    update: { passwordHash: defaultPasswordHash, status: "PENDING_REVIEW" },
    create: {
      email: "doctor.pending@healtharabia.com",
      mobileE164: pendingMobile,
      passwordHash: defaultPasswordHash,
      role: "DOCTOR",
      status: "PENDING_REVIEW",
      displayName: "Dr. Tariq Pending",
      submittedForReviewAt: new Date(),
    },
  });

  await prisma.facility.upsert({
    where: { slug: "zayed-military-hospital" },
    update: {
      name: "Zayed Military Hospital, Abu Dhabi",
      type: "MILITARY",
      description:
        "Referral hospital of the armed forces in UAE\nA 360 bedded hospital located centrally in Abu Dhabi city. For more information regarding Zayed Military Hospital and available vacancies please don’t hesitate to contact us today.",
      address: "Abu Dhabi Central District, UAE",
      employeeCount: 360,
      officerName: "Dr. Ahmed Al-Mansoori",
      officerPhone: "+971 2 444 0000",
      isListedPublicly: true,
      publicListingEnabledAt: new Date(),
      countryId: uaeCountry?.id ?? null,
      cityId: abuDhabiCity?.id ?? null,
      logoId: hospitalLogoAsset.id,
    },
    create: {
      userId: officerUser.id,
      slug: "zayed-military-hospital",
      name: "Zayed Military Hospital, Abu Dhabi",
      type: "MILITARY",
      description:
        "Referral hospital of the armed forces in UAE\nA 360 bedded hospital located centrally in Abu Dhabi city. For more information regarding Zayed Military Hospital and available vacancies please don’t hesitate to contact us today.",
      address: "Abu Dhabi Central District, UAE",
      employeeCount: 360,
      officerName: "Dr. Ahmed Al-Mansoori",
      officerPhone: "+971 2 444 0000",
      isListedPublicly: true,
      publicListingEnabledAt: new Date(),
      countryId: uaeCountry?.id ?? null,
      cityId: abuDhabiCity?.id ?? null,
      logoId: hospitalLogoAsset.id,
    },
  });

  // Seed FAQs
  await prisma.faq.deleteMany({ where: { locale: "EN" } });
  for (let fIdx = 0; fIdx < faqs.length; fIdx++) {
    const f = faqs[fIdx];
    await prisma.faq.create({
      data: {
        locale: "EN",
        question: f.question,
        answer: f.answer,
        sortOrder: fIdx,
        isPublished: true,
      },
    });
  }

  // Seed ContactSubjectOptions
  for (const s of contactSubjects) {
    await prisma.contactSubjectOption.upsert({
      where: { code: s.code },
      update: { nameEn: s.nameEn, nameAr: s.nameAr, sortOrder: s.sortOrder, isActive: true },
      create: { code: s.code, nameEn: s.nameEn, nameAr: s.nameAr, sortOrder: s.sortOrder, isActive: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Stage 3: Reference options and published demo jobs (matching Figma frames)
  // Note: All jobs and facilities in this seed are demo/development data.
  // ---------------------------------------------------------------------------

  // Currencies
  const currencies = [
    { code: "GBP", nameEn: "British Pound", nameAr: "جنيه إسترليني", symbol: "£", sortOrder: 0 },
    { code: "SAR", nameEn: "Saudi Riyal", nameAr: "ريال سعودي", symbol: "SR", sortOrder: 1 },
    { code: "AED", nameEn: "UAE Dirham", nameAr: "درهم إماراتي", symbol: "AED", sortOrder: 2 },
    { code: "USD", nameEn: "US Dollar", nameAr: "دولار أمريكي", symbol: "$", sortOrder: 3 },
  ];
  for (const cur of currencies) {
    await prisma.currency.upsert({
      where: { code: cur.code },
      update: { nameEn: cur.nameEn, nameAr: cur.nameAr, symbol: cur.symbol, sortOrder: cur.sortOrder, isActive: true },
      create: { code: cur.code, nameEn: cur.nameEn, nameAr: cur.nameAr, symbol: cur.symbol, sortOrder: cur.sortOrder, isActive: true },
    });
  }

  // Salary periods
  const salaryPeriods = [
    { code: "MONTH", nameEn: "Month", nameAr: "شهرياً", sortOrder: 0 },
    { code: "YEAR", nameEn: "Year", nameAr: "سنوياً", sortOrder: 1 },
  ];
  for (const sp of salaryPeriods) {
    await prisma.salaryPeriodOption.upsert({
      where: { code: sp.code },
      update: { nameEn: sp.nameEn, nameAr: sp.nameAr, sortOrder: sp.sortOrder, isActive: true },
      create: { code: sp.code, nameEn: sp.nameEn, nameAr: sp.nameAr, sortOrder: sp.sortOrder, isActive: true },
    });
  }
  const monthPeriod = await prisma.salaryPeriodOption.findUnique({ where: { code: "MONTH" } });

  // Employment types (matching Figma badges: "Permanent", etc.)
  const employmentTypes = [
    { code: "PERMANENT", nameEn: "Permanent", nameAr: "دائم", sortOrder: 0 },
    { code: "CONTRACT", nameEn: "Contract", nameAr: "عقد محدد المدة", sortOrder: 1 },
    { code: "LOCUM", nameEn: "Locum", nameAr: "مؤقت", sortOrder: 2 },
  ];
  for (const et of employmentTypes) {
    await prisma.employmentTypeOption.upsert({
      where: { code: et.code },
      update: { nameEn: et.nameEn, nameAr: et.nameAr, sortOrder: et.sortOrder, isActive: true },
      create: { code: et.code, nameEn: et.nameEn, nameAr: et.nameAr, sortOrder: et.sortOrder, isActive: true },
    });
  }
  const permanentType = await prisma.employmentTypeOption.findUnique({ where: { code: "PERMANENT" } });

  // Specialties (matching Figma filters: Paediatrics & ICU, Radiology, Internal Medicine, Surgery, Anaesthetics)
  const specialties = [
    { slug: "paediatrics-icu", nameEn: "Paediatrics & ICU", nameAr: "طب الأطفال والعناية المركزة", sortOrder: 0 },
    { slug: "radiology", nameEn: "Radiology", nameAr: "الأشعة التشخيصية", sortOrder: 1 },
    { slug: "internal-medicine", nameEn: "Internal Medicine", nameAr: "الباطنة العامة", sortOrder: 2 },
    { slug: "surgery", nameEn: "Surgery", nameAr: "الجراحة العامة", sortOrder: 3 },
    { slug: "anaesthetics", nameEn: "Anaesthetics", nameAr: "التخدير وعلاج الألم", sortOrder: 4 },
    { slug: "cardiology", nameEn: "Cardiology", nameAr: "أمراض القلب", sortOrder: 5 },
  ];
  for (const sp of specialties) {
    await prisma.specialty.upsert({
      where: { slug: sp.slug },
      update: { nameEn: sp.nameEn, nameAr: sp.nameAr, sortOrder: sp.sortOrder, isActive: true },
      create: { slug: sp.slug, nameEn: sp.nameEn, nameAr: sp.nameAr, sortOrder: sp.sortOrder, isActive: true },
    });
  }

  // Cities (Dammam, Riyadh, Jeddah in KSA; Abu Dhabi, Dubai in UAE)
  const ksaCountry = await prisma.country.findUnique({ where: { slug: "saudi-arabia" } });
  let dammamCity = null;
  let riyadhCity = null;
  if (ksaCountry) {
    dammamCity = await prisma.city.upsert({
      where: { countryId_nameEn: { countryId: ksaCountry.id, nameEn: "Dammam" } },
      update: {},
      create: { countryId: ksaCountry.id, nameEn: "Dammam", nameAr: "الدمام", sortOrder: 0, isActive: true },
    });
    riyadhCity = await prisma.city.upsert({
      where: { countryId_nameEn: { countryId: ksaCountry.id, nameEn: "Riyadh" } },
      update: {},
      create: { countryId: ksaCountry.id, nameEn: "Riyadh", nameAr: "الرياض", sortOrder: 1, isActive: true },
    });
    await prisma.city.upsert({
      where: { countryId_nameEn: { countryId: ksaCountry.id, nameEn: "Jeddah" } },
      update: {},
      create: { countryId: ksaCountry.id, nameEn: "Jeddah", nameAr: "جدة", sortOrder: 2, isActive: true },
    });
    await prisma.city.upsert({
      where: { countryId_nameEn: { countryId: ksaCountry.id, nameEn: "Al Khobar" } },
      update: {},
      create: { countryId: ksaCountry.id, nameEn: "Al Khobar", nameAr: "الخبر", sortOrder: 3, isActive: true },
    });
  }

  // Verified public facility for linking demo jobs
  const zayedFacility = await prisma.facility.findUnique({ where: { slug: "zayed-military-hospital" } });

  if (zayedFacility && ksaCountry && dammamCity && permanentType && monthPeriod) {
    const paediatricsSpecialty = await prisma.specialty.findUnique({ where: { slug: "paediatrics-icu" } });
    const radiologySpecialty = await prisma.specialty.findUnique({ where: { slug: "radiology" } });
    const internalSpecialty = await prisma.specialty.findUnique({ where: { slug: "internal-medicine" } });
    const surgerySpecialty = await prisma.specialty.findUnique({ where: { slug: "surgery" } });

    // Seed 6 demo published jobs matching Figma frames 351:1303 & 421:6082
    const demoJobs = [
      {
        ref: 354,
        title: "Consultant Paediatric ICU",
        specialtyId: paediatricsSpecialty?.id ?? "",
        countryId: ksaCountry.id,
        cityId: dammamCity.id,
        employmentTypeId: permanentType.id,
        minYearsExperience: 3,
        description:
          "Requires UK CCT / American Board with minimum 3 years Consultant experience. Outstanding family benefits package included.",
        responsibilities: [
          "Provide direct patient care and continuous monitoring in the paediatric intensive care unit",
          "Assist physicians during medical procedures and emergency interventions",
          "Maintain accurate and up-to-date patient medical records",
          "Collaborate with interdisciplinary healthcare teams for optimal patient outcomes",
          "Educate patients and families on treatment plans and discharge instructions",
          "Ensure compliance with hospital policies and healthcare regulations",
        ],
        requirements: [
          "Bachelor's Degree in Medicine / Nursing or equivalent clinical doctorate",
          "Valid medical consultant license or board certification (UK CCT / American Board)",
          "BLS & ACLS Certification",
          "3-5 years of specialized intensive care experience",
          "Strong communication and teamwork skills",
          "Proficiency in electronic medical records (EMR)",
        ],
        benefits: [
          "Tax-free competitive salary package",
          "Comprehensive family medical insurance",
          "Annual business-class flights to home country",
          "Generous housing allowance and relocation assistance",
          "Children education allowance support",
          "End-of-service gratuity and paid annual leave",
        ],
        salaryMin: 9000,
        salaryMax: 10000,
        salaryCurrencyCode: "GBP",
        salaryPeriodId: monthPeriod.id,
        isUrgent: true,
      },
      {
        ref: 355,
        title: "Consultant Radiologist",
        specialtyId: radiologySpecialty?.id ?? "",
        countryId: ksaCountry.id,
        cityId: dammamCity.id,
        employmentTypeId: permanentType.id,
        minYearsExperience: 5,
        description:
          "Senior clinical radiologist with subspecialty expertise in MRI and CT cross-sectional reporting for tertiary healthcare complex.",
        responsibilities: [
          "Interpret diagnostic imaging examinations including MRI, CT, and Ultrasound",
          "Lead weekly multidisciplinary clinical audit and tumor board meetings",
          "Mentor junior clinical fellows and radiology residents",
          "Ensure quality standards and protocol adherence in diagnostic imaging",
        ],
        requirements: [
          "FRCR, American Board, or European Board in Diagnostic Radiology",
          "Minimum 5 years post-specialist certification experience",
          "Valid clinical license in home country",
        ],
        benefits: [
          "Tax-free competitive package",
          "Full family healthcare coverage",
          "Annual roundtrip tickets",
          "Furnished executive accommodation",
        ],
        salaryMin: 9500,
        salaryMax: 11000,
        salaryCurrencyCode: "GBP",
        salaryPeriodId: monthPeriod.id,
        isUrgent: false,
      },
      {
        ref: 356,
        title: "Consultant Internal Medicine",
        specialtyId: internalSpecialty?.id ?? "",
        countryId: ksaCountry.id,
        cityId: riyadhCity?.id ?? dammamCity.id,
        employmentTypeId: permanentType.id,
        minYearsExperience: 3,
        description:
          "Seeking an experienced Consultant in General Internal Medicine to lead inpatient and ambulatory patient care programs.",
        responsibilities: [
          "Manage complex multi-morbidity inpatient admissions",
          "Conduct routine specialized outpatient clinics",
          "Supervise medical emergency response protocols",
        ],
        requirements: [
          "MRCP / American Board in Internal Medicine",
          "Minimum 3 years consultant level clinical experience",
          "Active professional license",
        ],
        benefits: [
          "Tax-free salary package",
          "Executive healthcare benefits",
          "Relocation and housing allowances",
        ],
        salaryMin: 8500,
        salaryMax: 9500,
        salaryCurrencyCode: "GBP",
        salaryPeriodId: monthPeriod.id,
        isUrgent: true,
      },
      {
        ref: 357,
        title: "Consultant General Surgeon",
        specialtyId: surgerySpecialty?.id ?? "",
        countryId: ksaCountry.id,
        cityId: dammamCity.id,
        employmentTypeId: permanentType.id,
        minYearsExperience: 4,
        description:
          "Experienced general and laparoscopic surgeon with active surgical portfolio to join regional clinical surgical team.",
        responsibilities: [
          "Perform elective and emergency laparoscopic abdominal surgical procedures",
          "Participate in on-call surgical coverage rosters",
          "Oversee perioperative patient safety workflows",
        ],
        requirements: [
          "FRCS / American Board of Surgery",
          "Minimum 4 years post-board surgical practice",
          "Proven laparoscopic fellowship credentials",
        ],
        benefits: [
          "Competitive tax-free remuneration",
          "Family health coverage and schooling support",
          "Annual leave with travel tickets",
        ],
        salaryMin: 9200,
        salaryMax: 10500,
        salaryCurrencyCode: "GBP",
        salaryPeriodId: monthPeriod.id,
        isUrgent: false,
      },
      {
        ref: 358,
        title: "Consultant Paediatric Specialist",
        specialtyId: paediatricsSpecialty?.id ?? "",
        countryId: ksaCountry.id,
        cityId: dammamCity.id,
        employmentTypeId: permanentType.id,
        minYearsExperience: 3,
        description:
          "Dedicated paediatric specialist for acute and outpatient paediatric services within our healthcare network.",
        responsibilities: [
          "Assess and treat emergency and inpatient paediatric admissions",
          "Collaborate with paediatric subspecialty services",
          "Conduct clinical family consultations and follow-ups",
        ],
        requirements: [
          "MRCPCH or American Board of Paediatrics",
          "Minimum 3 years consultant experience",
        ],
        benefits: [
          "Tax-free monthly salary",
          "Housing and transportation support",
          "Full medical coverage",
        ],
        salaryMin: 8800,
        salaryMax: 9800,
        salaryCurrencyCode: "GBP",
        salaryPeriodId: monthPeriod.id,
        isUrgent: false,
      },
      {
        ref: 359,
        title: "Consultant Anaesthetist",
        specialtyId: (await prisma.specialty.findUnique({ where: { slug: "anaesthetics" } }))?.id ?? surgerySpecialty?.id ?? "",
        countryId: ksaCountry.id,
        cityId: dammamCity.id,
        employmentTypeId: permanentType.id,
        minYearsExperience: 3,
        description:
          "Specialist anaesthetist for general, obstetric, and trauma theatre sessions with advanced airway credentials.",
        responsibilities: [
          "Administer general, regional, and neuroaxial anaesthesia",
          "Oversee post-anaesthesia care unit (PACU) patient recovery",
          "Coordinate acute pain management protocols",
        ],
        requirements: [
          "FRCA, American Board, or DESA in Anaesthesiology",
          "3+ years consultant practice in tertiary clinical settings",
        ],
        benefits: [
          "Tax-free compensation package",
          "Comprehensive health and life insurance",
          "Annual roundtrip air tickets",
        ],
        salaryMin: 9000,
        salaryMax: 10200,
        salaryCurrencyCode: "GBP",
        salaryPeriodId: monthPeriod.id,
        isUrgent: true,
      },
    ];

    for (const j of demoJobs) {
      if (!j.specialtyId) continue;
      const existing = await prisma.job.findFirst({
        where: { referenceNumber: j.ref },
      });
      if (existing) {
        await prisma.job.update({
          where: { id: existing.id },
          data: {
            title: j.title,
            specialtyId: j.specialtyId,
            countryId: j.countryId,
            cityId: j.cityId,
            employmentTypeId: j.employmentTypeId,
            minYearsExperience: j.minYearsExperience,
            description: j.description,
            responsibilities: j.responsibilities,
            requirements: j.requirements,
            benefits: j.benefits,
            salaryMin: j.salaryMin,
            salaryMax: j.salaryMax,
            salaryCurrencyCode: j.salaryCurrencyCode,
            salaryPeriodId: j.salaryPeriodId,
            isUrgent: j.isUrgent,
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        });
      } else {
        await prisma.job.create({
          data: {
            referenceNumber: j.ref,
            facilityId: zayedFacility.id,
            title: j.title,
            specialtyId: j.specialtyId,
            countryId: j.countryId,
            cityId: j.cityId,
            employmentTypeId: j.employmentTypeId,
            positions: 1,
            minYearsExperience: j.minYearsExperience,
            description: j.description,
            responsibilities: j.responsibilities,
            requirements: j.requirements,
            benefits: j.benefits,
            salaryMin: j.salaryMin,
            salaryMax: j.salaryMax,
            salaryCurrencyCode: j.salaryCurrencyCode,
            salaryPeriodId: j.salaryPeriodId,
            isUrgent: j.isUrgent,
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        });
      }
    }

    // ---------------------------------------------------------------------------
    // Enrich Dr. Sarah Ahmed's profile and applications matching Figma
    // ---------------------------------------------------------------------------
    const cardiologySpecialty = await prisma.specialty.findUnique({ where: { slug: "cardiology" } }) ?? paediatricsSpecialty;
    const allPublishedJobs = await prisma.job.findMany({ where: { status: "PUBLISHED" }, take: 6 });

    // Ensure CV asset for Dr. Sarah Ahmed
    const doctorCvAsset = await prisma.fileAsset.upsert({
      where: { storageKey: "/documents/doctor/cv_dr_sarah_ahmed.pdf" },
      update: {},
      create: {
        storageKey: "/documents/doctor/cv_dr_sarah_ahmed.pdf",
        originalName: "CV_Dr_Sarah_Ahmed.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2450000,
        kind: "CV",
        visibility: "PRIVATE",
        ownerId: doctorUser.id,
      },
    });

    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: doctorUser.id },
      data: {
        about:
          "Board-certified Consultant Cardiologist with over 10 years of specialized practice in clinical and interventional cardiology. Proven expertise in managing complex cardiac cases, advanced heart failures, and non-invasive diagnostic imaging. Dedicated to delivering patient-centric evidence-based treatments within high-capacity clinical environments.",
        currentPosition: "Head of Cardiologist",
        yearsOfExperience: 10,
        isAvailable: true,
        primarySpecialtyId: cardiologySpecialty?.id,
        residenceCountryId: ksaCountry.id,
        cvId: doctorCvAsset.id,
      },
    });

    // Seed educations
    await prisma.doctorEducation.deleteMany({ where: { doctorId: updatedProfile.id } });
    await prisma.doctorEducation.createMany({
      data: [
        {
          doctorId: updatedProfile.id,
          degree: "Fellowship of the Royal College of Physicians (FRCP)",
          institution: "Royal College of Physicians, London, UK",
          graduationYear: 2018,
          isPrimary: true,
        },
        {
          doctorId: updatedProfile.id,
          degree: "Doctor of Medicine (M.D.) in Internal Medicine",
          institution: "King Saud University, Riyadh",
          graduationYear: 2014,
          isPrimary: false,
        },
      ],
    });

    // Seed licenses
    await prisma.doctorLicense.deleteMany({ where: { doctorId: updatedProfile.id } });
    await prisma.doctorLicense.createMany({
      data: [
        {
          doctorId: updatedProfile.id,
          licenseType: "SCFHS Consultant License",
          registrationNumber: "1803C00945",
          issuingAuthority: "Saudi Commission for Health Specialties",
          expiryDate: new Date("2028-12-31"),
        },
        {
          doctorId: updatedProfile.id,
          licenseType: "American Board Certification",
          registrationNumber: "AB-CARD-7782",
          issuingAuthority: "American Board of Internal Medicine",
          expiryDate: new Date("2029-06-30"),
        },
      ],
    });

    // Seed experiences
    await prisma.doctorExperience.deleteMany({ where: { doctorId: updatedProfile.id } });
    await prisma.doctorExperience.createMany({
      data: [
        {
          doctorId: updatedProfile.id,
          position: "Consultant Cardiologist",
          organization: "National Guard Health Affairs",
          startDate: new Date("2022-01-01"),
          endDate: null,
          responsibilities:
            "Supervised daily cardiology inpatient ward and coronary intensive care unit (CCU) management. Led clinical execution of high-risk transcatheter cardiac therapeutic interventions and structural heart diagnostics.",
        },
        {
          doctorId: updatedProfile.id,
          position: "Specialist Cardiologist",
          organization: "King Fahd Armed Forces Hospital",
          startDate: new Date("2018-06-01"),
          endDate: new Date("2022-01-01"),
          responsibilities:
            "Conducted comprehensive diagnostic workups including transesophageal echocardiography (TEE) and myocardial perfusion scans.",
        },
      ],
    });

    // Seed languages
    await prisma.doctorLanguage.deleteMany({ where: { doctorId: updatedProfile.id } });
    await prisma.doctorLanguage.createMany({
      data: [
        { doctorId: updatedProfile.id, language: "Arabic", proficiency: "NATIVE" },
        { doctorId: updatedProfile.id, language: "English", proficiency: "FLUENT" },
      ],
    });

    // Seed doctor applications on published jobs (retained, no deleteMany)
    if (allPublishedJobs.length >= 4 && cardiologySpecialty) {
      const appStatuses: ("SUBMITTED" | "UNDER_REVIEW")[] = [
        "SUBMITTED",
        "UNDER_REVIEW",
        "UNDER_REVIEW",
        "SUBMITTED",
      ];
      for (let i = 0; i < 4; i++) {
        const j = allPublishedJobs[i];
        const existingApp = await prisma.application.findUnique({
          where: { jobId_doctorId: { jobId: j.id, doctorId: updatedProfile.id } },
        });
        if (!existingApp) {
          await prisma.application.create({
            data: {
              jobId: j.id,
              doctorId: updatedProfile.id,
              candidateCode: `HA-${Math.floor(1000 + Math.random() * 9000)}`,
              anonymousJobTitle: "Consultant Cardiologist",
              anonymousSpecialtyId: cardiologySpecialty.id,
              anonymousYearsOfExperience: 10,
              status: appStatuses[i],
              submittedAt: new Date(Date.now() - (i * 2 + 1) * 24 * 60 * 60 * 1000),
            },
          });
        }
      }

      // Seed saved jobs
      await prisma.savedJob.deleteMany({ where: { doctorId: updatedProfile.id } });
      await prisma.savedJob.createMany({
        data: [
          { doctorId: updatedProfile.id, jobId: allPublishedJobs[0].id },
          { doctorId: updatedProfile.id, jobId: allPublishedJobs[1].id },
        ],
      });
    }

    // Seed a second approved doctor (Dr. Omar Khaled) to apply to Zayed Military Hospital's jobs
    const approvedSecondUser = await prisma.user.upsert({
      where: { mobileE164: "+966508889999" },
      update: { status: "APPROVED", passwordHash: defaultPasswordHash },
      create: {
        email: "doctor.omar@healtharabia.com",
        mobileE164: "+966508889999",
        passwordHash: defaultPasswordHash,
        role: "DOCTOR",
        status: "APPROVED",
        displayName: "Dr. Omar Khaled",
      },
    });

    const secondDoctorProfile = await prisma.doctorProfile.upsert({
      where: { userId: approvedSecondUser.id },
      update: { isAvailable: true },
      create: {
        userId: approvedSecondUser.id,
        fullName: "Dr. Omar Khaled",
        jobTitle: "Consultant Cardiologist",
        yearsOfExperience: 12,
        isAvailable: true,
      },
    });

    if (allPublishedJobs.length >= 2 && cardiologySpecialty && secondDoctorProfile) {
      const zayedJobs = await prisma.job.findMany({ where: { facilityId: zayedFacility.id } });
      for (let zIdx = 0; zIdx < Math.min(3, zayedJobs.length); zIdx++) {
        const zJob = zayedJobs[zIdx];
        const existingApp = await prisma.application.findFirst({
          where: { jobId: zJob.id, doctorId: secondDoctorProfile.id },
        });
        if (!existingApp) {
          await prisma.application.create({
            data: {
              jobId: zJob.id,
              doctorId: secondDoctorProfile.id,
              candidateCode: `HA-${4000 + zIdx * 100}`,
              anonymousJobTitle: "Consultant Cardiologist",
              anonymousSpecialtyId: cardiologySpecialty.id,
              anonymousYearsOfExperience: 12,
              status: "SUBMITTED",
              submittedAt: new Date(Date.now() - (zIdx + 1) * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }
  }

  console.log("Seeded complete CMS and reference data for Stage 2 & Stage 3 pages successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

