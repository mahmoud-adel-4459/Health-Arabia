import { Router } from "express";
import { prisma } from "../lib/prisma";

type LocaleCode = "EN" | "AR";

function pickLocale<T>(value: unknown, locale: LocaleCode): T | null {
  if (!value || typeof value !== "object") return null;
  const byLocale = value as Record<string, T | undefined>;
  return byLocale[locale] ?? byLocale.EN ?? null;
}

export const publicContactRouter = Router();

publicContactRouter.get("/", async (req, res) => {
  const locale: LocaleCode = req.query.locale === "ar" ? "AR" : "EN";

  const [subjects, settings, blocks] = await Promise.all([
    prisma.contactSubjectOption.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, code: true, nameEn: true, nameAr: true },
    }),
    prisma.siteSetting.findMany({ where: { key: { in: ["header", "footer"] } } }),
    prisma.contentBlock.findMany({
      where: { page: "CONTACT", isPublished: true, locale: { in: [locale, "EN"] } },
      select: { key: true, title: true, body: true, data: true },
    }),
  ]);

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;
  const sections: Record<string, { title: string | null; body: string | null; data: unknown }> = {};
  for (const block of blocks) {
    sections[block.key] = { title: block.title, body: block.body, data: block.data };
  }

  res.set("Cache-Control", "public, max-age=60");
  res.json({
    locale,
    header: pickLocale(setting("header"), locale),
    footer: pickLocale(setting("footer"), locale),
    sections,
    subjects: subjects.map((s) => ({
      id: s.id,
      code: s.code,
      label: locale === "AR" ? s.nameAr : s.nameEn,
    })),
  });
});

publicContactRouter.post("/", async (req, res) => {
  const { fullName, email, phone, subjectId, message, locale } = req.body ?? {};

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    res.status(400).json({ status: "error", message: "Full Name is required" });
    return;
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ status: "error", message: "A valid email address is required" });
    return;
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ status: "error", message: "Message is required" });
    return;
  }

  // Validate subjectId if provided
  let validSubjectId: string | null = null;
  if (subjectId && typeof subjectId === "string") {
    const subject = await prisma.contactSubjectOption.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });
    if (subject) {
      validSubjectId = subject.id;
    }
  }

  const submissionLocale = locale === "ar" || locale === "AR" ? "AR" : "EN";

  const submission = await prisma.contactSubmission.create({
    data: {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: typeof phone === "string" ? phone.trim() : null,
      subjectId: validSubjectId,
      message: message.trim(),
      locale: submissionLocale,
      status: "NEW",
    },
    select: { id: true, createdAt: true },
  });

  res.status(201).json({
    status: "success",
    message: "Thank you for reaching out. We have received your message.",
    id: submission.id,
  });
});
