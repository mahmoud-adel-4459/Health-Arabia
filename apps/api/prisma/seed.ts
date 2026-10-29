import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/security";
import {
  aboutBlocks,
  contactBlocks,
  contactSubjects,
  countries,
  countriesBlocks,
  currencies,
  employmentTypes,
  faqBlocks,
  faqs,
  footer,
  header,
  homeBlocks,
  hospitalsBlocks,
  jobsBlocks,
  salaryPeriods,
  specialties,
} from "./seed-reference-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

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
  for (const cur of currencies) {
    await prisma.currency.upsert({
      where: { code: cur.code },
      update: { nameEn: cur.nameEn, nameAr: cur.nameAr, symbol: cur.symbol, sortOrder: cur.sortOrder, isActive: true },
      create: { code: cur.code, nameEn: cur.nameEn, nameAr: cur.nameAr, symbol: cur.symbol, sortOrder: cur.sortOrder, isActive: true },
    });
  }

  // Salary periods
  for (const sp of salaryPeriods) {
    await prisma.salaryPeriodOption.upsert({
      where: { code: sp.code },
      update: { nameEn: sp.nameEn, nameAr: sp.nameAr, sortOrder: sp.sortOrder, isActive: true },
      create: { code: sp.code, nameEn: sp.nameEn, nameAr: sp.nameAr, sortOrder: sp.sortOrder, isActive: true },
    });
  }
  const monthPeriod = await prisma.salaryPeriodOption.findUnique({ where: { code: "MONTH" } });

  // Employment types (matching Figma badges: "Permanent", etc.)
  for (const et of employmentTypes) {
    await prisma.employmentTypeOption.upsert({
      where: { code: et.code },
      update: { nameEn: et.nameEn, nameAr: et.nameAr, sortOrder: et.sortOrder, isActive: true },
      create: { code: et.code, nameEn: et.nameEn, nameAr: et.nameAr, sortOrder: et.sortOrder, isActive: true },
    });
  }
  const permanentType = await prisma.employmentTypeOption.findUnique({ where: { code: "PERMANENT" } });

  // Specialties (matching Figma filters: Paediatrics & ICU, Radiology, Internal Medicine, Surgery, Anaesthetics)
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

