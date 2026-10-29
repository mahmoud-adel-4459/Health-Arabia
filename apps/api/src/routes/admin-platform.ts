import { Router, type Request, type Response } from "express";
import type { ContactSubmissionStatus } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { requirePlatformAdmin } from "./admin-accounts";

// Platform-wide admin areas: overview counts, public directory listings, reference data, contact
// submissions, and audit history. Every route requires PLATFORM_ADMIN (re-checked on each request).
export const adminPlatformRouter = Router();
adminPlatformRouter.use(requirePlatformAdmin);

const page = (req: Request) => Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
const limitOf = (req: Request, max = 100, def = 25) => Math.min(max, Math.max(1, parseInt(String(req.query.limit ?? def), 10) || def));

// ---------------------------------------------------------------------------
// GET /api/admin/badge-counts: count-only numbers for the sidebar badges.
// Selects no personal data and writes no audit entries, so frequent refreshes stay silent.
// ---------------------------------------------------------------------------
adminPlatformRouter.get("/badge-counts", async (_req: Request, res: Response) => {
  try {
    const [pendingAccounts, doctorChanges, facilityChanges, jobsPending, releasesToDecide, placementsReady, contactNew, deletionOpen] = await Promise.all([
      prisma.user.count({ where: { role: { in: ["DOCTOR", "FACILITY"] }, status: "PENDING_REVIEW" } }),
      prisma.doctorProfileChangeRequest.count({ where: { status: "PENDING" } }),
      prisma.facilityProfileChangeRequest.count({ where: { status: "PENDING" } }),
      prisma.job.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.identityRelease.count({ where: { status: "PENDING", doctorConsentStatus: "GRANTED" } }),
      prisma.hireRequestItem.count({
        where: { status: "AGREED", identityRelease: { status: "APPROVED", doctorConsentStatus: "GRANTED", conversation: { isNot: null } } },
      }),
      prisma.contactSubmission.count({ where: { status: "NEW" } }),
      prisma.accountDeletionRequest.count({ where: { status: { in: ["REQUESTED", "IN_REVIEW"] } } }),
    ]);
    res.json({ status: "success", counts: { pendingAccounts, doctorChanges, facilityChanges, jobsPending, releasesToDecide, placementsReady, contactNew, deletionOpen } });
  } catch (error) {
    console.error("Admin badge counts error:", error);
    res.status(500).json({ status: "error", message: "Failed to load counts." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/overview: real counts for every sidebar area (no placeholders)
// ---------------------------------------------------------------------------
adminPlatformRouter.get("/overview", async (req: Request, res: Response) => {
  try {
    // Time-based figures cover the last 7, 30 or 90 whole days up to and including today (UTC)
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const todayUtc = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    const since = new Date(todayUtc.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const [
      pendingDoctors,
      pendingFacilities,
      approvedDoctors,
      approvedFacilities,
      jobsPendingReview,
      jobsPublished,
      applicationsByStatus,
      applicationsWithoutHireRequest,
      hireRequestsByStatus,
      releasesAwaitingConsent,
      releasesAwaitingDecision,
      placementsReadyToComplete,
      doctorChangesPending,
      facilityChangesPending,
      listedFacilities,
      approvedUnlistedFacilities,
      contactNew,
      contactInReview,
      auditLast7Days,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "DOCTOR", status: "PENDING_REVIEW" } }),
      prisma.user.count({ where: { role: "FACILITY", status: "PENDING_REVIEW" } }),
      prisma.user.count({ where: { role: "DOCTOR", status: "APPROVED" } }),
      prisma.user.count({ where: { role: "FACILITY", status: "APPROVED" } }),
      prisma.job.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.job.count({ where: { status: "PUBLISHED" } }),
      prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.application.count({ where: { hireRequestItems: { none: {} } } }),
      prisma.hireRequest.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.identityRelease.count({ where: { status: "PENDING", doctorConsentStatus: "PENDING" } }),
      prisma.identityRelease.count({ where: { status: "PENDING", doctorConsentStatus: "GRANTED" } }),
      prisma.hireRequestItem.count({
        where: { status: "AGREED", identityRelease: { status: "APPROVED", doctorConsentStatus: "GRANTED", conversation: { isNot: null } } },
      }),
      prisma.doctorProfileChangeRequest.count({ where: { status: "PENDING" } }),
      prisma.facilityProfileChangeRequest.count({ where: { status: "PENDING" } }),
      prisma.facility.count({ where: { isListedPublicly: true, publicListingEnabledAt: { not: null }, user: { status: "APPROVED" } } }),
      prisma.facility.count({ where: { isListedPublicly: false, user: { status: "APPROVED" } } }),
      prisma.contactSubmission.count({ where: { status: "NEW" } }),
      prisma.contactSubmission.count({ where: { status: "IN_REVIEW" } }),
      prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ]);
    const byStatus = (rows: Array<{ status: string; _count: { _all: number } }>) =>
      Object.fromEntries(rows.map((r) => [r.status, r._count._all]));

    // ---- Trends, all calculated from real records in the selected range
    const [dayRows, weekRows, applied, hireRequested, consentGranted, released, hired, specialtyRows, countryRows] = await Promise.all([
      prisma.$queryRaw<Array<{ day: string; n: bigint }>>`SELECT to_char(date_trunc('day', "submittedAt"), 'YYYY-MM-DD') AS day, count(*)::bigint AS n FROM "Application" WHERE "submittedAt" >= ${since} GROUP BY 1`,
      prisma.$queryRaw<Array<{ week: string; n: bigint }>>`SELECT to_char(date_trunc('week', "createdAt"), 'YYYY-MM-DD') AS week, count(*)::bigint AS n FROM "AuditLog" WHERE action = 'PLACEMENT_COMPLETED' AND "createdAt" >= ${since} GROUP BY 1`,
      prisma.application.count({ where: { submittedAt: { gte: since } } }),
      prisma.application.count({ where: { submittedAt: { gte: since }, hireRequestItems: { some: {} } } }),
      prisma.application.count({ where: { submittedAt: { gte: since }, hireRequestItems: { some: { identityRelease: { doctorConsentStatus: "GRANTED" } } } } }),
      prisma.application.count({ where: { submittedAt: { gte: since }, hireRequestItems: { some: { identityRelease: { status: "APPROVED" } } } } }),
      prisma.application.count({ where: { submittedAt: { gte: since }, status: "HIRED" } }),
      prisma.application.groupBy({ by: ["anonymousSpecialtyId"], where: { submittedAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { anonymousSpecialtyId: "desc" } }, take: 6 }),
      prisma.job.groupBy({ by: ["countryId"], where: { status: "PUBLISHED" }, _count: { _all: true }, orderBy: { _count: { countryId: "desc" } }, take: 6 }),
    ]);
    const [specialtyNames, countryNames] = await Promise.all([
      prisma.specialty.findMany({ where: { id: { in: specialtyRows.map((r) => r.anonymousSpecialtyId) } }, select: { id: true, nameEn: true } }),
      prisma.country.findMany({ where: { id: { in: countryRows.map((r) => r.countryId) } }, select: { id: true, nameEn: true } }),
    ]);
    const perDay = new Map(dayRows.map((r) => [r.day, Number(r.n)]));
    const applicationsPerDay = Array.from({ length: days }, (_, i) => {
      const date = new Date(since.getTime() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return { date, count: perDay.get(date) ?? 0 };
    });
    const placementsPerWeek = weekRows.map((r) => ({ weekStarting: r.week, count: Number(r.n) })).sort((a, b) => a.weekStarting.localeCompare(b.weekStarting));
    const trends = {
      rangeDays: days,
      since: since.toISOString(),
      applicationsPerDay,
      funnel: { applied, hireRequested, consentGranted, identityReleased: released, hired },
      placementsCompleted: placementsPerWeek.reduce((sum, w) => sum + w.count, 0),
      placementsPerWeek,
      applicationsBySpecialty: specialtyRows.map((r) => ({ name: specialtyNames.find((s) => s.id === r.anonymousSpecialtyId)?.nameEn ?? "Unknown", count: r._count._all })),
      publishedJobsByCountry: countryRows.map((r) => ({ name: countryNames.find((c) => c.id === r.countryId)?.nameEn ?? "Unknown", count: r._count._all })),
    };

    res.json({
      status: "success",
      overview: {
        accounts: { pendingDoctors, pendingFacilities, approvedDoctors, approvedFacilities },
        jobs: { pendingReview: jobsPendingReview, published: jobsPublished },
        applications: { byStatus: byStatus(applicationsByStatus), withoutHireRequest: applicationsWithoutHireRequest },
        hireRequests: {
          byStatus: byStatus(hireRequestsByStatus),
          releasesAwaitingConsent,
          releasesAwaitingDecision,
          placementsReadyToComplete,
        },
        profileChanges: { doctorPending: doctorChangesPending, facilityPending: facilityChangesPending },
        directory: { listed: listedFacilities, approvedUnlisted: approvedUnlistedFacilities },
        contact: { new: contactNew, inReview: contactInReview },
        audit: { last7Days: auditLast7Days },
        trends,
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({ status: "error", message: "Failed to load overview." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/facility-listings: every facility with approval + listing state
// (changes go through POST /api/admin/accounts/:id/public-listing, which is audited)
// ---------------------------------------------------------------------------
adminPlatformRouter.get("/facility-listings", async (req: Request, res: Response) => {
  try {
    const filter = String(req.query.filter ?? "ALL");
    const where: any = {};
    if (filter === "LISTED") Object.assign(where, { isListedPublicly: true });
    if (filter === "APPROVED_UNLISTED") Object.assign(where, { isListedPublicly: false, user: { status: "APPROVED" } });
    if (filter === "NOT_APPROVED") Object.assign(where, { user: { status: { not: "APPROVED" } } });
    const facilities = await prisma.facility.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        isListedPublicly: true,
        publicListingEnabledAt: true,
        publicListingEnabledBy: { select: { displayName: true, email: true } },
        city: { select: { nameEn: true } },
        country: { select: { nameEn: true } },
        user: { select: { id: true, status: true } },
        _count: { select: { jobs: true } },
      },
    });
    res.json({
      status: "success",
      facilities: facilities.map((f) => ({
        id: f.id,
        accountId: f.user.id,
        name: f.name,
        slug: f.slug,
        location: [f.city?.nameEn, f.country?.nameEn].filter(Boolean).join(", ") || null,
        accountStatus: f.user.status,
        isListedPublicly: f.isListedPublicly,
        // Visible publicly only when all three conditions hold (same rule as the public API)
        isPubliclyVisible: f.isListedPublicly && !!f.publicListingEnabledAt && f.user.status === "APPROVED",
        enabledAt: f.publicListingEnabledAt,
        enabledBy: f.publicListingEnabledBy?.displayName ?? f.publicListingEnabledBy?.email ?? null,
        jobsCount: f._count.jobs,
      })),
    });
  } catch (error) {
    console.error("Admin facility listings error:", error);
    res.status(500).json({ status: "error", message: "Failed to load facility listings." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/reference-data: read-only view of managed reference data and CMS content.
// The project has no admin editing APIs for these yet; they are managed through prisma/seed-reference.ts.
// ---------------------------------------------------------------------------
adminPlatformRouter.get("/reference-data", async (_req: Request, res: Response) => {
  try {
    const [countries, specialties, employmentTypes, salaryPeriods, currencies, noticePeriods, referralSources, contactSubjects, faqs, contentBlocks, siteSettings] =
      await Promise.all([
        prisma.country.findMany({
          orderBy: { sortOrder: "asc" },
          select: { id: true, nameEn: true, isoCode: true, isGcc: true, isActive: true, isGuidePublished: true, _count: { select: { cities: true, guideSections: true } } },
        }),
        prisma.specialty.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true, slug: true, isActive: true } }),
        prisma.employmentTypeOption.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true, nameEn: true, isActive: true } }),
        prisma.salaryPeriodOption.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true, nameEn: true, isActive: true } }),
        prisma.currency.findMany({ orderBy: { sortOrder: "asc" }, select: { code: true, nameEn: true, isActive: true } }),
        prisma.noticePeriodOption.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true, nameEn: true, isActive: true } }),
        prisma.referralSourceOption.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true, nameEn: true, isActive: true } }),
        prisma.contactSubjectOption.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true, nameEn: true, isActive: true } }),
        prisma.faq.findMany({ orderBy: [{ locale: "asc" }, { sortOrder: "asc" }], select: { id: true, locale: true, question: true, isPublished: true, updatedAt: true } }),
        prisma.contentBlock.findMany({ orderBy: [{ page: "asc" }, { sortOrder: "asc" }], select: { id: true, page: true, key: true, locale: true, title: true, isPublished: true, updatedAt: true } }),
        prisma.siteSetting.findMany({ select: { key: true } }),
      ]);
    const cities = await prisma.city.findMany({
      orderBy: [{ countryId: "asc" }, { sortOrder: "asc" }],
      select: { id: true, nameEn: true, isActive: true, country: { select: { nameEn: true } } },
    });
    res.json({
      status: "success",
      editable: false,
      managedBy: "prisma/seed-reference.ts (pnpm db:seed:reference)",
      countries: countries.map((c) => ({ ...c, citiesCount: c._count.cities, guideSectionsCount: c._count.guideSections, _count: undefined })),
      cities: cities.map((c) => ({ id: c.id, nameEn: c.nameEn, country: c.country.nameEn, isActive: c.isActive })),
      specialties,
      options: { employmentTypes, salaryPeriods, currencies, noticePeriods, referralSources, contactSubjects },
      faqs,
      contentBlocks,
      siteSettings: siteSettings.map((s) => s.key),
    });
  } catch (error) {
    console.error("Admin reference data error:", error);
    res.status(500).json({ status: "error", message: "Failed to load reference data." });
  }
});

