// LOCAL DEVELOPMENT DEMO DATA ONLY. Never seed this into production.
// Records are the existing Figma sample records from prisma/seed.ts (frames 351:1303 & 421:6082),
// with clinical/job text kept verbatim. Every record is visibly marked as demo:
//   - names and job titles carry a "Demo" marker, emails use the reserved `.test` domain,
//   - candidate codes start with "DEMO-".
// Used by prisma/seed-demo.ts (pnpm db:seed:demo).

export const DEMO_MARK = "(Demo)";
export const DEMO_JOB_PREFIX = "[Demo] ";
// Same development password the full seed uses for its sample accounts; local only.
export const DEMO_ACCOUNT_PASSWORD = "Password123!";

export const demoFacility = {
  slug: "demo-zayed-military-hospital",
  name: "Zayed Military Hospital, Abu Dhabi (Demo)",
  type: "MILITARY" as const,
  description:
    "Referral hospital of the armed forces in UAE\nA 360 bedded hospital located centrally in Abu Dhabi city. For more information regarding Zayed Military Hospital and available vacancies please don’t hesitate to contact us today.",
  address: "Abu Dhabi Central District, UAE",
  employeeCount: 360,
  officerName: "Dr. Ahmed Al-Mansoori",
  officerPhone: "+971 2 444 0000",
  countrySlug: "united-arab-emirates",
  cityName: "Abu Dhabi",
  isListedPublicly: true,
  officer: {
    email: "demo.officer.zayed@healtharabia.test",
    displayName: "Recruitment Officer (Demo)",
  },
};

export const demoDoctors = {
  sarah: {
    mobileE164: "+966501234567",
    email: "demo.doctor.sarah@healtharabia.test",
    status: "APPROVED" as const,
    fullName: "Dr. Sarah Ahmed (Demo)",
    jobTitle: "Consultant Paediatric Cardiologist",
    yearsOfExperience: 10,
    about:
      "Board-certified Consultant Cardiologist with over 10 years of specialized practice in clinical and interventional cardiology. Proven expertise in managing complex cardiac cases, advanced heart failures, and non-invasive diagnostic imaging. Dedicated to delivering patient-centric evidence-based treatments within high-capacity clinical environments.",
    currentPosition: "Head of Cardiologist",
    isAvailable: true,
    primarySpecialtySlug: "cardiology",
    residenceCountrySlug: "saudi-arabia",
    educations: [
      {
        degree: "Fellowship of the Royal College of Physicians (FRCP)",
        institution: "Royal College of Physicians, London, UK",
        graduationYear: 2018,
        isPrimary: true,
      },
      {
        degree: "Doctor of Medicine (M.D.) in Internal Medicine",
        institution: "King Saud University, Riyadh",
        graduationYear: 2014,
        isPrimary: false,
      },
    ],
    licenses: [
      {
        licenseType: "SCFHS Consultant License",
        registrationNumber: "1803C00945",
        issuingAuthority: "Saudi Commission for Health Specialties",
        expiryDate: "2028-12-31",
      },
      {
        licenseType: "American Board Certification",
        registrationNumber: "AB-CARD-7782",
        issuingAuthority: "American Board of Internal Medicine",
        expiryDate: "2029-06-30",
      },
    ],
    experiences: [
      {
        position: "Consultant Cardiologist",
        organization: "National Guard Health Affairs",
        startDate: "2022-01-01",
        endDate: null as string | null,
        responsibilities:
          "Supervised daily cardiology inpatient ward and coronary intensive care unit (CCU) management. Led clinical execution of high-risk transcatheter cardiac therapeutic interventions and structural heart diagnostics.",
      },
      {
        position: "Specialist Cardiologist",
        organization: "King Fahd Armed Forces Hospital",
        startDate: "2018-06-01",
        endDate: "2022-01-01" as string | null,
        responsibilities:
          "Conducted comprehensive diagnostic workups including transesophageal echocardiography (TEE) and myocardial perfusion scans.",
      },
    ],
    languages: [
      { language: "Arabic", proficiency: "NATIVE" as const },
      { language: "English", proficiency: "FLUENT" as const },
    ],
    // Applications to the first four demo jobs, as in seed.ts
    applicationStatuses: ["SUBMITTED", "UNDER_REVIEW", "UNDER_REVIEW", "SUBMITTED"] as const,
    anonymousJobTitle: "Consultant Cardiologist",
    anonymousYearsOfExperience: 10,
    savedJobCount: 2,
  },
  omar: {
    mobileE164: "+966508889999",
    email: "demo.doctor.omar@healtharabia.test",
    status: "APPROVED" as const,
    fullName: "Dr. Omar Khaled (Demo)",
    jobTitle: "Consultant Cardiologist",
    yearsOfExperience: 12,
    isAvailable: true,
    // Applies (SUBMITTED) to the first three demo facility jobs, as in seed.ts
    applicationCount: 3,
    anonymousJobTitle: "Consultant Cardiologist",
    anonymousYearsOfExperience: 12,
  },
  tariq: {
    mobileE164: "+966509876543",
    email: "demo.doctor.pending@healtharabia.test",
    status: "PENDING_REVIEW" as const,
    displayName: "Dr. Tariq Pending (Demo)",
  },
};


// Demo jobs for the demo facility: text copied verbatim from the demoJobs list in prisma/seed.ts.
// Titles get DEMO_JOB_PREFIX when seeded.
export const demoJobs = [
  {
    figmaRef: 354, // reference shown in Figma; the database assigns the real reference number
    title: "Consultant Paediatric ICU",
    specialtySlug: "paediatrics-icu",
    countrySlug: "saudi-arabia",
    cityName: "Dammam",
    employmentTypeCode: "PERMANENT",
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
    salaryPeriodCode: "MONTH",
    isUrgent: true,
  },
  {
    figmaRef: 355, // reference shown in Figma; the database assigns the real reference number
    title: "Consultant Radiologist",
    specialtySlug: "radiology",
    countrySlug: "saudi-arabia",
    cityName: "Dammam",
    employmentTypeCode: "PERMANENT",
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
    salaryPeriodCode: "MONTH",
    isUrgent: false,
  },
  {
    figmaRef: 356, // reference shown in Figma; the database assigns the real reference number
    title: "Consultant Internal Medicine",
    specialtySlug: "internal-medicine",
    countrySlug: "saudi-arabia",
    cityName: "Riyadh",
    employmentTypeCode: "PERMANENT",
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
    salaryPeriodCode: "MONTH",
    isUrgent: true,
  },
  {
    figmaRef: 357, // reference shown in Figma; the database assigns the real reference number
    title: "Consultant General Surgeon",
    specialtySlug: "surgery",
    countrySlug: "saudi-arabia",
    cityName: "Dammam",
    employmentTypeCode: "PERMANENT",
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
    salaryPeriodCode: "MONTH",
    isUrgent: false,
  },
  {
    figmaRef: 358, // reference shown in Figma; the database assigns the real reference number
    title: "Consultant Paediatric Specialist",
    specialtySlug: "paediatrics-icu",
    countrySlug: "saudi-arabia",
    cityName: "Dammam",
    employmentTypeCode: "PERMANENT",
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
    salaryPeriodCode: "MONTH",
    isUrgent: false,
  },
  {
    figmaRef: 359, // reference shown in Figma; the database assigns the real reference number
    title: "Consultant Anaesthetist",
    specialtySlug: "anaesthetics",
    countrySlug: "saudi-arabia",
    cityName: "Dammam",
    employmentTypeCode: "PERMANENT",
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
    salaryPeriodCode: "MONTH",
    isUrgent: true,
  },
];
