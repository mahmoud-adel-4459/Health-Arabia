import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { recordAdminContentChange } from "../lib/admin-audit";
import { requirePlatformAdmin } from "./admin-accounts";

// Admin-only editing of public site content and managed reference data.
// - Identity fields (page/key/locale, ids, ISO codes, option codes, slugs) are never changed.
// - Nothing is deleted: records are hidden with isPublished / isActive instead.
// - Only fields that actually change are written; each real change adds one append-only audit entry.
// Notice-period and referral-source options are intentionally NOT editable here (awaiting client-approved values).
export const adminContentRouter = Router();
adminContentRouter.use(requirePlatformAdmin);

class Invalid extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}
type Spec = { type: "text" | "optText" | "bool" | "int" | "json"; max?: number; required?: boolean };

const FIELD_LABELS: Record<string, string> = {
  question: "Question", answer: "Answer", title: "Title", body: "Text", data: "Content", sortOrder: "Position", isPublished: "Visibility", isActive: "Availability",
  isGuidePublished: "Guide visibility", isGcc: "GCC setting", isoCode: "Country code", slug: "Web address name", nameEn: "English name", nameAr: "Arabic name", summaryEn: "English summary", summaryAr: "Arabic summary", symbol: "Symbol", code: "Reference", locale: "Language",
};

function readField(name: string, value: unknown, spec: Spec): unknown {
  const label = FIELD_LABELS[name] ?? name;
  if (spec.type === "bool") {
    if (typeof value !== "boolean") throw new Invalid(`${label} must be true or false.`, name);
    return value;
  }
  if (spec.type === "int") {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 9999) throw new Invalid(`${label} must be a whole number between 0 and 9999.`, name);
    return value;
  }
  if (spec.type === "json") {
    if (value === null) return null;
    if (typeof value !== "object") throw new Invalid(`${label} must be a JSON object or array.`, name);
    if (JSON.stringify(value).length > 60000) throw new Invalid(`${label} is too large.`, name);
    return value;
  }
  if (value === null || value === undefined) {
    if (spec.type === "optText") return null;
    throw new Invalid(`${label} is required.`, name);
  }
  if (typeof value !== "string") throw new Invalid(`${label} must be text.`, name);
  const text = value.trim();
  if (spec.type === "text" && !text) throw new Invalid(`${label} is required.`, name);
  if (text.length > (spec.max ?? 500)) throw new Invalid(`${label} is too long (max ${spec.max ?? 500} characters).`, name);
  return spec.type === "optText" && !text ? null : text;
}

// Applies a partial update from `body` using the field specs; returns the validated changes (only differing values).
function diff(body: Record<string, unknown>, existing: Record<string, any>, specs: Record<string, Spec>) {
  const changes: Record<string, unknown> = {};
  for (const [field, spec] of Object.entries(specs)) {
    if (!(field in body)) continue;
    const next = readField(field, body[field], spec);
    const same = spec.type === "json" ? JSON.stringify(next) === JSON.stringify(existing[field]) : next === (existing[field] ?? (spec.type === "optText" ? null : existing[field]));
    if (!same) changes[field] = next;
  }
  return changes;
}

function handle(res: Response, error: unknown, what: string) {
  if (error instanceof Invalid) {
    res.status(400).json({ status: "error", code: "INVALID_INPUT", field: error.field ?? null, message: error.message });
    return;
  }
  if ((error as any)?.code === "P2002") {
    res.status(409).json({ status: "error", code: "DUPLICATE", message: "That value already exists." });
    return;
  }
  if ((error as any)?.code === "P2025") {
    res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Record not found." });
    return;
  }
  console.error(`Admin content error (${what}):`, error);
  res.status(500).json({ status: "error", message: `Failed to ${what}.` });
}

const snake = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
const actor = (req: Request) => (req as any).adminUser.id as string;
const idOf = (req: Request) => String(req.params.id);

// ---------------------------------------------------------------------------
// CMS blocks (existing page/key/locale rows)
// ---------------------------------------------------------------------------
const BLOCK_SPECS: Record<string, Spec> = {
  title: { type: "optText", max: 300 },
  body: { type: "optText", max: 20000 },
  data: { type: "json" },
  sortOrder: { type: "int" },
  isPublished: { type: "bool" },
};

