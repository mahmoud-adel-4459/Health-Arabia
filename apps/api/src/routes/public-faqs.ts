import { Router } from "express";
import { prisma } from "../lib/prisma";

type LocaleCode = "EN" | "AR";

function pickLocale<T>(value: unknown, locale: LocaleCode): T | null {
  if (!value || typeof value !== "object") return null;
  const byLocale = value as Record<string, T | undefined>;
  return byLocale[locale] ?? byLocale.EN ?? null;
}

export const publicFaqsRouter = Router();

publicFaqsRouter.get("/", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";

  const [faqs, settings, blocks] = await Promise.all([
    prisma.faq.findMany({
      where: { isPublished: true, locale },
      orderBy: { sortOrder: "asc" },
      select: { id: true, question: true, answer: true, sortOrder: true },
    }),
    prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
    prisma.contentBlock.findMany({
      where: { page: "FAQ", key: "hero", isPublished: true, locale: { in: [locale, "EN"] } },
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
    faqs,
  });
});
