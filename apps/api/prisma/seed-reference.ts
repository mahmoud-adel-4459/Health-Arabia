// Reference/content-only seed: public-site CMS content and the reference lists the forms need.
// Creates NO users, doctors, facilities, jobs, applications, saved jobs, or testimonials.
//
// Create-only and idempotent: rows that already exist are left untouched (never updated or deleted),
// so re-running is safe and later admin edits to CMS content are preserved.
//
// Run: pnpm db:seed:reference   (full development seed with demo data: prisma/seed.ts)
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  aboutBlocks,
  cities,
  contactBlocks,
  contactSubjects,
  countries,
  countriesBlocks,
  currencies,
  employmentTypes,
  faqBlocks,
  faqs,
  footer,
  header,
  homeBlocks,
  hospitalsBlocks,
  jobsBlocks,
  salaryPeriods,
  specialties,
} from "./seed-reference-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

const created: Record<string, number> = {};
const existing: Record<string, number> = {};
function tally(kind: string, wasCreated: boolean) {
  const bucket = wasCreated ? created : existing;
  bucket[kind] = (bucket[kind] ?? 0) + 1;
}

async function main() {
  // Site header / footer
  for (const [key, value] of [["header", header], ["footer", footer]] as const) {
    const found = await prisma.siteSetting.findUnique({ where: { key } });
    if (!found) await prisma.siteSetting.create({ data: { key, value } });
    tally("siteSetting", !found);
  }

  // CMS content blocks for every public page
  const allBlocks = [
    ...homeBlocks,
    ...aboutBlocks,
    ...countriesBlocks,
    ...hospitalsBlocks,
    ...faqBlocks,
    ...contactBlocks,
    ...jobsBlocks,
  ];
  for (const block of allBlocks) {
    const where = { page_key_locale: { page: block.page, key: block.key, locale: "EN" as const } };
    const found = await prisma.contentBlock.findUnique({ where });
    if (!found) {
      await prisma.contentBlock.create({
        data: {
          page: block.page,
          key: block.key,
          locale: "EN",
          title: block.title,
          body: block.body,
          data: block.data,
          sortOrder: block.sortOrder,
          isPublished: true,
        },
      });
    }
    tally("contentBlock", !found);
  }

  // GCC countries, their hero images, and country guide sections
  for (const c of countries) {
    let country = await prisma.country.findUnique({ where: { slug: c.slug } });
    if (!country) {
      let heroImageId: string | null = null;
      if (c.heroImage) {
        const asset = await prisma.fileAsset.upsert({
          where: { storageKey: c.heroImage },
          update: {},
          create: {
            storageKey: c.heroImage,
            originalName: c.heroImage.split("/").pop() ?? "country.png",
            mimeType: "image/png",
            sizeBytes: 1600000,
            kind: "CONTENT_IMAGE",
            visibility: "PUBLIC",
          },
        });
        heroImageId = asset.id;
      }
      country = await prisma.country.create({
        data: {
          slug: c.slug,
          nameEn: c.nameEn,
          nameAr: c.nameAr,
          isoCode: c.isoCode,
          isGcc: true,
          isActive: true,
          sortOrder: c.sortOrder,
          summaryEn: c.summaryEn,
          heroImageId,
          isGuidePublished: c.isGuidePublished,
        },
      });
      tally("country", true);
    } else {
      tally("country", false);
    }

    // No unique key on guide sections: match by (country, locale, title)
    for (let index = 0; index < (c.sections ?? []).length; index++) {
      const sec = c.sections![index];
      const found = await prisma.countryGuideSection.findFirst({
        where: { countryId: country.id, locale: "EN", title: sec.title },
      });
      if (!found) {
        await prisma.countryGuideSection.create({
          data: { countryId: country.id, locale: "EN", title: sec.title, body: sec.body, sortOrder: index },
        });
      }
      tally("countryGuideSection", !found);
    }
  }

  // Cities
  for (const city of cities) {
    const country = await prisma.country.findUnique({ where: { slug: city.countrySlug } });
    if (!country) continue;
    const where = { countryId_nameEn: { countryId: country.id, nameEn: city.nameEn } };
    const found = await prisma.city.findUnique({ where });
    if (!found) {
      await prisma.city.create({
        data: { countryId: country.id, nameEn: city.nameEn, nameAr: city.nameAr, sortOrder: city.sortOrder, isActive: true },
      });
    }
    tally("city", !found);
  }

  // Specialties
  for (const sp of specialties) {
    const found = await prisma.specialty.findUnique({ where: { slug: sp.slug } });
    if (!found) {
      await prisma.specialty.create({
        data: { slug: sp.slug, nameEn: sp.nameEn, nameAr: sp.nameAr, sortOrder: sp.sortOrder, isActive: true },
      });
    }
    tally("specialty", !found);
  }

  // Managed option lists (code-keyed)
  for (const cur of currencies) {
    const found = await prisma.currency.findUnique({ where: { code: cur.code } });
    if (!found) await prisma.currency.create({ data: { ...cur, isActive: true } });
    tally("currency", !found);
  }
  for (const sp of salaryPeriods) {
    const found = await prisma.salaryPeriodOption.findUnique({ where: { code: sp.code } });
    if (!found) await prisma.salaryPeriodOption.create({ data: { ...sp, isActive: true } });
    tally("salaryPeriodOption", !found);
  }
  for (const et of employmentTypes) {
    const found = await prisma.employmentTypeOption.findUnique({ where: { code: et.code } });
    if (!found) await prisma.employmentTypeOption.create({ data: { ...et, isActive: true } });
    tally("employmentTypeOption", !found);
  }
  for (const s of contactSubjects) {
    const found = await prisma.contactSubjectOption.findUnique({ where: { code: s.code } });
    if (!found) await prisma.contactSubjectOption.create({ data: { ...s, isActive: true } });
    tally("contactSubjectOption", !found);
  }

  // FAQs (no unique key: match by locale + question)
  for (let index = 0; index < faqs.length; index++) {
    const f = faqs[index];
    const found = await prisma.faq.findFirst({ where: { locale: "EN", question: f.question } });
    if (!found) {
      await prisma.faq.create({
        data: { locale: "EN", question: f.question, answer: f.answer, sortOrder: index, isPublished: true },
      });
    }
    tally("faq", !found);
  }

  const kinds = [...new Set([...Object.keys(created), ...Object.keys(existing)])];
  console.log("Reference seed complete (create-only; existing rows untouched):");
  for (const kind of kinds) {
    console.log(`  ${kind.padEnd(22)} created ${created[kind] ?? 0}, already present ${existing[kind] ?? 0}`);
  }
}

main()
  .catch((error) => {
    console.error("Reference seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