adminContentRouter.get("/blocks", async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.page) where.page = String(req.query.page);
    if (req.query.locale) where.locale = String(req.query.locale);
    const blocks = await prisma.contentBlock.findMany({ where, orderBy: [{ page: "asc" }, { locale: "asc" }, { sortOrder: "asc" }] });
    res.json({
      status: "success",
      blocks: blocks.map((b) => ({ id: b.id, page: b.page, key: b.key, locale: b.locale, title: b.title, body: b.body, data: b.data, sortOrder: b.sortOrder, isPublished: b.isPublished, updatedAt: b.updatedAt })),
    });
  } catch (e) {
    handle(res, e, "load content blocks");
  }
});

adminContentRouter.patch("/blocks/:id", async (req: Request, res: Response) => {
  try {
    const block = await prisma.contentBlock.findUnique({ where: { id: idOf(req) } });
    if (!block) return void res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Content block not found." });
    const changes = diff(req.body ?? {}, block, BLOCK_SPECS);
    const fields = Object.keys(changes);
    if (fields.length === 0) return void res.json({ status: "success", changed: false, message: "No changes to save." });
    await prisma.$transaction(async (tx) => {
      await tx.contentBlock.update({ where: { id: block.id }, data: changes as any });
      await recordAdminContentChange(tx, { actorId: actor(req), action: "CONTENT_BLOCK_UPDATED", entityType: "ContentBlock", entityId: block.id, changedFields: fields, extra: { page: block.page, key: block.key, locale: block.locale } });
    });
    res.json({ status: "success", changed: true, message: "Content block saved." });
  } catch (e) {
    handle(res, e, "save content block");
  }
});

// ---------------------------------------------------------------------------
// FAQs (create / edit / hide; never deleted)
// ---------------------------------------------------------------------------
const FAQ_SPECS: Record<string, Spec> = {
  question: { type: "text", max: 500 },
  answer: { type: "text", max: 5000 },
  sortOrder: { type: "int" },
  isPublished: { type: "bool" },
};

adminContentRouter.get("/faqs", async (_req: Request, res: Response) => {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: [{ locale: "asc" }, { sortOrder: "asc" }] });
    res.json({ status: "success", faqs: faqs.map((f) => ({ id: f.id, locale: f.locale, question: f.question, answer: f.answer, sortOrder: f.sortOrder, isPublished: f.isPublished })) });
  } catch (e) {
    handle(res, e, "load FAQs");
  }
});

adminContentRouter.post("/faqs", async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    const locale = b.locale === "AR" ? "AR" : b.locale === "EN" ? "EN" : null;
    if (!locale) throw new Invalid("locale must be EN or AR.");
    const data = {
      locale,
      question: readField("question", b.question, FAQ_SPECS.question) as string,
      answer: readField("answer", b.answer, FAQ_SPECS.answer) as string,
      sortOrder: b.sortOrder === undefined ? 0 : (readField("sortOrder", b.sortOrder, FAQ_SPECS.sortOrder) as number),
      isPublished: b.isPublished === undefined ? false : (readField("isPublished", b.isPublished, FAQ_SPECS.isPublished) as boolean),
    };
    const created = await prisma.$transaction(async (tx) => {
      const faq = await tx.faq.create({ data: data as any });
      await recordAdminContentChange(tx, { actorId: actor(req), action: "FAQ_CREATED", entityType: "Faq", entityId: faq.id, changedFields: Object.keys(data), extra: { locale } });
      return faq;
    });
    res.status(201).json({ status: "success", id: created.id, message: "FAQ created." });
  } catch (e) {
    handle(res, e, "create FAQ");
  }
});

adminContentRouter.patch("/faqs/:id", async (req: Request, res: Response) => {
  try {
    const faq = await prisma.faq.findUnique({ where: { id: idOf(req) } });
    if (!faq) return void res.status(404).json({ status: "error", code: "NOT_FOUND", message: "FAQ not found." });
    const changes = diff(req.body ?? {}, faq, FAQ_SPECS);
    const fields = Object.keys(changes);
    if (fields.length === 0) return void res.json({ status: "success", changed: false, message: "No changes to save." });
    await prisma.$transaction(async (tx) => {
      await tx.faq.update({ where: { id: faq.id }, data: changes as any });
      await recordAdminContentChange(tx, { actorId: actor(req), action: "FAQ_UPDATED", entityType: "Faq", entityId: faq.id, changedFields: fields, extra: { locale: faq.locale } });
    });
    res.json({ status: "success", changed: true, message: "FAQ saved." });
  } catch (e) {
    handle(res, e, "save FAQ");
  }
});