// ---------------------------------------------------------------------------
// Contact submissions
// ---------------------------------------------------------------------------
const CONTACT_STATUSES: ContactSubmissionStatus[] = ["NEW", "IN_REVIEW", "RESOLVED", "SPAM"];
// Valid moves: NEW -> IN_REVIEW | RESOLVED | SPAM, IN_REVIEW -> RESOLVED | SPAM. RESOLVED and SPAM are final.
const CONTACT_TRANSITIONS: Record<ContactSubmissionStatus, ContactSubmissionStatus[]> = {
  NEW: ["IN_REVIEW", "RESOLVED", "SPAM"],
  IN_REVIEW: ["RESOLVED", "SPAM"],
  RESOLVED: [],
  SPAM: [],
};

adminPlatformRouter.get("/contact-submissions", async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status ?? "ALL");
    const search = String(req.query.search ?? "").trim();
    const where: any = {};
    if (CONTACT_STATUSES.includes(status as ContactSubmissionStatus)) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }
    const p = page(req);
    const limit = limitOf(req, 50, 20);
    const [items, total, grouped] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * limit,
        take: limit,
        include: { subject: { select: { nameEn: true } }, reviewedBy: { select: { displayName: true, email: true } } },
      }),
      prisma.contactSubmission.count({ where }),
      prisma.contactSubmission.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const counts: Record<string, number> = { ALL: 0, NEW: 0, IN_REVIEW: 0, RESOLVED: 0, SPAM: 0 };
    for (const g of grouped) {
      counts[g.status] = g._count._all;
      counts.ALL += g._count._all;
    }
    res.json({
      status: "success",
      items: items.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        email: s.email,
        phone: s.phone,
        subject: s.subject?.nameEn ?? null,
        message: s.message,
        status: s.status,
        nextStatuses: CONTACT_TRANSITIONS[s.status],
        internalNote: s.internalNote,
        reviewedAt: s.reviewedAt,
        reviewedBy: s.reviewedBy?.displayName ?? s.reviewedBy?.email ?? null,
        createdAt: s.createdAt,
      })),
      meta: { page: p, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), counts },
    });
  } catch (error) {
    console.error("Admin contact submissions error:", error);
    res.status(500).json({ status: "error", message: "Failed to load contact submissions." });
  }
});

