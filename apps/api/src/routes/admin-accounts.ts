import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { recordAdminIdentityRead } from "../lib/admin-audit";
import { getAuthenticatedUser } from "./auth";

export const adminAccountsRouter = Router();

// ---------------------------------------------------------------------------
// Middleware: Require PLATFORM_ADMIN
// Denies anonymous users (401) and DOCTOR / FACILITY accounts (403)
// ---------------------------------------------------------------------------
export async function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req, "admin");
    if (!user) {
      res.status(401).json({
        status: "error",
        message: "Authentication required.",
        code: "UNAUTHENTICATED",
      });
      return;
    }

    if (user.role !== "PLATFORM_ADMIN") {
      res.status(403).json({
        status: "error",
        message: "Access denied. Platform Administrator privileges required.",
        code: "FORBIDDEN",
      });
      return;
    }

    (req as any).adminUser = user;
    next();
  } catch (error) {
    console.error("Admin authorization guard error:", error);
    res.status(500).json({ status: "error", message: "Internal authentication error" });
  }
}

// Apply admin guard to all routes in this router
adminAccountsRouter.use(requirePlatformAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/accounts
// Review queue with role/status filters, search, and pagination
// ---------------------------------------------------------------------------
adminAccountsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const roleParam = (req.query.role as string | undefined)?.toUpperCase();
    const statusParam = (req.query.status as string | undefined)?.toUpperCase();
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    // Build Prisma where clause
    const where: any = {
      role: { in: ["DOCTOR", "FACILITY"] }, // Only candidate & institutional accounts
    };

    if (roleParam && (roleParam === "DOCTOR" || roleParam === "FACILITY")) {
      where.role = roleParam;
    }

    if (statusParam && statusParam !== "ALL") {
      const validStatuses = ["PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED", "DRAFT"];
      if (validStatuses.includes(statusParam)) {
        where.status = statusParam;
      }
    } else if (!statusParam) {
      // Default to PENDING_REVIEW if status not specified
      where.status = "PENDING_REVIEW";
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { mobileE164: { contains: search } },
        { displayName: { contains: search, mode: "insensitive" } },
        {
          doctorProfile: {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { jobTitle: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          facility: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { officerName: { contains: search, mode: "insensitive" } },
              { hospitalEmail: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // Parallel fetch: data, total count, and summary counters
    const [accounts, total, countsRaw] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { submittedForReviewAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          email: true,
          mobileE164: true,
          displayName: true,
          role: true,
          status: true,
          submittedForReviewAt: true,
          reviewedAt: true,
          reviewNote: true,
          createdAt: true,
          reviewedBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          doctorProfile: {
            select: {
              id: true,
              fullName: true,
              jobTitle: true,
              yearsOfExperience: true,
              primarySpecialty: { select: { id: true, nameEn: true, nameAr: true } },
              residenceCountry: { select: { id: true, nameEn: true, nameAr: true } },
              cvId: true,
              photoId: true,
            },
          },
          facility: {
            select: {
              id: true,
              name: true,
              type: true,
              officerName: true,
              officerPhone: true,
              hospitalEmail: true,
              cityId: true,
              city: { select: { id: true, nameEn: true, nameAr: true } },
              country: { select: { id: true, nameEn: true, nameAr: true } },
              logoId: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({
        by: ["role", "status"],
        where: { role: { in: ["DOCTOR", "FACILITY"] } },
        _count: { _all: true },
      }),
    ]);

    // Compute metric badges
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let doctorPendingCount = 0;
    let facilityPendingCount = 0;

    for (const group of countsRaw) {
      if (group.status === "PENDING_REVIEW") {
        pendingCount += group._count._all;
        if (group.role === "DOCTOR") doctorPendingCount += group._count._all;
        if (group.role === "FACILITY") facilityPendingCount += group._count._all;
      } else if (group.status === "APPROVED") {
        approvedCount += group._count._all;
      } else if (group.status === "REJECTED") {
        rejectedCount += group._count._all;
      }
    }

    const totalPages = Math.ceil(total / limit) || 1;

    await recordAdminIdentityRead({
      actorId: (req as any).adminUser.id,
      entityType: "User",
      entityIds: accounts.filter((acc) => acc.role === "DOCTOR").map((acc) => acc.id),
      context: "GET /api/admin/accounts",
    });

    res.json({
      status: "success",
      data: accounts.map((acc) => {
        const applicantName =
          acc.role === "DOCTOR"
            ? (acc.doctorProfile?.fullName ?? acc.displayName ?? "Doctor")
            : (acc.facility?.name ?? acc.displayName ?? "Facility");

        const location =
          acc.role === "DOCTOR"
            ? (acc.doctorProfile?.residenceCountry?.nameEn ?? "Not specified")
            : (acc.facility?.city?.nameEn
                ? `${acc.facility.city.nameEn}, ${acc.facility.country?.nameEn ?? ""}`
                : acc.facility?.country?.nameEn ?? "Not specified");

        return {
          id: acc.id,
          role: acc.role,
          status: acc.status,
          applicantName,
          email: acc.email,
          mobileE164: acc.mobileE164,
          location,
          submittedForReviewAt: acc.submittedForReviewAt,
          reviewedAt: acc.reviewedAt,
          reviewNote: acc.reviewNote,
          reviewedBy: acc.reviewedBy,
          createdAt: acc.createdAt,
          hasCv: Boolean(acc.doctorProfile?.cvId),
          hasLogo: Boolean(acc.facility?.logoId),
          summary:
            acc.role === "DOCTOR"
              ? {
                  jobTitle: acc.doctorProfile?.jobTitle,
                  specialty: acc.doctorProfile?.primarySpecialty?.nameEn,
                  yearsOfExperience: acc.doctorProfile?.yearsOfExperience,
                }
              : {
                  type: acc.facility?.type,
                  officerName: acc.facility?.officerName,
                  hospitalEmail: acc.facility?.hospitalEmail,
                },
        };
      }),
      meta: {
        page,
        limit,
        total,
        totalPages,
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          doctorsPending: doctorPendingCount,
          facilitiesPending: facilityPendingCount,
        },
      },
    });
  } catch (error) {
    console.error("Failed to list admin review accounts:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch account review queue" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/accounts/:id
// Comprehensive single record view: profile, facility message, private documents
// ---------------------------------------------------------------------------
adminAccountsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const account = await prisma.user.findUnique({
      where: { id },
      include: {
        reviewedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        doctorProfile: {
          include: {
            primarySpecialty: true,
            residenceCountry: true,
            nationality: true,
            educations: { orderBy: { graduationYear: "desc" } },
            licenses: true,
            experiences: { orderBy: { startDate: "desc" } },
            languages: true,
            cv: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
              },
            },
            photo: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
              },
            },
          },
        },
        facility: {
          include: {
            city: true,
            country: true,
            publicListingEnabledBy: { select: { id: true, displayName: true, email: true } },
            logo: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!account) {
      res.status(404).json({ status: "error", message: "Account not found", code: "NOT_FOUND" });
      return;
    }

    // Fetch entity audit history
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "User",
        entityId: account.id,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (account.role === "DOCTOR") {
      await recordAdminIdentityRead({
        actorId: (req as any).adminUser.id,
        entityType: "User",
        entityIds: [account.id],
        context: "GET /api/admin/accounts/:id",
      });
    }

    res.json({
      status: "success",
      account: {
        id: account.id,
        email: account.email,
        mobileE164: account.mobileE164,
        displayName: account.displayName,
        role: account.role,
        status: account.status,
        submittedForReviewAt: account.submittedForReviewAt,
        reviewedAt: account.reviewedAt,
        reviewNote: account.reviewNote,
        reviewedBy: account.reviewedBy,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        doctorProfile: account.doctorProfile
          ? {
              id: account.doctorProfile.id,
              fullName: account.doctorProfile.fullName,
              gender: account.doctorProfile.gender,
              dateOfBirth: account.doctorProfile.dateOfBirth,
              jobTitle: account.doctorProfile.jobTitle,
              about: account.doctorProfile.about,
              yearsOfExperience: account.doctorProfile.yearsOfExperience,
              currentPosition: account.doctorProfile.currentPosition,
              specialty: account.doctorProfile.primarySpecialty?.nameEn,
              residenceCountry: account.doctorProfile.residenceCountry?.nameEn,
              nationality: account.doctorProfile.nationality?.nameEn,
              educations: account.doctorProfile.educations,
              licenses: account.doctorProfile.licenses,
              experiences: account.doctorProfile.experiences,
              languages: account.doctorProfile.languages,
              cv: account.doctorProfile.cv
                ? {
                    id: account.doctorProfile.cv.id,
                    name: account.doctorProfile.cv.originalName,
                    sizeBytes: account.doctorProfile.cv.sizeBytes,
                    mimeType: account.doctorProfile.cv.mimeType,
                    downloadUrl: `/api/files/download/${account.doctorProfile.cv.id}`,
                  }
                : null,
              photo: account.doctorProfile.photo
                ? {
                    id: account.doctorProfile.photo.id,
                    name: account.doctorProfile.photo.originalName,
                    downloadUrl: `/api/files/download/${account.doctorProfile.photo.id}`,
                  }
                : null,
            }
          : null,
        facility: account.facility
          ? {
              id: account.facility.id,
              name: account.facility.name,
              type: account.facility.type,
              description: account.facility.description,
              address: account.facility.address,
              locationUrl: account.facility.locationUrl,
              employeeCount: account.facility.employeeCount,
              hospitalEmail: account.facility.hospitalEmail,
              inquiryMessage: account.facility.inquiryMessage,
              officerName: account.facility.officerName,
              officerPhoneCountryCode: account.facility.officerPhoneCountryCode,
              officerPhone: account.facility.officerPhone,
              city: account.facility.city?.nameEn,
              country: account.facility.country?.nameEn,
              slug: account.facility.slug,
              publicListing: {
                isListedPublicly: account.facility.isListedPublicly,
                enabledAt: account.facility.publicListingEnabledAt,
                enabledBy: account.facility.publicListingEnabledBy
                  ? {
                      id: account.facility.publicListingEnabledBy.id,
                      name: account.facility.publicListingEnabledBy.displayName ?? account.facility.publicListingEnabledBy.email,
                    }
                  : null,
              },
              logo: account.facility.logo
                ? {
                    id: account.facility.logo.id,
                    name: account.facility.logo.originalName,
                    sizeBytes: account.facility.logo.sizeBytes,
                    mimeType: account.facility.logo.mimeType,
                    downloadUrl: `/api/files/download/${account.facility.logo.id}`,
                  }
                : null,
            }
          : null,
        auditLogs: auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          actor: log.actor?.displayName ?? "Platform",
          metadata: log.metadata,
          createdAt: log.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to fetch admin account detail:", error);
    res.status(500).json({ status: "error", message: "Failed to load account details" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/accounts/:id/public-listing   body: { enabled: boolean }
// Enables/disables an approved facility's listing in the public Hospitals directory.
// Enable records the responsible admin + timestamp on the facility (publicListingEnabledById/At).
// Disable removes it from public results immediately (public queries require isListedPublicly);
// the last enable record is kept on the row, and every change is written to the audit log.
// The database also enforces both rules (CHECK constraint + approved-account trigger).
// ---------------------------------------------------------------------------
adminAccountsRouter.post("/:id/public-listing", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const id = String(req.params.id);
    const { enabled } = req.body ?? {};

    if (typeof enabled !== "boolean") {
      res.status(400).json({ status: "error", message: "Body must include enabled: true or false.", code: "INVALID_INPUT" });
      return;
    }

    const account = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, facility: { select: { id: true, name: true, isListedPublicly: true } } },
    });
    if (!account || account.role !== "FACILITY" || !account.facility) {
      res.status(404).json({ status: "error", message: "Facility account not found.", code: "NOT_FOUND" });
      return;
    }
    if (enabled && account.status !== "APPROVED") {
      res.status(409).json({
        status: "error",
        message: `Only approved facilities can be listed publicly. This account is ${account.status.toLowerCase().replace(/_/g, " ")}.`,
        code: "FACILITY_NOT_APPROVED",
      });
      return;
    }
    if (account.facility.isListedPublicly === enabled) {
      res.json({ status: "success", changed: false, isListedPublicly: enabled, message: "Listing status is already up to date." });
      return;
    }

    const now = new Date();
    const facility = await prisma.$transaction(async (tx) => {
      const updated = await tx.facility.update({
        where: { id: account.facility!.id },
        data: enabled
          ? { isListedPublicly: true, publicListingEnabledAt: now, publicListingEnabledById: adminUser.id }
          : { isListedPublicly: false },
        select: { id: true, isListedPublicly: true, publicListingEnabledAt: true, publicListingEnabledById: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: enabled ? "FACILITY_PUBLIC_LISTING_ENABLED" : "FACILITY_PUBLIC_LISTING_DISABLED",
          entityType: "User",
          entityId: account.id,
          metadata: { facilityId: account.facility!.id, facilityName: account.facility!.name, at: now.toISOString() },
        },
      });
      return updated;
    });

    res.json({
      status: "success",
      changed: true,
      isListedPublicly: facility.isListedPublicly,
      publicListingEnabledAt: facility.publicListingEnabledAt,
      message: enabled ? "Facility is now listed in the public Hospitals directory." : "Facility removed from the public Hospitals directory.",
    });
  } catch (error) {
    console.error("Admin public listing update error:", error);
    res.status(500).json({ status: "error", message: "Failed to update public listing." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/accounts/:id/approve
// Approves account, records reviewer, timestamp, and audit trail
// ---------------------------------------------------------------------------
adminAccountsRouter.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { note } = req.body ?? {};
    const adminUser = (req as any).adminUser;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          status: true,
          displayName: true,
          email: true,
        },
      });

      if (!user) {
        throw { statusCode: 404, message: "Account not found", code: "NOT_FOUND" };
      }

      if (user.status === "APPROVED") {
        throw { statusCode: 400, message: "Account is already approved.", code: "ALREADY_APPROVED" };
      }

      if (user.status === "DRAFT") {
        throw { statusCode: 400, message: "Cannot approve an incomplete draft account.", code: "INVALID_STATUS" };
      }

      if (user.status === "DEACTIVATED") {
        throw { statusCode: 400, message: "Cannot approve a deactivated account.", code: "INVALID_STATUS" };
      }

      // A suspended account is restored through "unsuspend", not approve.
      if (user.status === "SUSPENDED") {
        throw { statusCode: 400, message: "Cannot approve a suspended account. Use unsuspend instead.", code: "INVALID_STATUS" };
      }

      // Re-review of a rejected account needs its own reason; the earlier decision stays in the audit history.
      const isReReview = user.status === "REJECTED";
      if (isReReview && !(typeof note === "string" && note.trim().length >= 3)) {
        throw { statusCode: 400, message: "A reason is required to review a rejected account again (at least 3 characters).", code: "MISSING_REASON", field: "note" };
      }

      const reviewNoteText = note && typeof note === "string" && note.trim()
        ? note.trim()
        : "Approved by platform administration";

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedById: adminUser.id,
          reviewNote: reviewNoteText,
        },
        select: {
          id: true,
          role: true,
          status: true,
          displayName: true,
          email: true,
          reviewedAt: true,
          reviewNote: true,
        },
      });

      // Append-only audit record
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "ACCOUNT_APPROVED",
          entityType: "User",
          entityId: user.id,
          metadata: {
            previousStatus: user.status,
            newStatus: "APPROVED",
            role: user.role,
            reviewerId: adminUser.id,
            reviewerEmail: adminUser.email,
            note: reviewNoteText,
            ...(isReReview ? { reReview: true } : {}),
          },
        },
      });

      return updatedUser;
    });

    res.json({
      status: "success",
      message: `Account approved successfully.`,
      user: result,
    });
  } catch (error: any) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({
        status: "error",
        message: error.message,
        code: error.code,
        ...(error.field ? { field: error.field } : {}),
      });
      return;
    }
    console.error("Failed to approve account:", error);
    res.status(500).json({ status: "error", message: "Failed to approve account" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/accounts/:id/reject
// Rejects account, revokes sessions, records reviewer, reason, and audit trail
// ---------------------------------------------------------------------------
adminAccountsRouter.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body ?? {};
    const adminUser = (req as any).adminUser;

    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      res.status(400).json({
        status: "error",
        message: "A specific rejection reason is required (at least 3 characters).",
        code: "MISSING_REASON",
      });
      return;
    }

    const cleanReason = reason.trim();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          status: true,
          displayName: true,
          email: true,
        },
      });

      if (!user) {
        throw { statusCode: 404, message: "Account not found", code: "NOT_FOUND" };
      }

      if (user.status === "REJECTED") {
        throw { statusCode: 400, message: "Account is already rejected.", code: "ALREADY_REJECTED" };
      }

      if (user.status === "DEACTIVATED") {
        throw { statusCode: 400, message: "Cannot reject a deactivated account.", code: "INVALID_STATUS" };
      }

      if (user.status === "SUSPENDED") {
        throw { statusCode: 400, message: "Cannot reject a suspended account.", code: "INVALID_STATUS" };
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedById: adminUser.id,
          reviewNote: cleanReason,
        },
        select: {
          id: true,
          role: true,
          status: true,
          displayName: true,
          email: true,
          reviewedAt: true,
          reviewNote: true,
        },
      });

      // Revoke all active sessions of this rejected account immediately
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // Append-only audit record
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "ACCOUNT_REJECTED",
          entityType: "User",
          entityId: user.id,
          metadata: {
            previousStatus: user.status,
            newStatus: "REJECTED",
            role: user.role,
            reviewerId: adminUser.id,
            reviewerEmail: adminUser.email,
            reason: cleanReason,
          },
        },
      });

      return updatedUser;
    });

    res.json({
      status: "success",
      message: "Account rejected and active sessions revoked.",
      user: result,
    });
  } catch (error: any) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({
        status: "error",
        message: error.message,
        code: error.code,
      });
      return;
    }
    console.error("Failed to reject account:", error);
    res.status(500).json({ status: "error", message: "Failed to reject account" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/accounts/:id/suspend
// Suspends an APPROVED doctor or facility account. The reason is required and stored as the
// account's review note (the previous note stays in the audit history). Sessions are revoked so
// sign-in and protected actions stop immediately. A publicly listed facility leaves the Hospitals
// directory. Applications, hire requests, chats and audit history are untouched.
// There is deliberately no un-suspend action: the lifecycle does not define one.
// ---------------------------------------------------------------------------
adminAccountsRouter.post("/:id/suspend", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body ?? {};
    const adminUser = (req as any).adminUser;

    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      res.status(400).json({ status: "error", message: "A specific suspension reason is required (at least 3 characters).", code: "MISSING_REASON", field: "reason" });
      return;
    }
    const cleanReason = reason.trim().slice(0, 2000);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: { id: true, role: true, status: true, facility: { select: { id: true, isListedPublicly: true } } },
      });
      if (!user) throw { statusCode: 404, message: "Account not found", code: "NOT_FOUND" };
      if (user.role !== "DOCTOR" && user.role !== "FACILITY") {
        throw { statusCode: 400, message: "Only doctor and facility accounts can be suspended.", code: "INVALID_ROLE" };
      }
      if (user.status === "SUSPENDED") throw { statusCode: 400, message: "Account is already suspended.", code: "ALREADY_SUSPENDED" };
      if (user.status !== "APPROVED") {
        throw { statusCode: 400, message: "Only approved accounts can be suspended.", code: "INVALID_STATUS" };
      }

      const claimed = await tx.user.updateMany({
        where: { id: user.id, status: "APPROVED" },
        data: { status: "SUSPENDED", reviewedAt: new Date(), reviewedById: adminUser.id, reviewNote: cleanReason },
      });
      if (claimed.count !== 1) throw { statusCode: 409, message: "The account changed while you were suspending it. Reload and try again.", code: "CONFLICT" };

      await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      const wasListed = Boolean(user.facility?.isListedPublicly);
      if (wasListed) await tx.facility.update({ where: { id: user.facility!.id }, data: { isListedPublicly: false } });

      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "ACCOUNT_SUSPENDED",
          entityType: "User",
          entityId: user.id,
          metadata: { previousStatus: user.status, newStatus: "SUSPENDED", role: user.role, reason: cleanReason, removedFromPublicDirectory: wasListed },
        },
      });
      return { id: user.id, status: "SUSPENDED", removedFromPublicDirectory: wasListed };
    });

    res.json({ status: "success", message: "Account suspended. Active sessions were revoked.", account: result });
  } catch (error: any) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({ status: "error", message: error.message, code: error.code });
      return;
    }
    console.error("Failed to suspend account:", error);
    res.status(500).json({ status: "error", message: "Failed to suspend account" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/accounts/:id/unsuspend
// SUSPENDED doctor/facility -> APPROVED only. A reason is required. Revoked sessions are NOT restored
// (the user signs in again). A facility's public directory listing is NOT re-enabled: an admin must do
// that explicitly. The suspension stays in the audit history.
// ---------------------------------------------------------------------------
adminAccountsRouter.post("/:id/unsuspend", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body ?? {};
    const adminUser = (req as any).adminUser;

    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      res.status(400).json({ status: "error", message: "A reason for lifting the suspension is required (at least 3 characters).", code: "MISSING_REASON", field: "reason" });
      return;
    }
    const cleanReason = reason.trim().slice(0, 2000);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, status: true, reviewNote: true } });
      if (!user) throw { statusCode: 404, message: "Account not found", code: "NOT_FOUND" };
      if (user.role !== "DOCTOR" && user.role !== "FACILITY") {
        throw { statusCode: 400, message: "Only doctor and facility accounts can be unsuspended.", code: "INVALID_ROLE" };
      }
      if (user.status !== "SUSPENDED") {
        throw { statusCode: 400, message: "Only suspended accounts can be unsuspended.", code: "INVALID_STATUS" };
      }
      const claimed = await tx.user.updateMany({
        where: { id: user.id, status: "SUSPENDED" },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: adminUser.id, reviewNote: cleanReason },
      });
      if (claimed.count !== 1) throw { statusCode: 409, message: "The account changed while you were working. Reload and try again.", code: "CONFLICT" };
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "ACCOUNT_UNSUSPENDED",
          entityType: "User",
          entityId: user.id,
          metadata: { previousStatus: "SUSPENDED", newStatus: "APPROVED", role: user.role, reason: cleanReason, suspensionReason: user.reviewNote, publicListingRestored: false },
        },
      });
      return { id: user.id, status: "APPROVED" };
    });

    res.json({ status: "success", message: "Suspension lifted. The user must sign in again. Public listing stays off until you enable it.", account: result });
  } catch (error: any) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({ status: "error", message: error.message, code: error.code });
      return;
    }
    console.error("Failed to unsuspend account:", error);
    res.status(500).json({ status: "error", message: "Failed to unsuspend account" });
  }
});
