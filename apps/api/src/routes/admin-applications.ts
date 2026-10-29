import { Router, type Request, type Response } from "express";
import type { ApplicationStatus } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { requirePlatformAdmin } from "./admin-accounts";
import { recordAdminIdentityRead } from "../lib/admin-audit";

export const adminApplicationsRouter = Router();

// Platform admins mediate hiring, so they see which doctor applied to which job and facility.
// Facilities never use this router; their view stays anonymous (see facility.ts).
adminApplicationsRouter.use(requirePlatformAdmin);

const APPLICATION_STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "HIRE_REQUESTED",
  "HIRED",
  "NOT_SELECTED",
  "WITHDRAWN",
];

// ---------------------------------------------------------------------------
// GET /api/admin/applications
// Every doctor application with job, facility (incl. recruitment contact captured at registration),
// and the latest hire-request / identity-release state.
// Query: status, search, jobId, facilityId, page, limit
// ---------------------------------------------------------------------------
adminApplicationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { status, search, jobId, facilityId } = req.query;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));

    const base: any = {};
    if (jobId) base.jobId = String(jobId);
    if (facilityId) base.job = { facilityId: String(facilityId) };
    if (search && String(search).trim()) {
      const q = String(search).trim();
      base.OR = [
        { candidateCode: { contains: q, mode: "insensitive" } },
        { doctor: { fullName: { contains: q, mode: "insensitive" } } },
        { doctor: { user: { email: { contains: q, mode: "insensitive" } } } },
        { doctor: { user: { mobileE164: { contains: q } } } },
        { job: { title: { contains: q, mode: "insensitive" } } },
        { job: { facility: { name: { contains: q, mode: "insensitive" } } } },
      ];
    }
    const where: any = { ...base };
    if (status && APPLICATION_STATUSES.includes(String(status) as ApplicationStatus)) {
      where.status = String(status);
    }

    const [applications, total, grouped, totalAll] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          anonymousSpecialty: { select: { nameEn: true } },
          doctor: {
            select: {
              id: true,
              fullName: true,
              user: { select: { id: true, email: true, mobileE164: true, status: true } },
            },
          },
          job: {
            select: {
              id: true,
              referenceNumber: true,
              title: true,
              status: true,
              facility: {
                select: {
                  id: true,
                  name: true,
                  hospitalEmail: true,
                  officerName: true,
                  officerPhoneCountryCode: true,
                  officerPhone: true,
                  user: { select: { id: true, email: true, status: true } },
                },
              },
            },
          },
          hireRequestItems: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              hireRequest: { select: { id: true, status: true, submittedAt: true } },
              identityRelease: { select: { id: true, status: true, doctorConsentStatus: true } },
            },
          },
        },
      }),
      prisma.application.count({ where }),
      prisma.application.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
      prisma.application.count({ where: base }),
    ]);

    const counts: Record<string, number> = { ALL: totalAll };
    for (const s of APPLICATION_STATUSES) counts[s] = 0;
    for (const g of grouped) counts[g.status] = g._count._all;

    await recordAdminIdentityRead({
      actorId: (req as any).adminUser.id,
      entityType: "Application",
      entityIds: applications.map((a) => a.id),
      context: "GET /api/admin/applications",
    });

    res.json({
      status: "success",
      items: applications.map((a) => {
        const item = a.hireRequestItems[0];
        const facility = a.job.facility;
        return {
          id: a.id,
          candidateCode: a.candidateCode,
          status: a.status,
          submittedAt: a.submittedAt,
          // What the facility sees (anonymous profile)
          anonymous: {
            jobTitle: a.anonymousJobTitle,
            specialty: a.anonymousSpecialty.nameEn,
            yearsOfExperience: a.anonymousYearsOfExperience,
          },
          doctor: {
            id: a.doctor.id,
            accountId: a.doctor.user.id,
            fullName: a.doctor.fullName,
            email: a.doctor.user.email,
            mobileE164: a.doctor.user.mobileE164,
            accountStatus: a.doctor.user.status,
          },
          job: {
            id: a.job.id,
            ref: `JO${String(a.job.referenceNumber).padStart(10, "0")}`,
            title: a.job.title,
            status: a.job.status,
          },
          facility: {
            id: facility.id,
            accountId: facility.user.id,
            name: facility.name,
            accountStatus: facility.user.status,
            hospitalEmail: facility.hospitalEmail,
            // Recruitment officer as captured at registration; the officer email is the facility login email
            recruitmentContact: {
              name: facility.officerName,
              email: facility.user.email,
              phone: [facility.officerPhoneCountryCode, facility.officerPhone].filter(Boolean).join(" ") || null,
            },
          },
          hireRequest: item
            ? {
                itemId: item.id,
                itemStatus: item.status,
                requestId: item.hireRequest.id,
                requestStatus: item.hireRequest.status,
                requestedAt: item.hireRequest.submittedAt,
                identityReleaseStatus: item.identityRelease?.status ?? null,
                doctorConsentStatus: item.identityRelease?.doctorConsentStatus ?? null,
              }
            : null,
        };
      }),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), counts },
    });
  } catch (error) {
    console.error("Admin applications list error:", error);
    res.status(500).json({ status: "error", message: "Failed to load applications." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/applications/:id
// One application with its full hiring trail, status history (audit log), and the next valid admin action.
// ---------------------------------------------------------------------------
adminApplicationsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const application = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: {
        anonymousSpecialty: { select: { nameEn: true } },
        doctor: { select: { id: true, fullName: true, user: { select: { id: true, email: true, mobileE164: true, status: true } } } },
        job: {
          select: {
            id: true,
            referenceNumber: true,
            title: true,
            status: true,
            facility: {
              select: {
                id: true,
                name: true,
                hospitalEmail: true,
                officerName: true,
                officerPhoneCountryCode: true,
                officerPhone: true,
                user: { select: { id: true, email: true, status: true } },
              },
            },
          },
        },
        hireRequestItems: {
          orderBy: { createdAt: "desc" },
          include: {
            hireRequest: { select: { id: true, status: true, submittedAt: true, closedAt: true, facilityNote: true } },
            identityRelease: {
              include: {
                decidedBy: { select: { displayName: true, email: true } },
                conversation: { select: { id: true, status: true, createdAt: true, _count: { select: { messages: true } } } },
              },
            },
          },
        },
      },
    });
    if (!application) {
      res.status(404).json({ status: "error", message: "Application not found.", code: "NOT_FOUND" });
      return;
    }

    const relatedIds = [
      application.id,
      ...application.hireRequestItems.flatMap((it) => [it.id, it.hireRequestId, it.identityRelease?.id ?? ""]),
    ].filter(Boolean);
    const history = await prisma.auditLog.findMany({
      where: { entityId: { in: relatedIds }, action: { not: "ADMIN_VIEWED_DOCTOR_IDENTITY" } },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: { displayName: true, email: true, role: true } } },
    });

    const latest = application.hireRequestItems[0];
    const release = latest?.identityRelease;
    const canCompletePlacement =
      !!latest &&
      latest.status === "AGREED" &&
      release?.status === "APPROVED" &&
      release.doctorConsentStatus === "GRANTED" &&
      !!release.conversation;
    let nextAction = "No action available.";
    if (canCompletePlacement) nextAction = "Confirm the doctor and facility have connected, then mark the placement completed.";
    else if (!latest && (application.status === "SUBMITTED" || application.status === "UNDER_REVIEW"))
      nextAction = "Waiting for the facility to request to hire this candidate.";
    else if (latest?.status === "HIRED") nextAction = "Placement completed.";
    else if (release?.status === "PENDING" && release.doctorConsentStatus === "PENDING")
      nextAction = "Waiting for the doctor to grant or decline consent.";
    else if (release?.status === "PENDING" && release.doctorConsentStatus === "GRANTED")
      nextAction = "Approve or reject the identity release in Hire Requests.";

    const facility = application.job.facility;
    await recordAdminIdentityRead({
      actorId: adminUser.id,
      entityType: "Application",
      entityIds: [application.id],
      context: "GET /api/admin/applications/:id",
    });

    res.json({
      status: "success",
      application: {
        id: application.id,
        candidateCode: application.candidateCode,
        status: application.status,
        submittedAt: application.submittedAt,
        anonymous: {
          jobTitle: application.anonymousJobTitle,
          specialty: application.anonymousSpecialty.nameEn,
          yearsOfExperience: application.anonymousYearsOfExperience,
        },
        doctor: {
          id: application.doctor.id,
          accountId: application.doctor.user.id,
          fullName: application.doctor.fullName,
          email: application.doctor.user.email,
          mobileE164: application.doctor.user.mobileE164,
          accountStatus: application.doctor.user.status,
        },
        job: {
          id: application.job.id,
          ref: `JO${String(application.job.referenceNumber).padStart(10, "0")}`,
          title: application.job.title,
          status: application.job.status,
        },
        facility: {
          id: facility.id,
          accountId: facility.user.id,
          name: facility.name,
          accountStatus: facility.user.status,
          hospitalEmail: facility.hospitalEmail,
          recruitmentContact: {
            name: facility.officerName,
            email: facility.user.email,
            phone: [facility.officerPhoneCountryCode, facility.officerPhone].filter(Boolean).join(" ") || null,
          },
        },
        hireRequests: application.hireRequestItems.map((it) => ({
          itemId: it.id,
          itemStatus: it.status,
          itemClosedAt: it.closedAt,
          requestId: it.hireRequest.id,
          requestStatus: it.hireRequest.status,
          requestedAt: it.hireRequest.submittedAt,
          requestClosedAt: it.hireRequest.closedAt,
          facilityNote: it.hireRequest.facilityNote,
          identityRelease: it.identityRelease
            ? {
                id: it.identityRelease.id,
                status: it.identityRelease.status,
                doctorConsentStatus: it.identityRelease.doctorConsentStatus,
                doctorConsentAt: it.identityRelease.doctorConsentAt,
                decidedAt: it.identityRelease.decidedAt,
                decidedBy: it.identityRelease.decidedBy?.displayName ?? it.identityRelease.decidedBy?.email ?? null,
                decisionNote: it.identityRelease.decisionNote,
                revokedAt: it.identityRelease.revokedAt,
                conversation: it.identityRelease.conversation
                  ? {
                      id: it.identityRelease.conversation.id,
                      status: it.identityRelease.conversation.status,
                      createdAt: it.identityRelease.conversation.createdAt,
                      messageCount: it.identityRelease.conversation._count.messages,
                    }
                  : null,
              }
            : null,
        })),
        canCompletePlacement,
        nextAction,
        history: history.map((h) => {
          const meta = (h.metadata as Record<string, unknown> | null) ?? {};
          const note = meta.note ?? meta.decisionNote ?? meta.reason ?? null;
          return {
            id: h.id,
            action: h.action,
            entityType: h.entityType,
            actor: h.actor?.displayName ?? h.actor?.email ?? "System",
            actorRole: h.actor?.role ?? null,
            note: typeof note === "string" ? note : null,
            createdAt: h.createdAt,
          };
        }),
      },
    });
  } catch (error) {
    console.error("Admin application detail error:", error);
    res.status(500).json({ status: "error", message: "Failed to load application." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/applications/:id/complete-placement   body: { note?: string }
// Marks the placement completed once the doctor and facility have been connected. Requires the latest
// hire request item AGREED, the identity release APPROVED with consent GRANTED, and the group chat created.
// item -> HIRED (closed), application -> HIRED, hire request -> COMPLETED once all of its items are final.
// The conversation and its history are kept unchanged.
// ---------------------------------------------------------------------------
class PlacementConflict extends Error {}
const FINAL_ITEM_STATUSES = ["HIRED", "REJECTED", "WITHDRAWN", "CANCELLED"] as const;

adminApplicationsRouter.post("/:id/complete-placement", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const rawNote = req.body?.note;
    const note = typeof rawNote === "string" && rawNote.trim() ? rawNote.trim().slice(0, 1000) : null;

    const application = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: {
        doctor: { select: { userId: true } },
        job: { select: { title: true, facility: { select: { id: true, userId: true } } } },
        hireRequestItems: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { identityRelease: { include: { conversation: { select: { id: true } } } } },
        },
      },
    });
    if (!application) {
      res.status(404).json({ status: "error", message: "Application not found.", code: "NOT_FOUND" });
      return;
    }
    const item = application.hireRequestItems[0];
    const release = item?.identityRelease;
    const conversationId = release?.conversation?.id;
    if (!item || item.status !== "AGREED" || release?.status !== "APPROVED" || release.doctorConsentStatus !== "GRANTED" || !conversationId) {
      res.status(409).json({
        status: "error",
        code: "PLACEMENT_NOT_READY",
        message:
          "A placement can be completed only after the hire request is agreed, the identity release is approved with the doctor's consent, and the group chat exists.",
      });
      return;
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.hireRequestItem.updateMany({
        where: { id: item.id, status: "AGREED" },
        data: { status: "HIRED", decidedAt: now, closedAt: now },
      });
      if (claimed.count === 0) throw new PlacementConflict("This placement was already updated by another administrator.");

      await tx.application.update({ where: { id: application.id }, data: { status: "HIRED" } });

      const openItems = await tx.hireRequestItem.count({
        where: { hireRequestId: item.hireRequestId, status: { notIn: [...FINAL_ITEM_STATUSES] } },
      });
      const requestCompleted = openItems === 0;
      if (requestCompleted) {
        await tx.hireRequest.update({ where: { id: item.hireRequestId }, data: { status: "COMPLETED", closedAt: now } });
      }

      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "PLACEMENT_COMPLETED",
          entityType: "HireRequestItem",
          entityId: item.id,
          metadata: {
            applicationId: application.id,
            hireRequestId: item.hireRequestId,
            identityReleaseId: release.id,
            conversationId,
            hireRequestCompleted: requestCompleted,
            note,
          },
        },
      });

      await tx.notification.createMany({
        data: [
          {
            userId: application.doctor.userId,
            type: "HIRE_REQUEST_UPDATE",
            data: {
              title: "Placement completed",
              body: `Your placement for ${application.job.title} has been marked completed by the platform.`,
              applicationId: application.id,
            },
          },
          {
            userId: application.job.facility.userId,
            type: "HIRE_REQUEST_UPDATE",
            data: {
              title: "Placement completed",
              body: `Candidate ${application.candidateCode} placement for ${application.job.title} has been marked completed.`,
              applicationId: application.id,
            },
          },
        ],
      });
      return { requestCompleted };
    });

    res.json({
      status: "success",
      message: result.requestCompleted
        ? "Placement completed. Every candidate on this hire request is now final, so the hire request is completed."
        : "Placement completed.",
      hireRequestCompleted: result.requestCompleted,
    });
  } catch (error) {
    if (error instanceof PlacementConflict) {
      res.status(409).json({ status: "error", code: "PLACEMENT_CONFLICT", message: error.message });
      return;
    }
    console.error("Admin complete placement error:", error);
    res.status(500).json({ status: "error", message: "Failed to complete placement." });
  }
});