// Full detail of one submission, with who reviewed it and every status change
adminPlatformRouter.get("/contact-submissions/:id", async (req: Request, res: Response) => {
  try {
    const s = await prisma.contactSubmission.findUnique({
      where: { id: String(req.params.id) },
      include: { subject: { select: { nameEn: true } }, reviewedBy: { select: { displayName: true, email: true } }, user: { select: { id: true, role: true } } },
    });
    if (!s) return void res.status(404).json({ status: "error", message: "Submission not found.", code: "NOT_FOUND" });
    const history = await prisma.auditLog.findMany({
      where: { entityType: "ContactSubmission", entityId: s.id },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: { displayName: true, email: true } } },
    });
    res.json({
      status: "success",
      submission: {
        id: s.id,
        fullName: s.fullName,
        email: s.email,
        phone: s.phone,
        subject: s.subject?.nameEn ?? null,
        message: s.message,
        language: s.locale,
        status: s.status,
        nextStatuses: CONTACT_TRANSITIONS[s.status],
        internalNote: s.internalNote,
        reviewedAt: s.reviewedAt,
        reviewedBy: s.reviewedBy?.displayName ?? s.reviewedBy?.email ?? null,
        createdAt: s.createdAt,
        submittedBy: s.user ? { role: s.user.role } : null,
        history: history.map((h) => {
          const m = (h.metadata ?? {}) as Record<string, any>;
          return { at: h.createdAt, from: m.from ?? null, to: m.to ?? null, note: m.note ?? null, actor: h.actor?.displayName ?? h.actor?.email ?? "Platform" };
        }),
      },
    });
  } catch (error) {
    console.error("Admin contact submission detail error:", error);
    res.status(500).json({ status: "error", message: "Failed to load the submission." });
  }
});