// ---------------------------------------------------------------------------
// Countries and country-guide sections
// ---------------------------------------------------------------------------
const COUNTRY_SPECS: Record<string, Spec> = {
  isGcc: { type: "bool" },
  nameEn: { type: "text", max: 120 },
  nameAr: { type: "text", max: 120 },
  summaryEn: { type: "optText", max: 2000 },
  summaryAr: { type: "optText", max: 2000 },
  isActive: { type: "bool" },
  isGuidePublished: { type: "bool" },
  sortOrder: { type: "int" },
};
const SECTION_SPECS: Record<string, Spec> = {
  title: { type: "text", max: 200 },
  body: { type: "text", max: 10000 },
  sortOrder: { type: "int" },
};

adminContentRouter.get("/countries", async (_req: Request, res: Response) => {
  try {
    const countries = await prisma.country.findMany({ orderBy: { sortOrder: "asc" }, include: { guideSections: { orderBy: [{ locale: "asc" }, { sortOrder: "asc" }] }, cities: { orderBy: { sortOrder: "asc" } }, _count: { select: { jobs: true, facilities: true } } } });
    res.json({
      status: "success",
      countries: countries.map((c) => ({
        id: c.id, slug: c.slug, isoCode: c.isoCode, isGcc: c.isGcc, nameEn: c.nameEn, nameAr: c.nameAr, summaryEn: c.summaryEn, summaryAr: c.summaryAr,
        isActive: c.isActive, isGuidePublished: c.isGuidePublished, sortOrder: c.sortOrder, usedBy: { jobs: c._count.jobs, hospitals: c._count.facilities },
        cities: c.cities.map((ci) => ({ id: ci.id, nameEn: ci.nameEn, nameAr: ci.nameAr, isActive: ci.isActive, sortOrder: ci.sortOrder })),
        sections: c.guideSections.map((s) => ({ id: s.id, locale: s.locale, title: s.title, body: s.body, sortOrder: s.sortOrder })),
      })),
    });
  } catch (e) {
    handle(res, e, "load countries");
  }
});

// New countries start hidden (not available, guide not published) until an Admin switches them on.
// Arabic names are required by the database and are never generated: the Admin must supply them.
adminContentRouter.post("/countries", async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {};
    const isoCode = typeof b.isoCode === "string" ? b.isoCode.trim().toUpperCase() : "";
    if (!/^[A-Z]{2}$/.test(isoCode)) throw new Invalid("Country code must be exactly 2 letters, for example SA.", "isoCode");
    const slug = typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) throw new Invalid("Web address name can contain lowercase letters, numbers and single hyphens only, for example saudi-arabia.", "slug");
    const data = {
      isoCode,
      slug,
      nameEn: readField("nameEn", b.nameEn, COUNTRY_SPECS.nameEn) as string,
      nameAr: readField("nameAr", b.nameAr, COUNTRY_SPECS.nameAr) as string,
      summaryEn: readField("summaryEn", b.summaryEn ?? null, COUNTRY_SPECS.summaryEn) as string | null,
      summaryAr: readField("summaryAr", b.summaryAr ?? null, COUNTRY_SPECS.summaryAr) as string | null,
      isGcc: b.isGcc === undefined ? false : (readField("isGcc", b.isGcc, COUNTRY_SPECS.isGcc) as boolean),
      isActive: false,
      isGuidePublished: false,
      sortOrder: ((await prisma.country.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1,
    };
    const taken = await prisma.country.findFirst({ where: { OR: [{ isoCode }, { slug }] }, select: { isoCode: true } });
    if (taken) {
      const field = taken.isoCode === isoCode ? "isoCode" : "slug";
      return void res.status(409).json({ status: "error", code: "DUPLICATE", field, message: field === "isoCode" ? "A country with this code already exists." : "A country with this web address name already exists." });
    }
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.country.create({ data });
      await recordAdminContentChange(tx, { actorId: actor(req), action: "COUNTRY_CREATED", entityType: "Country", entityId: c.id, changedFields: Object.keys(data), extra: { slug, isoCode } });
      return c;
    });
    res.status(201).json({ status: "success", id: created.id, message: "Country added. It stays hidden until you make it available." });
  } catch (e) {
    if ((e as any)?.code === "P2002") {
      const target = String(((e as any).meta?.target ?? "") as string);
      const field = /iso/i.test(target) ? "isoCode" : /slug/i.test(target) ? "slug" : null;
      return void res.status(409).json({ status: "error", code: "DUPLICATE", field, message: field === "isoCode" ? "A country with this code already exists." : field === "slug" ? "A country with this web address name already exists." : "That country already exists." });
    }
    handle(res, e, "add country");
  }
});

