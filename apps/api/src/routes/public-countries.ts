import { Router } from "express";
import { prisma } from "../lib/prisma";

type LocaleCode = "EN" | "AR";

function pickLocale<T>(value: unknown, locale: LocaleCode): T | null {
  if (!value || typeof value !== "object") return null;
  const byLocale = value as Record<string, T | undefined>;
  return byLocale[locale] ?? byLocale.EN ?? null;
}

export const publicCountriesRouter = Router();

publicCountriesRouter.get("/", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";

  const [countries, settings, blocks] = await Promise.all([
    prisma.country.findMany({
      where: { isActive: true, isGcc: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        isoCode: true,
        nameEn: true,
        nameAr: true,
        summaryEn: true,
        summaryAr: true,
        isGuidePublished: true,
        heroImage: { select: { storageKey: true } },
      },
    }),
    prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
    prisma.contentBlock.findMany({
      where: { page: "COUNTRIES", key: "hero", isPublished: true, locale: { in: [locale, "EN"] } },
      select: { title: true, body: true, data: true },
    }),
  ]);

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;
  const heroBlock = blocks[0] ?? null;

  res.set("Cache-Control", "public, max-age=60");
  res.json({
    locale,
    header: pickLocale(setting("header"), locale),
    footer: pickLocale(setting("footer"), locale),
    hero: heroBlock ? { title: heroBlock.title, body: heroBlock.body, data: heroBlock.data } : null,
    countries: countries.map((c) => ({
      id: c.id,
      slug: c.slug,
      isoCode: c.isoCode,
      name: locale === "AR" ? c.nameAr : c.nameEn,
      summary: locale === "AR" ? (c.summaryAr ?? c.summaryEn) : c.summaryEn,
      heroImageUrl: c.heroImage?.storageKey ?? null,
      isGuidePublished: c.isGuidePublished,
    })),
  });
});

publicCountriesRouter.get("/:slug", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";
  const { slug } = req.params;

  const [country, settings] = await Promise.all([
    // Hidden countries and unpublished guides are not reachable by their address
    prisma.country.findFirst({
      where: { slug, isActive: true, isGuidePublished: true },
      select: {
        id: true,
        slug: true,
        isoCode: true,
        nameEn: true,
        nameAr: true,
        summaryEn: true,
        summaryAr: true,
        isGuidePublished: true,
        heroImage: { select: { storageKey: true } },
        cities: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, nameEn: true, nameAr: true },
        },
        guideSections: {
          where: { locale },
          orderBy: { sortOrder: "asc" },
          select: { id: true, title: true, body: true, sortOrder: true },
        },
      },
    }),
    prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
  ]);

  if (!country) {
    res.status(404).json({ status: "error", message: "Country not found" });
    return;
  }

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;

  res.set("Cache-Control", "public, max-age=60");
  res.json({
    locale,
    header: pickLocale(setting("header"), locale),
    footer: pickLocale(setting("footer"), locale),
    country: {
      id: country.id,
      slug: country.slug,
      isoCode: country.isoCode,
      name: locale === "AR" ? country.nameAr : country.nameEn,
      summary: locale === "AR" ? (country.summaryAr ?? country.summaryEn) : country.summaryEn,
      heroImageUrl: country.heroImage?.storageKey ?? null,
      isGuidePublished: country.isGuidePublished,
      cities: country.cities.map((city) => ({
        id: city.id,
        name: locale === "AR" ? city.nameAr : city.nameEn,
      })),
      guideSections: country.guideSections,
    },
  });
});
