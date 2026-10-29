import { Router } from "express";
import { prisma } from "../lib/prisma";

type LocaleCode = "EN" | "AR";

function pickLocale<T>(value: unknown, locale: LocaleCode): T | null {
  if (!value || typeof value !== "object") return null;
  const byLocale = value as Record<string, T | undefined>;
  return byLocale[locale] ?? byLocale.EN ?? null;
}

export const publicJobsRouter = Router();

// GET /api/public/jobs - List published jobs with filters and search
publicJobsRouter.get("/", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";
  const ar = locale === "AR";
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string, 10) || 10));
  const skip = (page - 1) * limit;

  // Filter params from query
  const {
    specialty, // can be single slug or comma-separated slugs
    country,   // country slug
    location,  // city name / query
    type,      // employment type code (e.g. PERMANENT)
    experience,// min experience e.g. "3"
    q,         // search keyword
    sort,      // "recent" | "experience"
  } = req.query;

  // STRICT RULE: Only PUBLISHED jobs
  // STRICT RULE: Do not expose facility name or identifying facility details to doctors/public
  const where: any = {
    status: "PUBLISHED", facility: { user: { status: "APPROVED" } },
  };

  if (specialty) {
    const slugs = String(specialty)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (slugs.length === 1) {
      where.specialty = { slug: slugs[0] };
    } else if (slugs.length > 1) {
      where.specialty = { slug: { in: slugs } };
    }
  }

  if (country) {
    where.country = { slug: String(country).trim() };
  }

  if (location) {
    where.city = { nameEn: { contains: String(location).trim(), mode: "insensitive" } };
  }

  if (type) {
    where.employmentType = { code: String(type).trim().toUpperCase() };
  }

  if (experience) {
    const minExp = parseInt(String(experience), 10);
    if (!isNaN(minExp) && minExp > 0) {
      where.minYearsExperience = { gte: minExp };
    }
  }

  if (q) {
    const query = String(q).trim();
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  let orderBy: any = { publishedAt: "desc" };
  if (sort === "experience") {
    orderBy = { minYearsExperience: "desc" };
  }

  const [jobs, total, settings, blocks, specialties, countries, employmentTypes] =
    await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          referenceNumber: true,
          title: true,
          description: true,
          isUrgent: true,
          minYearsExperience: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrencyCode: true,
          // CRITICAL: NEVER select facility.name, facility.id, officer details, etc.
          // In Figma frame, employer is shown generically or as client institution
          city: { select: { nameEn: true, nameAr: true } },
          country: { select: { slug: true, nameEn: true, nameAr: true } },
          specialty: { select: { slug: true, nameEn: true, nameAr: true } },
          employmentType: { select: { code: true, nameEn: true, nameAr: true } },
          salaryPeriod: { select: { code: true, nameEn: true, nameAr: true } },
        },
      }),
      prisma.job.count({ where }),
      prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
      prisma.contentBlock.findMany({
        where: { page: "JOBS", key: "hero", isPublished: true, locale: { in: [locale, "EN"] } },
        select: { title: true, body: true, data: true },
      }),
      prisma.specialty.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
        select: { slug: true, nameEn: true, nameAr: true },
      }),
      prisma.country.findMany({
        where: { isActive: true, isGcc: true },
        orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
        select: { slug: true, nameEn: true, nameAr: true },
      }),
      prisma.employmentTypeOption.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { code: true, nameEn: true, nameAr: true },
      }),
    ]);

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;
  const heroBlock = blocks[0] ?? null;
  const name = (item: { nameEn: string; nameAr: string } | null) =>
    item ? (ar ? item.nameAr : item.nameEn) : null;

  res.set("Cache-Control", "public, max-age=60");
  res.json({
    locale,
    header: pickLocale(setting("header"), locale),
    footer: pickLocale(setting("footer"), locale),
    hero: heroBlock ? { title: heroBlock.title, body: heroBlock.body, data: heroBlock.data } : null,
    filterOptions: {
      specialties: specialties.map((s) => ({ value: s.slug, label: name(s) ?? s.nameEn })),
      countries: countries.map((c) => ({ value: c.slug, label: name(c) ?? c.nameEn })),
      employmentTypes: employmentTypes.map((e) => ({ value: e.code, label: name(e) ?? e.nameEn })),
      experienceLevels: [
        { value: "1", label: "1+ Years" },
        { value: "3", label: "3+ Years" },
        { value: "5", label: "5+ Years" },
        { value: "8", label: "8+ Years" },
      ],
    },
    jobs: jobs.map((job) => ({
      id: job.id,
      referenceNumber: job.referenceNumber,
      title: job.title,
      description: job.description,
      isUrgent: job.isUrgent,
      minYearsExperience: job.minYearsExperience,
      employmentType: name(job.employmentType),
      specialty: name(job.specialty),
      city: name(job.city),
      country: name(job.country),
      salary:
        job.salaryMin || job.salaryMax
          ? {
              min: job.salaryMin?.toString() ?? null,
              max: job.salaryMax?.toString() ?? null,
              currency: job.salaryCurrencyCode,
              period: name(job.salaryPeriod),
            }
          : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

// GET /api/public/jobs/:id - Single job details
publicJobsRouter.get("/:id", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";
  const ar = locale === "AR";
  const { id } = req.params;

  // STRICT RULE: Only PUBLISHED job
  // STRICT RULE: Never expose facility name or identifying facility data to doctors/public
  const [job, settings] = await Promise.all([
    prisma.job.findFirst({
      where: {
        id,
        status: "PUBLISHED", facility: { user: { status: "APPROVED" } },
      },
      select: {
        id: true,
        referenceNumber: true,
        title: true,
        aboutHospital: true,
        description: true,
        responsibilities: true,
        requirements: true,
        benefits: true,
        positions: true,
        minYearsExperience: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrencyCode: true,
        isUrgent: true,
        city: { select: { nameEn: true, nameAr: true } },
        country: { select: { slug: true, nameEn: true, nameAr: true } },
        specialty: { select: { slug: true, nameEn: true, nameAr: true } },
        employmentType: { select: { code: true, nameEn: true, nameAr: true } },
        salaryPeriod: { select: { code: true, nameEn: true, nameAr: true } },
        // Notice: facility relation is deliberately excluded to maintain anonymity
      },
    }),
    prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
  ]);

  if (!job) {
    res.status(404).json({ status: "error", message: "Job opportunity not found" });
    return;
  }

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;
  const name = (item: { nameEn: string; nameAr: string } | null) =>
    item ? (ar ? item.nameAr : item.nameEn) : null;

  res.set("Cache-Control", "public, max-age=60");
  res.json({
    locale,
    header: pickLocale(setting("header"), locale),
    footer: pickLocale(setting("footer"), locale),
    job: {
      id: job.id,
      referenceNumber: job.referenceNumber,
      title: job.title,
      aboutHospital: job.aboutHospital,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      benefits: job.benefits,
      positions: job.positions,
      minYearsExperience: job.minYearsExperience,
      isUrgent: job.isUrgent,
      employmentType: name(job.employmentType),
      specialty: name(job.specialty),
      city: name(job.city),
      country: name(job.country),
      salary:
        job.salaryMin || job.salaryMax
          ? {
              min: job.salaryMin?.toString() ?? null,
              max: job.salaryMax?.toString() ?? null,
              currency: job.salaryCurrencyCode,
              period: name(job.salaryPeriod),
            }
          : null,
    },
  });
});
