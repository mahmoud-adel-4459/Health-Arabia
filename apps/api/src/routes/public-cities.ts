import { Router } from "express";
import { prisma } from "../lib/prisma";

export const publicCitiesRouter = Router();

publicCitiesRouter.get("/", async (req, res) => {
  try {
    const locale = req.query.locale === "ar" ? "AR" : "EN";

    const cities = await prisma.city.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        countryId: true,
        country: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            isoCode: true,
          },
        },
      },
    });

    res.set("Cache-Control", "public, max-age=60");
    res.json({
      status: "success",
      cities: cities.map((c) => {
        const cityName = locale === "AR" ? c.nameAr : c.nameEn;
        const countryName = locale === "AR" ? c.country.nameAr : c.country.nameEn;
        return {
          id: c.id,
          nameEn: c.nameEn,
          nameAr: c.nameAr,
          name: cityName,
          countryId: c.countryId,
          countryName,
          displayName: `${cityName}, ${countryName}`,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to fetch public cities:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch cities" });
  }
});
