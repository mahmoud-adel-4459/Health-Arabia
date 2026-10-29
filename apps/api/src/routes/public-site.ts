import { Router } from "express";
import { prisma } from "../lib/prisma";

// Site-wide settings the website needs for its <head>: brand, icons and the metadata Admins have saved.
// Only values an Admin saved are returned; the website keeps its built-in values for anything missing.
export const publicSiteRouter = Router();

publicSiteRouter.get("/", async (_req, res) => {
  try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: ["general", "seo"] } } });
    const general = (rows.find((r) => r.key === "general")?.value ?? {}) as Record<string, any>;
    const seo = rows.find((r) => r.key === "seo")?.value ?? {};
    res.json({
      status: "success",
      general: { brandName: general.brandName ?? null, logoUrl: general.logoUrl ?? null, faviconUrl: general.faviconUrl ?? null },
      seo,
    });
  } catch (error) {
    console.error("Public site settings error:", error);
    res.status(500).json({ status: "error", message: "Failed to load site settings." });
  }
});