adminContentRouter.patch("/countries/:id", async (req: Request, res: Response) => {
  try {
    const country = await prisma.country.findUnique({ where: { id: idOf(req) } });
    if (!country) return void res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Country not found." });
    const changes = diff(req.body ?? {}, country, COUNTRY_SPECS);
    const fields = Object.keys(changes);
    if (fields.length === 0) return void res.json({ status: "success", changed: false, message: "No changes to save." });
    await prisma.$transaction(async (tx) => {
      await tx.country.update({ where: { id: country.id }, data: changes as any });
      await recordAdminContentChange(tx, { actorId: actor(req), action: "COUNTRY_UPDATED", entityType: "Country", entityId: country.id, changedFields: fields, extra: { slug: country.slug } });
    });
    res.json({ status: "success", changed: true, message: "Country saved." });
  } catch (e) {
    handle(res, e, "save country");
  }
});

adminContentRouter.post("/countries/:id/sections", async (req: Request, res: Response) => {
  try {
    const country = await prisma.country.findUnique({ where: { id: idOf(req) } });
    if (!country) return void res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Country not found." });
    const b = req.body ?? {};
    const locale = b.locale === "AR" ? "AR" : b.locale === "EN" ? "EN" : null;
    if (!locale) throw new Invalid("locale must be EN or AR.");
    const data = {
      countryId: country.id,
      locale,
      title: readField("title", b.title, SECTION_SPECS.title) as string,
      body: readField("body", b.body, SECTION_SPECS.body) as string,
      sortOrder: b.sortOrder === undefined ? 0 : (readField("sortOrder", b.sortOrder, SECTION_SPECS.sortOrder) as number),
    };
    const created = await prisma.$transaction(async (tx) => {
      const s = await tx.countryGuideSection.create({ data: data as any });
      await recordAdminContentChange(tx, { actorId: actor(req), action: "COUNTRY_GUIDE_SECTION_CREATED", entityType: "CountryGuideSection", entityId: s.id, changedFields: ["title", "body", "sortOrder"], extra: { countryId: country.id, locale } });
      return s;
    });
    res.status(201).json({ status: "success", id: created.id, message: "Guide section added." });
  } catch (e) {
    handle(res, e, "add guide section");
  }
});

adminContentRouter.patch("/sections/:id", async (req: Request, res: Response) => {
  try {
    const section = await prisma.countryGuideSection.findUnique({ where: { id: idOf(req) } });
    if (!section) return void res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Guide section not found." });
    const changes = diff(req.body ?? {}, section, SECTION_SPECS);
    const fields = Object.keys(changes);
    if (fields.length === 0) return void res.json({ status: "success", changed: false, message: "No changes to save." });
    await prisma.$transaction(async (tx) => {
      await tx.countryGuideSection.update({ where: { id: section.id }, data: changes as any });
      await recordAdminContentChange(tx, { actorId: actor(req), action: "COUNTRY_GUIDE_SECTION_UPDATED", entityType: "CountryGuideSection", entityId: section.id, changedFields: fields, extra: { countryId: section.countryId, locale: section.locale } });
    });
    res.json({ status: "success", changed: true, message: "Guide section saved." });
  } catch (e) {
    handle(res, e, "save guide section");
  }
});

// ---------------------------------------------------------------------------
// Simple managed lists: cities, specialties, employment types, salary periods, currencies, contact subjects.
// Existing rows keep their ids/codes/slugs; they are edited or deactivated, never deleted.
// ---------------------------------------------------------------------------
const LIST_SPECS: Record<string, Spec> = {
  nameEn: { type: "text", max: 120 },
  nameAr: { type: "text", max: 120 },
  isActive: { type: "bool" },
  sortOrder: { type: "int" },
};
const CURRENCY_SPECS: Record<string, Spec> = { ...LIST_SPECS, symbol: { type: "optText", max: 8 } };

interface ListDef {
  entity: string;
  model: "city" | "specialty" | "employmentTypeOption" | "salaryPeriodOption" | "currency" | "contactSubjectOption";
  specs: Record<string, Spec>;
  key: "id" | "code";
}
const LISTS: Record<string, ListDef> = {
  cities: { entity: "City", model: "city", specs: LIST_SPECS, key: "id" },
  specialties: { entity: "Specialty", model: "specialty", specs: LIST_SPECS, key: "id" },
  "employment-types": { entity: "EmploymentTypeOption", model: "employmentTypeOption", specs: LIST_SPECS, key: "id" },
  "salary-periods": { entity: "SalaryPeriodOption", model: "salaryPeriodOption", specs: LIST_SPECS, key: "id" },
  currencies: { entity: "Currency", model: "currency", specs: CURRENCY_SPECS, key: "code" },
  "contact-subjects": { entity: "ContactSubjectOption", model: "contactSubjectOption", specs: LIST_SPECS, key: "id" },
};
const m = (name: string) => (prisma as any)[LISTS[name].model];

