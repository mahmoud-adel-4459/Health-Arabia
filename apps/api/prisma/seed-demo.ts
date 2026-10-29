// LOCAL DEVELOPMENT DEMO SEED. Never run against production.
// Adds the repository's existing Figma sample records (see prisma/seed-demo-data.ts): one demo facility,
// three demo doctors (two approved, one pending review), six published demo jobs, applications, saved jobs.
//
// - Refuses to run with NODE_ENV=production or a non-localhost DATABASE_URL.
// - Requires the reference data first (pnpm db:seed:reference); never creates or changes CMS/reference rows.
// - Create-only and idempotent: existing rows are never updated or deleted, passwords are never reset,
//   and an existing non-demo account that happens to use a demo mobile/email is left untouched.
//
// Run: pnpm db:seed:demo
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/security";
import {
  DEMO_ACCOUNT_PASSWORD,
  DEMO_JOB_PREFIX,
  demoDoctors,
  demoFacility,
  demoJobs,
} from "./seed-demo-data";

const DEMO_EMAIL_DOMAIN = "@healtharabia.test";

function assertLocalDevelopment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data: NODE_ENV is production.");
  }
  let host = "";
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    throw new Error("Refusing to seed demo data: DATABASE_URL is missing or invalid.");
  }
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
    throw new Error("Refusing to seed demo data: DATABASE_URL does not point at localhost.");
  }
}

assertLocalDevelopment();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

const created: Record<string, number> = {};
const existing: Record<string, number> = {};
const skipped: string[] = [];
function tally(kind: string, wasCreated: boolean) {
  const bucket = wasCreated ? created : existing;
  bucket[kind] = (bucket[kind] ?? 0) + 1;
}

async function requireRef<T>(label: string, value: Promise<T | null>): Promise<T> {
  const found = await value;
  if (!found) {
    throw new Error(`Missing reference data (${label}). Run "pnpm db:seed:reference" first.`);
  }
  return found;
}

// Returns the demo user, creating it if missing. Returns null (and records why) if the mobile/email
// already belongs to a non-demo account, so real data is never touched.
async function ensureDemoUser(args: {
  kind: string;
  role: "DOCTOR" | "FACILITY";
  status: "APPROVED" | "PENDING_REVIEW";
  email: string;
  mobileE164?: string;
  displayName: string;
  passwordHash: string;
}) {
  const byEmail = await prisma.user.findUnique({ where: { email: args.email } });
  const byMobile = args.mobileE164 ? await prisma.user.findUnique({ where: { mobileE164: args.mobileE164 } }) : null;
  const found = byEmail ?? byMobile;
  if (found) {
    const isDemo = found.role === args.role && (found.email ?? "").endsWith(DEMO_EMAIL_DOMAIN);
    if (!isDemo || (byEmail && byMobile && byEmail.id !== byMobile.id)) {
      skipped.push(`${args.kind}: ${args.email} / ${args.mobileE164 ?? "-"} belongs to a non-demo account; left untouched`);
      return null;
    }
    tally(args.kind, false);
    return found;
  }
  const user = await prisma.user.create({
    data: {
      role: args.role,
      status: args.status,
      email: args.email,
      mobileE164: args.mobileE164 ?? null,
      displayName: args.displayName,
      passwordHash: args.passwordHash,
      ...(args.status === "PENDING_REVIEW" ? { submittedForReviewAt: new Date() } : {}),
    },
  });
  tally(args.kind, true);
  return user;
}

