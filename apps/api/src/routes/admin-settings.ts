import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { recordAdminContentChange } from "../lib/admin-audit";
import { requirePlatformAdmin } from "./admin-accounts";

// Platform Admin editing of site-wide settings (brand, public contact details, social links) and SEO metadata.
// - Stored in the existing SiteSetting table (key "general" and key "seo"); no schema change.
// - Brand, contact, social and tagline are also written into the existing "header"/"footer" settings that
//   every public page already renders, so one save updates the whole website.
// - Nothing is invented: until an Admin saves a value, the website keeps showing what it shows today.
export const adminSettingsRouter = Router();
adminSettingsRouter.use(requirePlatformAdmin);

const actor = (req: Request) => (req as any).adminUser.id as string;

class Invalid extends Error {
  constructor(message: string, public field: string) {
    super(message);
  }
}

// What the website uses today, shown as the starting value in the forms
export const BUILT_IN_BRAND = { brandName: "Health Arabia", logoUrl: "/brand/health-arabia-logo.png" };

export const SEO_PAGES = ["HOME", "ABOUT", "COUNTRIES", "HOSPITALS", "FAQ", "CONTACT", "JOBS"] as const;
export type SeoPage = (typeof SEO_PAGES)[number];

// Current page metadata baked into the website, shown as "currently" so nothing has to be retyped
export const BUILT_IN_SEO: Record<SeoPage, { title: string; description: string }> = {
  HOME: { title: "Health Arabia", description: "Medical recruitment across the GCC" },
  ABOUT: {
    title: "About Our Company | Health Arabia",
    description: "HealthArabia is a premier Saudi-owned specialist medical recruitment consultancy assisting world-class clinical leaders to relocate seamlessly across the GCC.",
  },
  COUNTRIES: {
    title: "GCC Destinations & Countries | Health Arabia",
    description: "Explore healthcare and medical consultant relocation opportunities across Saudi Arabia, UAE, Qatar, Bahrain, Oman, and Kuwait.",
  },
  HOSPITALS: {
    title: "Hospital & Healthcare Directory | Health Arabia",
    description: "Discover verified partner hospitals and leading clinical healthcare complexes across Saudi Arabia and the GCC.",
  },
  FAQ: {
    title: "Frequently Asked Questions | Health Arabia",
    description: "Clear answers to common questions about medical licensing, SCFHS registration, consultant relocation, and hospital placements in the GCC.",
  },
  CONTACT: {
    title: "Contact Our Consultants | Health Arabia",
    description: "Get in touch with Health Arabia's medical recruitment specialists in London and Riyadh for confidential clinical career and staffing inquiries.",
  },
  JOBS: {
    title: "Available Jobs | HealthArabia",
    description: "Explore premier consultant, specialist, and medical leadership opportunities across leading healthcare complexes in Saudi Arabia and the GCC.",
  },
};

// ---------------------------------------------------------------- validation helpers
const text = (name: string, label: string, value: unknown, max: number, required = false): string => {
  if (typeof value !== "string") throw new Invalid(`${label} must be text.`, name);
  const v = value.trim();
  if (required && !v) throw new Invalid(`${label} is required.`, name);
  if (v.length > max) throw new Invalid(`${label} is too long (max ${max} characters).`, name);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) throw new Invalid(`${label} contains characters that are not allowed.`, name);
  return v;
};
const httpsUrl = (name: string, label: string, value: unknown, max = 500): string => {
  const v = text(name, label, value, max);
  if (!v) return "";
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") throw new Error();
  } catch {
    throw new Invalid(`${label} must be a full web address starting with https://`, name);
  }
  return v;
};
// A picture reference: a full https address, or a path on this website (for example the current /brand/ logo)
const imageRef = (name: string, label: string, value: unknown): string => {
  const v = text(name, label, value, 500);
  if (!v) return "";
  if (v.startsWith("/") && !v.startsWith("//") && !/[\s\\]/.test(v)) return v;
  return httpsUrl(name, label, v);
};

type General = {
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  social: { facebook: string; linkedin: string; x: string };
  contact: { address: string; email: string; phone: string; hours: string };
  tagline: string;
  copyrightCompany: string;
};

const asObject = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});

// Reads the contact column of the existing footer so the form starts with what the website shows today
function contactFromFooter(footerEn: Record<string, any>) {
  const column = (footerEn.columns ?? []).find((c: any) => c?.title === "Contact Info");
  const out = { address: "", email: "", phone: "", hours: "" };
  const plain: string[] = [];
  for (const link of column?.links ?? []) {
    if (typeof link?.href === "string" && link.href.startsWith("mailto:")) out.email = String(link.label ?? "");
    else if (typeof link?.href === "string" && link.href.startsWith("tel:")) out.phone = String(link.label ?? "");
    else plain.push(String(link?.label ?? ""));
  }
  [out.address, out.hours] = [plain[0] ?? "", plain[1] ?? ""];
  return out;
}