adminContentRouter.get("/lists", async (_req: Request, res: Response) => {
  try {
    const out: Record<string, unknown> = {};
    for (const name of Object.keys(LISTS)) {
      const rows = await m(name).findMany({
        orderBy: name === "cities" ? [{ countryId: "asc" }, { sortOrder: "asc" }] : { sortOrder: "asc" },
        ...(name === "cities" ? { include: { country: { select: { nameEn: true } } } } : {}),
      });
      out[name] = rows.map((r: any) => ({
        id: r.id ?? r.code, code: r.code ?? r.slug ?? null, nameEn: r.nameEn, nameAr: r.nameAr, isActive: r.isActive, sortOrder: r.sortOrder,
        ...(name === "currencies" ? { symbol: r.symbol } : {}), ...(name === "cities" ? { country: r.country.nameEn, countryId: r.countryId } : {}),
      }));
    }
    res.json({ status: "success", lists: out });
  } catch (e) {
    handle(res, e, "load lists");
  }
});

adminContentRouter.patch("/lists/:list/:id", async (req: Request, res: Response) => {
  try {
    const def = LISTS[String(req.params.list)];
    if (!def) return void res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Unknown list." });
    const where = def.key === "code" ? { code: idOf(req) } : { id: idOf(req) };
    const row = await m(String(req.params.list)).findUnique({ where });
    if (!row) return void res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Record not found." });
    const changes = diff(req.body ?? {}, row, def.specs);
    const fields = Object.keys(changes);
    if (fields.length === 0) return void res.json({ status: "success", changed: false, message: "No changes to save." });
    await prisma.$transaction(async (tx) => {
      await (tx as any)[def.model].update({ where, data: changes });
      await recordAdminContentChange(tx, { actorId: actor(req), action: `${snake(def.entity)}_UPDATED`, entityType: def.entity, entityId: row.id ?? row.code, changedFields: fields, extra: fields.includes("isActive") ? { isActive: changes.isActive } : undefined });
    });
    res.json({ status: "success", changed: true, message: "Saved." });
  } catch (e) {
    handle(res, e, "save record");
  }
});

// Create new entries only where the identity can be derived from admin input without inventing values.
adminContentRouter.post("/lists/:list", async (req: Request, res: Response) => {
  try {
    const name = String(req.params.list);
    const def = LISTS[name];
    if (!def) return void res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Unknown list." });
    const b = req.body ?? {};
    const data: Record<string, unknown> = {
      nameEn: readField("nameEn", b.nameEn, LIST_SPECS.nameEn),
      nameAr: readField("nameAr", b.nameAr, LIST_SPECS.nameAr),
      isActive: b.isActive === undefined ? true : readField("isActive", b.isActive, LIST_SPECS.isActive),
      sortOrder: b.sortOrder === undefined ? 0 : readField("sortOrder", b.sortOrder, LIST_SPECS.sortOrder),
    };
    if (name === "cities") {
      const country = await prisma.country.findUnique({ where: { id: String(b.countryId ?? "") } });
      if (!country) throw new Invalid("Choose an existing country.");
      data.countryId = country.id;
    } else if (name === "specialties") {
      const slug = String(data.nameEn).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug) throw new Invalid("English name must contain letters or numbers.");
      data.slug = slug;
    } else {
      const code = typeof b.code === "string" ? b.code.trim().toUpperCase() : "";
      if (!/^[A-Z0-9_]{2,30}$/.test(code) || (name === "currencies" && code.length !== 3)) throw new Invalid(name === "currencies" ? "Currency code must be 3 letters." : "Code must be 2-30 letters, numbers or underscores.");
      data.code = code;
      if (name === "currencies") data.symbol = readField("symbol", b.symbol ?? null, CURRENCY_SPECS.symbol);
    }
    const created = await prisma.$transaction(async (tx) => {
      const row = await (tx as any)[def.model].create({ data });
      await recordAdminContentChange(tx, { actorId: actor(req), action: `${snake(def.entity)}_CREATED`, entityType: def.entity, entityId: row.id ?? row.code, changedFields: Object.keys(data) });
      return row;
    });
    res.status(201).json({ status: "success", id: created.id ?? created.code, message: "Created." });
  } catch (e) {
    handle(res, e, "create record");
  }
});
