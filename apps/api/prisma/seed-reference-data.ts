// Shared public-site reference content used by both seeds:
//   prisma/seed.ts            (full development seed, includes demo accounts/jobs)
//   prisma/seed-reference.ts  (reference/content only, no demo records)
// Moved verbatim from prisma/seed.ts; keep values here so both seeds stay in sync.

export const header = {
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

export const footer = {
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

export const homeBlocks = [
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

export const aboutBlocks = [
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

export const countriesBlocks = [
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

export const hospitalsBlocks = [
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

export const faqBlocks = [
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

export const contactBlocks = [
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

export const jobsBlocks = [
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


export const countries = [
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

export const faqs = [
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

export const contactSubjects = [
  { code: "JOB_APPLICATION", nameEn: "Job Application", nameAr: "طلب توظيف", sortOrder: 0 },
  { code: "HOSPITAL_STAFFING", nameEn: "Hospital Staffing", nameAr: "توظيف للمستشفيات", sortOrder: 1 },
  { code: "CREDENTIALING", nameEn: "Credentialing & Licensing", nameAr: "التراخيص والاعتماد", sortOrder: 2 },
  { code: "GENERAL", nameEn: "General Inquiry", nameAr: "استفسار عام", sortOrder: 3 },
];

// Managed option lists
export const currencies = [
  { code: "GBP", nameEn: "British Pound", nameAr: "جنيه إسترليني", symbol: "£", sortOrder: 0 },
  { code: "SAR", nameEn: "Saudi Riyal", nameAr: "ريال سعودي", symbol: "SR", sortOrder: 1 },
  { code: "AED", nameEn: "UAE Dirham", nameAr: "درهم إماراتي", symbol: "AED", sortOrder: 2 },
  { code: "USD", nameEn: "US Dollar", nameAr: "دولار أمريكي", symbol: "$", sortOrder: 3 },
];

export const salaryPeriods = [
  { code: "MONTH", nameEn: "Month", nameAr: "شهرياً", sortOrder: 0 },
  { code: "YEAR", nameEn: "Year", nameAr: "سنوياً", sortOrder: 1 },
];

export const employmentTypes = [
  { code: "PERMANENT", nameEn: "Permanent", nameAr: "دائم", sortOrder: 0 },
  { code: "CONTRACT", nameEn: "Contract", nameAr: "عقد محدد المدة", sortOrder: 1 },
  { code: "LOCUM", nameEn: "Locum", nameAr: "مؤقت", sortOrder: 2 },
];

export const specialties = [
  { slug: "paediatrics-icu", nameEn: "Paediatrics & ICU", nameAr: "طب الأطفال والعناية المركزة", sortOrder: 0 },
  { slug: "radiology", nameEn: "Radiology", nameAr: "الأشعة التشخيصية", sortOrder: 1 },
  { slug: "internal-medicine", nameEn: "Internal Medicine", nameAr: "الباطنة العامة", sortOrder: 2 },
  { slug: "surgery", nameEn: "Surgery", nameAr: "الجراحة العامة", sortOrder: 3 },
  { slug: "anaesthetics", nameEn: "Anaesthetics", nameAr: "التخدير وعلاج الألم", sortOrder: 4 },
  { slug: "cardiology", nameEn: "Cardiology", nameAr: "أمراض القلب", sortOrder: 5 },
];

// Cities (same values the full seed creates for KSA and UAE)
export const cities = [
  { countrySlug: "saudi-arabia", nameEn: "Dammam", nameAr: "الدمام", sortOrder: 0 },
  { countrySlug: "saudi-arabia", nameEn: "Riyadh", nameAr: "الرياض", sortOrder: 1 },
  { countrySlug: "saudi-arabia", nameEn: "Jeddah", nameAr: "جدة", sortOrder: 2 },
  { countrySlug: "saudi-arabia", nameEn: "Al Khobar", nameAr: "الخبر", sortOrder: 3 },
  { countrySlug: "united-arab-emirates", nameEn: "Abu Dhabi", nameAr: "أبو ظبي", sortOrder: 0 },
  { countrySlug: "united-arab-emirates", nameEn: "Dubai", nameAr: "دبي", sortOrder: 1 },
];