async function loadGeneral(): Promise<General> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: ["general", "footer"] } } });
  const saved = asObject(rows.find((r) => r.key === "general")?.value);
  const footerEn = asObject(asObject(rows.find((r) => r.key === "footer")?.value).EN);
  return {
    brandName: saved.brandName ?? BUILT_IN_BRAND.brandName,
    logoUrl: saved.logoUrl ?? BUILT_IN_BRAND.logoUrl,
    faviconUrl: saved.faviconUrl ?? "",
    social: { facebook: "", linkedin: "", x: "", ...asObject(saved.social) },
    contact: { ...contactFromFooter(footerEn), ...asObject(saved.contact) },
    tagline: footerEn.tagline ?? "",
    copyrightCompany: footerEn.copyright?.company ?? "",
  };
}

adminSettingsRouter.get("/general", async (_req: Request, res: Response) => {
  try {
    res.json({ status: "success", general: await loadGeneral(), builtIn: BUILT_IN_BRAND });
  } catch (e) {
    console.error("Admin settings load error:", e);
    res.status(500).json({ status: "error", message: "Failed to load settings." });
  }
});

adminSettingsRouter.patch("/general", async (req: Request, res: Response) => {
  try {
    const b = asObject(req.body);
    const current = await loadGeneral();
    const next: General = { ...current, social: { ...current.social }, contact: { ...current.contact } };

    if ("brandName" in b) next.brandName = text("brandName", "Brand name", b.brandName, 80, true);
    if ("logoUrl" in b) next.logoUrl = imageRef("logoUrl", "Logo", b.logoUrl) || BUILT_IN_BRAND.logoUrl;
    if ("faviconUrl" in b) next.faviconUrl = imageRef("faviconUrl", "Favicon", b.faviconUrl);
    if ("tagline" in b) next.tagline = text("tagline", "Footer description", b.tagline, 500);
    if ("copyrightCompany" in b) next.copyrightCompany = text("copyrightCompany", "Copyright holder", b.copyrightCompany, 80);
    for (const k of ["facebook", "linkedin", "x"] as const) {
      const field = `social.${k}`;
      const v = asObject(b.social)[k];
      if (v !== undefined) next.social[k] = httpsUrl(field, k === "x" ? "X (Twitter) link" : `${k[0].toUpperCase()}${k.slice(1)} link`, v, 300);
    }
    const c = asObject(b.contact);
    if (c.address !== undefined) next.contact.address = text("contact.address", "Address", c.address, 200);
    if (c.hours !== undefined) next.contact.hours = text("contact.hours", "Opening hours", c.hours, 120);
    if (c.email !== undefined) {
      next.contact.email = text("contact.email", "Email address", c.email, 120);
      if (next.contact.email && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(next.contact.email)) throw new Invalid("Enter a valid email address, for example name@example.com.", "contact.email");
    }
    if (c.phone !== undefined) {
      next.contact.phone = text("contact.phone", "Phone number", c.phone, 40);
      if (next.contact.phone && !/^\+?[0-9 ()\-.]{5,40}$/.test(next.contact.phone)) throw new Invalid("Phone numbers can contain digits, spaces, + ( ) - and . only.", "contact.phone");
    }

    const changedFields: string[] = [];
    const flat = (g: General) => ({
      brandName: g.brandName, logoUrl: g.logoUrl, faviconUrl: g.faviconUrl, tagline: g.tagline, copyrightCompany: g.copyrightCompany,
      "social.facebook": g.social.facebook, "social.linkedin": g.social.linkedin, "social.x": g.social.x,
      "contact.address": g.contact.address, "contact.email": g.contact.email, "contact.phone": g.contact.phone, "contact.hours": g.contact.hours,
    });
    const before = flat(current), after = flat(next);
    for (const k of Object.keys(after) as (keyof typeof after)[]) if (before[k] !== after[k]) changedFields.push(k);
    if (changedFields.length === 0) return void res.json({ status: "success", changed: false, message: "No changes to save." });

    await prisma.$transaction(async (tx) => {
      await tx.siteSetting.upsert({
        where: { key: "general" },
        update: { value: { brandName: next.brandName, logoUrl: next.logoUrl, faviconUrl: next.faviconUrl, social: next.social, contact: next.contact } },
        create: { key: "general", value: { brandName: next.brandName, logoUrl: next.logoUrl, faviconUrl: next.faviconUrl, social: next.social, contact: next.contact } },
      });

      // Mirror into the header/footer settings the public pages already read
      const brand = { name: next.brandName, logoUrl: next.logoUrl };
      const socialLinks = [
        { label: "Facebook", href: next.social.facebook },
        { label: "LinkedIn", href: next.social.linkedin },
        { label: "X", href: next.social.x },
      ].filter((s) => s.href);

      const header = asObject((await tx.siteSetting.findUnique({ where: { key: "header" } }))?.value);
      if (header.EN) await tx.siteSetting.update({ where: { key: "header" }, data: { value: { ...header, EN: { ...header.EN, brand } } } });

      const footerRow = await tx.siteSetting.findUnique({ where: { key: "footer" } });
      const footer = asObject(footerRow?.value);
      if (footerRow && footer.EN) {
        const en = asObject(footer.EN);
        const columns = (en.columns ?? []).map((col: any) => {
          if (col?.title !== "Contact Info") return col;
          const links = [
            next.contact.address && { label: next.contact.address, href: null },
            next.contact.email && { label: next.contact.email, href: `mailto:${next.contact.email}` },
            next.contact.phone && { label: next.contact.phone, href: `tel:${next.contact.phone.replace(/[^+0-9]/g, "")}` },
            next.contact.hours && { label: next.contact.hours, href: null },
          ].filter(Boolean);
          return { ...col, links };
        });
        await tx.siteSetting.update({
          where: { key: "footer" },
          data: { value: { ...footer, EN: { ...en, tagline: next.tagline, columns, brand, social: socialLinks, copyright: { ...asObject(en.copyright), company: next.copyrightCompany } } } },
        });
      }
      await recordAdminContentChange(tx, { actorId: actor(req), action: "SITE_SETTINGS_UPDATED", entityType: "SiteSetting", entityId: "general", changedFields });
    });
    res.json({ status: "success", changed: true, message: "Site settings saved." });
  } catch (e) {
    if (e instanceof Invalid) return void res.status(400).json({ status: "error", code: "INVALID_INPUT", field: e.field, message: e.message });
    console.error("Admin settings save error:", e);
    res.status(500).json({ status: "error", message: "Failed to save settings." });
  }
});

