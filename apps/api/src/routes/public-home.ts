import { Router } from "express";
import { prisma } from "../lib/prisma";

type LocaleCode = "EN" | "AR";

function pickLocale<T>(value: unknown, locale: LocaleCode): T | null {
  if (!value || typeof value !== "object") return null;
  const byLocale = value as Record<string, T | undefined>;
  return byLocale[locale] ?? byLocale.EN ?? null;
}

export const publicHomeRouter = Router();

publicHomeRouter.get("/", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";
  const ar = locale === "AR";

  const [blocks, settings, testimonials, jobs, specialties, countries, employmentTypes] =
    await Promise.all([
      prisma.contentBlock.findMany({
        where: { page: "HOME", isPublished: true, locale: { in: [locale, "EN"] } },
        orderBy: { sortOrder: "asc" },
        select: { key: true, locale: true, title: true, body: true, data: true },
      }),
      prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
      prisma.testimonial.findMany({
        where: { isPublished: true, locale },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          authorName: true,
          authorTitle: true,
          authorLocation: true,
          quote: true,
          photo: { select: { storageKey: true } },
        },
      }),
      prisma.job.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 2,
        select: {
          id: true,
          referenceNumber: true,
          title: true,
          description: true,
          isUrgent: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrencyCode: true,
          facility: { select: { name: true } },
          city: { select: { nameEn: true, nameAr: true } },
          country: { select: { nameEn: true, nameAr: true } },
          employmentType: { select: { nameEn: true, nameAr: true } },
          salaryPeriod: { select: { nameEn: true, nameAr: true } },
        },
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

  const sections: Record<string, { title: string | null; body: string | null; data: unknown }> = {};
  for (const block of blocks) {
    if (block.locale === locale || !sections[block.key]) {
      sections[block.key] = { title: block.title, body: block.body, data: block.data };
    }
  }

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;
  const name = (item: { nameEn: string; nameAr: string } | null) =>
    item ? (ar ? item.nameAr : item.nameEn) : null;

  res.set("Cache-Control", "public, max-age=60");
  res.json({
    locale,
    header: pickLocale(setting("header"), locale),
    footer: pickLocale(setting("footer"), locale),
    sections,
    testimonials: testimonials.map((t) => ({
      id: t.id,
      authorName: t.authorName,
      authorTitle: t.authorTitle,
      authorLocation: t.authorLocation,
      quote: t.quote,
      photoUrl: t.photo?.storageKey ?? null,
    })),
    latestJobs: jobs.map((job) => ({
      id: job.id,
      referenceNumber: job.referenceNumber,
      title: job.title,
      facilityName: job.facility.name,
      description: job.description,
      isUrgent: job.isUrgent,
      employmentType: name(job.employmentType),
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
    searchOptions: {
      specialties: specialties.map((s) => ({ value: s.slug, label: ar ? s.nameAr : s.nameEn })),
      countries: countries.map((c) => ({ value: c.slug, label: ar ? c.nameAr : c.nameEn })),
      employmentTypes: employmentTypes.map((e) => ({ value: e.code, label: ar ? e.nameAr : e.nameEn })),
    },
  });
});