async function main() {
  // Reference data this seed depends on (created by the reference seed, never here)
  const uae = await requireRef("country united-arab-emirates", prisma.country.findUnique({ where: { slug: "united-arab-emirates" } }));
  const abuDhabi = await requireRef(
    "city Abu Dhabi",
    prisma.city.findUnique({ where: { countryId_nameEn: { countryId: uae.id, nameEn: demoFacility.cityName } } })
  );
  const cardiology = await requireRef("specialty cardiology", prisma.specialty.findUnique({ where: { slug: "cardiology" } }));
  const ksa = await requireRef("country saudi-arabia", prisma.country.findUnique({ where: { slug: "saudi-arabia" } }));

  const passwordHash = await hashPassword(DEMO_ACCOUNT_PASSWORD);

  // 1. Demo facility (owned by its demo recruitment officer account)
  const officer = await ensureDemoUser({
    kind: "facilityUser",
    role: "FACILITY",
    status: "APPROVED",
    email: demoFacility.officer.email,
    displayName: demoFacility.officer.displayName,
    passwordHash,
  });
  if (!officer) throw new Error("Demo facility officer account conflicts with an existing account; nothing else was created.");

  let facility = await prisma.facility.findUnique({ where: { slug: demoFacility.slug } });
  if (!facility) {
    facility = await prisma.facility.create({
      data: {
        userId: officer.id,
        slug: demoFacility.slug,
        name: demoFacility.name,
        type: demoFacility.type,
        description: demoFacility.description,
        address: demoFacility.address,
        employeeCount: demoFacility.employeeCount,
        officerName: demoFacility.officerName,
        officerPhone: demoFacility.officerPhone,
        countryId: uae.id,
        cityId: abuDhabi.id,
        isListedPublicly: demoFacility.isListedPublicly,
        publicListingEnabledAt: demoFacility.isListedPublicly ? new Date() : null,
      },
    });
    tally("facility", true);
  } else {
    tally("facility", false);
  }

  // 2. Demo jobs (published, owned by the demo facility). Matched by facility + title.
  const jobIds: string[] = [];
  for (const j of demoJobs) {
    const title = DEMO_JOB_PREFIX + j.title;
    const found = await prisma.job.findFirst({ where: { facilityId: facility.id, title } });
    if (found) {
      jobIds.push(found.id);
      tally("job", false);
      continue;
    }
    const [specialty, country, employmentType, salaryPeriod] = await Promise.all([
      requireRef(`specialty ${j.specialtySlug}`, prisma.specialty.findUnique({ where: { slug: j.specialtySlug } })),
      requireRef(`country ${j.countrySlug}`, prisma.country.findUnique({ where: { slug: j.countrySlug } })),
      requireRef(`employment type ${j.employmentTypeCode}`, prisma.employmentTypeOption.findUnique({ where: { code: j.employmentTypeCode } })),
      requireRef(`salary period ${j.salaryPeriodCode}`, prisma.salaryPeriodOption.findUnique({ where: { code: j.salaryPeriodCode } })),
    ]);
    const city = await requireRef(
      `city ${j.cityName}`,
      prisma.city.findUnique({ where: { countryId_nameEn: { countryId: country.id, nameEn: j.cityName } } })
    );
    const job = await prisma.job.create({
      data: {
        facilityId: facility.id,
        title,
        specialtyId: specialty.id,
        countryId: country.id,
        cityId: city.id,
        employmentTypeId: employmentType.id,
        positions: 1,
        minYearsExperience: j.minYearsExperience,
        description: j.description,
        responsibilities: j.responsibilities,
        requirements: j.requirements,
        benefits: j.benefits,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryCurrencyCode: j.salaryCurrencyCode,
        salaryPeriodId: salaryPeriod.id,
        isUrgent: j.isUrgent,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    jobIds.push(job.id);
    tally("job", true);
  }

  // 3. Demo doctors
  const s = demoDoctors.sarah;
  const sarahUser = await ensureDemoUser({
    kind: "doctorUser",
    role: "DOCTOR",
    status: s.status,
    email: s.email,
    mobileE164: s.mobileE164,
    displayName: s.fullName,
    passwordHash,
  });
  let sarahProfile = sarahUser ? await prisma.doctorProfile.findUnique({ where: { userId: sarahUser.id } }) : null;
  if (sarahUser && !sarahProfile) {
    sarahProfile = await prisma.doctorProfile.create({
      data: {
        userId: sarahUser.id,
        fullName: s.fullName,
        jobTitle: s.jobTitle,
        yearsOfExperience: s.yearsOfExperience,
        about: s.about,
        currentPosition: s.currentPosition,
        isAvailable: s.isAvailable,
        primarySpecialtyId: cardiology.id,
        residenceCountryId: ksa.id,
        educations: { create: s.educations.map((e, i) => ({ ...e, sortOrder: i })) },
        licenses: { create: s.licenses.map((l) => ({ ...l, expiryDate: new Date(l.expiryDate) })) },
        experiences: {
          create: s.experiences.map((e, i) => ({
            ...e,
            startDate: new Date(e.startDate),
            endDate: e.endDate ? new Date(e.endDate) : null,
            sortOrder: i,
          })),
        },
        languages: { create: s.languages },
      },
    });
    tally("doctorProfile", true);
  } else if (sarahProfile) {
    tally("doctorProfile", false);
  }

  const o = demoDoctors.omar;
  const omarUser = await ensureDemoUser({
    kind: "doctorUser",
    role: "DOCTOR",
    status: o.status,
    email: o.email,
    mobileE164: o.mobileE164,
    displayName: o.fullName,
    passwordHash,
  });
  let omarProfile = omarUser ? await prisma.doctorProfile.findUnique({ where: { userId: omarUser.id } }) : null;
  if (omarUser && !omarProfile) {
    omarProfile = await prisma.doctorProfile.create({
      data: {
        userId: omarUser.id,
        fullName: o.fullName,
        jobTitle: o.jobTitle,
        yearsOfExperience: o.yearsOfExperience,
        isAvailable: o.isAvailable,
      },
    });
    tally("doctorProfile", true);
  } else if (omarProfile) {
    tally("doctorProfile", false);
  }

  const t = demoDoctors.tariq;
  await ensureDemoUser({
    kind: "doctorUser",
    role: "DOCTOR",
    status: t.status,
    email: t.email,
    mobileE164: t.mobileE164,
    displayName: t.displayName,
    passwordHash,
  });

  // 4. Applications (anonymous to the facility) and saved jobs
  async function ensureApplication(
    doctorId: string,
    jobId: string,
    candidateCode: string,
    status: "SUBMITTED" | "UNDER_REVIEW",
    anonymousJobTitle: string,
    anonymousYearsOfExperience: number,
    daysAgo: number
  ) {
    const found =
      (await prisma.application.findUnique({ where: { jobId_doctorId: { jobId, doctorId } } })) ??
      (await prisma.application.findUnique({ where: { candidateCode } }));
    if (found) return tally("application", false);
    await prisma.application.create({
      data: {
        jobId,
        doctorId,
        candidateCode,
        anonymousJobTitle,
        anonymousSpecialtyId: cardiology.id,
        anonymousYearsOfExperience,
        status,
        submittedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      },
    });
    tally("application", true);
  }

  if (sarahProfile) {
    for (let i = 0; i < s.applicationStatuses.length && i < jobIds.length; i++) {
      await ensureApplication(
        sarahProfile.id,
        jobIds[i],
        `DEMO-S${String(i + 1).padStart(2, "0")}`,
        s.applicationStatuses[i],
        s.anonymousJobTitle,
        s.anonymousYearsOfExperience,
        i * 2 + 1
      );
    }
    for (let i = 0; i < s.savedJobCount && i < jobIds.length; i++) {
      const key = { doctorId_jobId: { doctorId: sarahProfile.id, jobId: jobIds[i] } };
      const found = await prisma.savedJob.findUnique({ where: key });
      if (!found) await prisma.savedJob.create({ data: { doctorId: sarahProfile.id, jobId: jobIds[i] } });
      tally("savedJob", !found);
    }
  }
  if (omarProfile) {
    for (let i = 0; i < o.applicationCount && i < jobIds.length; i++) {
      await ensureApplication(
        omarProfile.id,
        jobIds[i],
        `DEMO-O${String(i + 1).padStart(2, "0")}`,
        "SUBMITTED",
        o.anonymousJobTitle,
        o.anonymousYearsOfExperience,
        i + 1
      );
    }
  }

  const kinds = [...new Set([...Object.keys(created), ...Object.keys(existing)])];
  console.log("Demo seed complete (local development only; create-only, existing rows untouched):");
  for (const kind of kinds) {
    console.log(`  ${kind.padEnd(14)} created ${created[kind] ?? 0}, already present ${existing[kind] ?? 0}`);
  }
  for (const note of skipped) console.log(`  SKIPPED ${note}`);
  console.log("Demo accounts use the development password defined in prisma/seed-demo-data.ts.");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
