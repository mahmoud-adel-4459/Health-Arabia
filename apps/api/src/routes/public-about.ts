import { Router } from "express";
import { prisma } from "../lib/prisma";

type LocaleCode = "EN" | "AR";

function pickLocale<T>(value: unknown, locale: LocaleCode): T | null {
  if (!value || typeof value !== "object") return null;
  const byLocale = value as Record<string, T | undefined>;
  return byLocale[locale] ?? byLocale.EN ?? null;
}

export const publicAboutRouter = Router();

publicAboutRouter.get("/", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";

  const [blocks, settings] = await Promise.all([
    prisma.contentBlock.findMany({
      where: { page: "ABOUT", isPublished: true, locale: { in: [locale, "EN"] } },
      orderBy: { sortOrder: "asc" },
      select: { key: true, locale: true, title: true, body: true, data: true },
    }),
    prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
  ]);

  const sections: Record<string, { title: string | null; body: string | null; data: unknown }> = {};
  for (const block of blocks) {
    if (block.locale === locale || !sections[block.key]) {
      sections[block.key] = { title: block.title, body: block.body, data: block.data };
    }
  }

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;

  res.set("Cache-Control", "public, max-age=60");
  res.json({
    locale,
    header: pickLocale(setting("header"), locale),
    footer: pickLocale(setting("footer"), locale),
    sections,
  });
});