// ---------------------------------------------------------------- SEO
type SeoValues = { title?: string; description?: string; ogTitle?: string; ogDescription?: string; ogImage?: string; canonicalUrl?: string; noindex?: boolean };
const SEO_TEXT: Record<string, { label: string; max: number }> = {
  title: { label: "Page title", max: 120 },
  description: { label: "Search description", max: 320 },
  ogTitle: { label: "Social sharing title", max: 120 },
  ogDescription: { label: "Social sharing description", max: 320 },
};

function readSeo(scope: string, values: Record<string, any>): SeoValues {
  const out: SeoValues = {};
  for (const [k, spec] of Object.entries(SEO_TEXT)) {
    if (values[k] === undefined) continue;
    const v = text(k, spec.label, values[k], spec.max);
    if (v) (out as any)[k] = v;
  }
  if (values.ogImage !== undefined) {
    const v = httpsUrl("ogImage", "Social sharing image", values.ogImage);
    if (v) out.ogImage = v;
  }
  if (values.canonicalUrl !== undefined) {
    if (scope === "DEFAULT") throw new Invalid("A canonical address belongs to a single page, not the site defaults.", "canonicalUrl");
    const v = httpsUrl("canonicalUrl", "Canonical address", values.canonicalUrl);
    if (v) out.canonicalUrl = v;
  }
  if (values.noindex !== undefined) {
    if (typeof values.noindex !== "boolean") throw new Invalid("Search engine visibility must be on or off.", "noindex");
    if (values.noindex) out.noindex = true;
  }
  return out;
}

adminSettingsRouter.get("/seo", async (_req: Request, res: Response) => {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "seo" } });
    res.json({ status: "success", seo: asObject(row?.value), builtIn: BUILT_IN_SEO, pages: SEO_PAGES });
  } catch (e) {
    console.error("Admin SEO load error:", e);
    res.status(500).json({ status: "error", message: "Failed to load SEO settings." });
  }
});

adminSettingsRouter.patch("/seo", async (req: Request, res: Response) => {
  try {
    const scope = String(req.body?.scope ?? "");
    if (scope !== "DEFAULT" && !(SEO_PAGES as readonly string[]).includes(scope)) throw new Invalid("Choose a page.", "scope");
    const values = readSeo(scope, asObject(req.body?.values));
    const row = await prisma.siteSetting.findUnique({ where: { key: "seo" } });
    const all = asObject(row?.value);
    const before = asObject(all[scope]);
    const changedFields = Array.from(new Set([...Object.keys(before), ...Object.keys(values)])).filter((k) => JSON.stringify(before[k]) !== JSON.stringify((values as any)[k]));
    if (changedFields.length === 0) return void res.json({ status: "success", changed: false, message: "No changes to save." });
    const nextAll = { ...all, [scope]: values };
    if (Object.keys(values).length === 0) delete (nextAll as any)[scope];
    await prisma.$transaction(async (tx) => {
      await tx.siteSetting.upsert({ where: { key: "seo" }, update: { value: nextAll }, create: { key: "seo", value: nextAll } });
      await recordAdminContentChange(tx, { actorId: actor(req), action: "SEO_SETTINGS_UPDATED", entityType: "SiteSetting", entityId: "seo", changedFields, extra: { scope } });
    });
    res.json({ status: "success", changed: true, message: "SEO settings saved." });
  } catch (e) {
    if (e instanceof Invalid) return void res.status(400).json({ status: "error", code: "INVALID_INPUT", field: e.field, message: e.message });
    console.error("Admin SEO save error:", e);
    res.status(500).json({ status: "error", message: "Failed to save SEO settings." });
  }
});