adminPlatformRouter.post("/contact-submissions/:id/status", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const next = String(req.body?.status ?? "") as ContactSubmissionStatus;
    const rawNote = req.body?.internalNote;
    const internalNote = typeof rawNote === "string" && rawNote.trim() ? rawNote.trim().slice(0, 2000) : undefined;
    if (!CONTACT_STATUSES.includes(next)) {
      res.status(400).json({ status: "error", message: "Unknown status.", code: "INVALID_INPUT" });
      return;
    }
    const submission = await prisma.contactSubmission.findUnique({ where: { id: String(req.params.id) } });
    if (!submission) {
      res.status(404).json({ status: "error", message: "Submission not found.", code: "NOT_FOUND" });
      return;
    }
    if (!CONTACT_TRANSITIONS[submission.status].includes(next)) {
      res.status(409).json({
        status: "error",
        code: "INVALID_TRANSITION",
        message: `A ${submission.status.toLowerCase().replace("_", " ")} submission cannot move to ${next.toLowerCase().replace("_", " ")}.`,
      });
      return;
    }
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.contactSubmission.updateMany({
        where: { id: submission.id, status: submission.status },
        data: { status: next, reviewedById: adminUser.id, reviewedAt: now, ...(internalNote !== undefined ? { internalNote } : {}) },
      });
      if (claimed.count === 0) throw new Error("CONFLICT");
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "CONTACT_SUBMISSION_STATUS_CHANGED",
          entityType: "ContactSubmission",
          entityId: submission.id,
          metadata: { from: submission.status, to: next, note: internalNote ?? null },
        },
      });
    });
    res.json({ status: "success", message: `Submission marked ${next.toLowerCase().replace("_", " ")}.` });
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") {
      res.status(409).json({ status: "error", code: "CONFLICT", message: "This submission was updated by someone else. Reload and try again." });
      return;
    }
    console.error("Admin contact status error:", error);
    res.status(500).json({ status: "error", message: "Failed to update submission." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/audit-logs: append-only history. Metadata is reduced to record references and notes
// so that values such as proposed profile fields are not re-displayed here.
// ---------------------------------------------------------------------------
const SAFE_META_KEYS = new Set([
  "applicationId", "hireRequestId", "hireRequestItemId", "identityReleaseId", "conversationId", "facilityId",
  "doctorId", "jobId", "context", "count", "from", "to", "note", "reason", "rejectionReason", "decisionNote",
  "hireRequestCompleted", "entityIds", "at",
]);

adminPlatformRouter.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const action = String(req.query.action ?? "").trim();
    const entityType = String(req.query.entityType ?? "").trim();
    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    const p = page(req);
    const limit = limitOf(req, 100, 25);
    const [logs, total, actions, entityTypes] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * limit,
        take: limit,
        include: { actor: { select: { displayName: true, email: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { action: "asc" } }),
      prisma.auditLog.groupBy({ by: ["entityType"], _count: { _all: true }, orderBy: { entityType: "asc" } }),
    ]);
    res.json({
      status: "success",
      items: logs.map((l) => {
        const meta = (l.metadata as Record<string, unknown> | null) ?? {};
        const safe = Object.fromEntries(Object.entries(meta).filter(([k]) => SAFE_META_KEYS.has(k)));
        return {
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          actor: l.actor?.displayName ?? l.actor?.email ?? "System",
          actorRole: l.actor?.role ?? null,
          metadata: safe,
          createdAt: l.createdAt,
        };
      }),
      filters: {
        actions: actions.map((a) => ({ value: a.action, count: a._count._all })),
        entityTypes: entityTypes.map((e) => ({ value: e.entityType, count: e._count._all })),
      },
      meta: { page: p, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error("Admin audit logs error:", error);
    res.status(500).json({ status: "error", message: "Failed to load audit history." });
  }
});
