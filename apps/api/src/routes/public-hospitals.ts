import { Router } from "express";
import { prisma } from "../lib/prisma";

type LocaleCode = "EN" | "AR";

function pickLocale<T>(value: unknown, locale: LocaleCode): T | null {
  if (!value || typeof value !== "object") return null;
  const byLocale = value as Record<string, T | undefined>;
  return byLocale[locale] ?? byLocale.EN ?? null;
}

export const publicHospitalsRouter = Router();

publicHospitalsRouter.get("/", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string, 10) || 9));
  const skip = (page - 1) * limit;

  // Public directory rule (schema): APPROVED account AND listing explicitly enabled by the platform
  const where = {
    isListedPublicly: true,
    publicListingEnabledAt: { not: null },
    user: { status: "APPROVED" as const },
  };

  const [facilities, total, settings, blocks] = await Promise.all([
    prisma.facility.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        description: true,
        employeeCount: true,
        country: { select: { slug: true, nameEn: true, nameAr: true } },
        city: { select: { nameEn: true, nameAr: true } },
        logo: { select: { storageKey: true } },
      },
    }),
    prisma.facility.count({ where }),
    prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
    prisma.contentBlock.findMany({
      where: { page: "HOSPITALS", key: "hero", isPublished: true, locale: { in: [locale, "EN"] } },
      select: { title: true, body: true, data: true },
    }),
  ]);

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;
  const heroBlock = blocks[0] ?? null;

  // Listing visibility is an admin moderation decision: never serve a cached (possibly delisted) result
  res.set("Cache-Control", "no-store");
  res.json({
    locale,
    header: pickLocale(setting("header"), locale),
    footer: pickLocale(setting("footer"), locale),
    hero: heroBlock ? { title: heroBlock.title, body: heroBlock.body, data: heroBlock.data } : null,
    facilities: facilities.map((f) => ({
      id: f.id,
      slug: f.slug,
      name: f.name,
      type: f.type,
      description: f.description,
      employeeCount: f.employeeCount,
      country: f.country ? (locale === "AR" ? f.country.nameAr : f.country.nameEn) : null,
      city: f.city ? (locale === "AR" ? f.city.nameAr : f.city.nameEn) : null,
      logoUrl: f.logo?.storageKey ?? null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

publicHospitalsRouter.get("/:slug", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";
  const { slug } = req.params;

  const [facility, settings] = await Promise.all([
    prisma.facility.findFirst({
      where: {
        slug,
        isListedPublicly: true,
        publicListingEnabledAt: { not: null },
        user: { status: "APPROVED" },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        description: true,
        address: true,
        locationUrl: true,
        employeeCount: true,
        country: { select: { slug: true, nameEn: true, nameAr: true } },
        city: { select: { nameEn: true, nameAr: true } },
        logo: { select: { storageKey: true } },
      },
    }),
    prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
  ]);

  if (!facility) {
    res.status(404).json({ status: "error", message: "Hospital not found" });
    return;
  }

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;

  // Listing visibility is an admin moderation decision: never serve a cached (possibly delisted) result
  res.set("Cache-Control", "no-store");
  res.json({
    locale,
    header: pickLocale(setting("header"), locale),
    footer: pickLocale(setting("footer"), locale),
    facility: {
      id: facility.id,
      slug: facility.slug,
      name: facility.name,
      type: facility.type,
      description: facility.description,
      address: facility.address,
      locationUrl: facility.locationUrl,
      employeeCount: facility.employeeCount,
      country: facility.country ? (locale === "AR" ? facility.country.nameAr : facility.country.nameEn) : null,
      city: facility.city ? (locale === "AR" ? facility.city.nameAr : facility.city.nameEn) : null,
      logoUrl: facility.logo?.storageKey ?? null,
    },
  });
});
