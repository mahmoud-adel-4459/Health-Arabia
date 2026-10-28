import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { getAuthenticatedUser } from "./auth";

export const adminHireRequestsRouter = Router();

// Middleware: Require PLATFORM_ADMIN role
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Authentication required.", code: "UNAUTHENTICATED" });
      return;
    }
    if (user.role !== "PLATFORM_ADMIN") {
      res.status(403).json({ status: "error", message: "Access restricted to platform administrators.", code: "FORBIDDEN" });
      return;
    }
    (req as any).adminUser = user;
    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.status(500).json({ status: "error", message: "Internal authentication error." });
  }
}

adminHireRequestsRouter.use(requireAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/hire-requests
// List hire requests with items, consent status, and release status
// ---------------------------------------------------------------------------
adminHireRequestsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { status, search, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = String(status);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { job: { title: { contains: q, mode: "insensitive" } } },
        { facility: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [hireRequests, totalCount, pendingCount, inCoordinationCount, completedCount, cancelledCount] =
      await Promise.all([
        prisma.hireRequest.findMany({
          where,
          include: {
            facility: {
              select: { id: true, name: true, officerName: true, user: { select: { email: true, status: true } } },
            },
            job: {
              select: {
                id: true,
                title: true,
                referenceNumber: true,
                city: { select: { nameEn: true } },
                country: { select: { nameEn: true } },
              },
            },
            items: {
              include: {
                application: {
                  select: {
                    id: true,
                    candidateCode: true,
                    anonymousJobTitle: true,
                    anonymousYearsOfExperience: true,
                    status: true,
                  },
                },
                identityRelease: {
                  select: {
                    id: true,
                    status: true,
                    doctorConsentStatus: true,
                    doctorConsentAt: true,
                    decidedAt: true,
                    revokedAt: true,
                    revocationReason: true,
                    conversation: { select: { id: true, status: true } },
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: "desc" },
          skip,
          take: limitNum,
        }),
        prisma.hireRequest.count({ where }),
        prisma.hireRequest.count({ where: { status: "SUBMITTED" } }),
        prisma.hireRequest.count({ where: { status: "IN_COORDINATION" } }),
        prisma.hireRequest.count({ where: { status: "COMPLETED" } }),
        prisma.hireRequest.count({ where: { status: "CANCELLED" } }),
      ]);

    res.json({
      status: "success",
      hireRequests: hireRequests.map((hr) => ({
        id: hr.id,
        facility: {
          id: hr.facility.id,
          name: hr.facility.name,
          officerName: hr.facility.officerName,
          email: hr.facility.user.email,
          status: hr.facility.user.status,
        },
        job: {
          id: hr.job.id,
          ref: `JO${String(hr.job.referenceNumber).padStart(10, "0")}`,
          title: hr.job.title,
          location: `${hr.job.city.nameEn}, ${hr.job.country.nameEn}`,
        },
        status: hr.status,
        facilityNote: hr.facilityNote,
        submittedAt: hr.submittedAt,
        itemsCount: hr.items.length,
        items: hr.items.map((it) => ({
          id: it.id,
          applicationId: it.applicationId,
          candidateCode: it.application.candidateCode,
          jobTitle: it.application.anonymousJobTitle,
          status: it.status,
          identityRelease: it.identityRelease
            ? {
                id: it.identityRelease.id,
                status: it.identityRelease.status,
                doctorConsentStatus: it.identityRelease.doctorConsentStatus,
                doctorConsentAt: it.identityRelease.doctorConsentAt,
                decidedAt: it.identityRelease.decidedAt,
                revokedAt: it.identityRelease.revokedAt,
                conversationId: it.identityRelease.conversation?.id || null,
                conversationStatus: it.identityRelease.conversation?.status || null,
              }
            : null,
        })),
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        counts: {
          submitted: pendingCount,
          inCoordination: inCoordinationCount,
          completed: completedCount,
          cancelled: cancelledCount,
        },
      },
    });
  } catch (error) {
    console.error("Admin list hire requests error:", error);
    res.status(500).json({ status: "error", message: "Failed to load hire requests." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/hire-requests/:id
// Get full detail of hire request
// ---------------------------------------------------------------------------
adminHireRequestsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const hireRequest = await prisma.hireRequest.findUnique({
      where: { id },
      include: {
        facility: {
          include: {
            country: true,
            city: true,
            user: { select: { id: true, email: true, status: true, createdAt: true } },
          },
        },
        job: {
          include: {
            specialty: true,
            city: true,
            country: true,
          },
        },
        coordinator: { select: { id: true, displayName: true, email: true } },
        items: {
          include: {
            application: {
              include: {
                anonymousSpecialty: true,
                doctor: {
                  include: {
                    user: { select: { id: true, email: true, mobileE164: true, status: true } },
                    primarySpecialty: true,
                    nationality: true,
                    residenceCountry: true,
                  },
                },
                submission: true,
              },
            },
            identityRelease: {
              include: {
                decidedBy: { select: { id: true, displayName: true, email: true } },
                conversation: {
                  include: {
                    participants: {
                      include: {
                        user: { select: { id: true, displayName: true, role: true } },
                      },
                    },
                    messages: {
                      orderBy: { createdAt: "desc" },
                      take: 5,
                      include: {
                        sender: { select: { id: true, displayName: true, role: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!hireRequest) {
      res.status(404).json({ status: "error", message: "Hire request not found." });
      return;
    }

    res.json({
      status: "success",
      hireRequest: {
        id: hireRequest.id,
        status: hireRequest.status,
        facilityNote: hireRequest.facilityNote,
        submittedAt: hireRequest.submittedAt,
        closedAt: hireRequest.closedAt,
        facility: {
          id: hireRequest.facility.id,
          name: hireRequest.facility.name,
          type: hireRequest.facility.type,
          officerName: hireRequest.facility.officerName,
          email: hireRequest.facility.user.email,
          phone: `${hireRequest.facility.officerPhoneCountryCode ?? ""} ${hireRequest.facility.officerPhone ?? ""}`.trim(),
          accountStatus: hireRequest.facility.user.status,
          country: hireRequest.facility.country?.nameEn,
          city: hireRequest.facility.city?.nameEn,
        },
        job: {
          id: hireRequest.job.id,
          ref: `JO${String(hireRequest.job.referenceNumber).padStart(10, "0")}`,
          title: hireRequest.job.title,
          specialty: hireRequest.job.specialty.nameEn,
          location: `${hireRequest.job.city.nameEn}, ${hireRequest.job.country.nameEn}`,
        },
        coordinator: hireRequest.coordinator
          ? { id: hireRequest.coordinator.id, name: hireRequest.coordinator.displayName || hireRequest.coordinator.email }
          : null,
        items: hireRequest.items.map((it) => {
          const release = it.identityRelease;
          const app = it.application;
          const doctor = app.doctor;

          return {
            id: it.id,
            status: it.status,
            createdAt: it.createdAt,
            closedAt: it.closedAt,
            application: {
              id: app.id,
              candidateCode: app.candidateCode,
              anonymousJobTitle: app.anonymousJobTitle,
              specialty: app.anonymousSpecialty.nameEn,
              yearsOfExperience: app.anonymousYearsOfExperience,
              status: app.status,
              doctor: {
                id: doctor.id,
                userId: doctor.userId,
                fullName: doctor.fullName,
                email: doctor.user.email,
                phone: doctor.user.mobileE164,
                status: doctor.user.status,
                nationality: doctor.nationality?.nameEn,
              },
            },
            identityRelease: release
              ? {
                  id: release.id,
                  status: release.status,
                  doctorConsentStatus: release.doctorConsentStatus,
                  doctorConsentAt: release.doctorConsentAt,
                  doctorConsentRevokedAt: release.doctorConsentRevokedAt,
                  decidedAt: release.decidedAt,
                  decisionNote: release.decisionNote,
                  decidedBy: release.decidedBy
                    ? { id: release.decidedBy.id, name: release.decidedBy.displayName || release.decidedBy.email }
                    : null,
                  revokedAt: release.revokedAt,
                  revocationReason: release.revocationReason,
                  conversation: release.conversation
                    ? {
                        id: release.conversation.id,
                        status: release.conversation.status,
                        readOnlyAt: release.conversation.readOnlyAt,
                        participants: release.conversation.participants.map((p) => ({
                          userId: p.userId,
                          role: p.role,
                          name: p.user.displayName || p.role,
                        })),
                        recentMessagesCount: release.conversation.messages.length,
                      }
                    : null,
                }
              : null,
          };
        }),
      },
    });
  } catch (error) {
    console.error("Admin get hire request error:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve hire request details." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/hire-requests/releases/:id/approve
// Approves identity release and initializes 3-party conversation
// STRICT RULE: Doctor consent MUST be GRANTED before identity release approval.
// ---------------------------------------------------------------------------
adminHireRequestsRouter.post("/releases/:id/approve", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const releaseId = String(req.params.id);
    const { decisionNote } = req.body || {};

    const release = await prisma.identityRelease.findUnique({
      where: { id: releaseId },
      include: {
        hireRequestItem: {
          include: {
            application: {
              include: {
                doctor: { select: { id: true, userId: true, fullName: true } },
              },
            },
            hireRequest: {
              include: {
                job: { select: { id: true, title: true } },
                facility: { select: { id: true, userId: true, name: true, user: { select: { status: true } } } },
              },
            },
          },
        },
      },
    });

    if (!release) {
      res.status(404).json({ status: "error", message: "Identity release record not found." });
      return;
    }

    if (release.status === "APPROVED") {
      res.status(400).json({ status: "error", message: "Identity release has already been approved." });
      return;
    }

    if (release.status === "REVOKED") {
      res.status(400).json({ status: "error", message: "Cannot approve a revoked identity release." });
      return;
    }

    // STRICT CONSENT RULE: Doctor consent MUST be GRANTED
    if (release.doctorConsentStatus !== "GRANTED") {
      res.status(400).json({
        status: "error",
        code: "DOCTOR_CONSENT_REQUIRED",
        message: "Identity release cannot be approved until candidate doctor explicitly grants consent. Current consent status: " + release.doctorConsentStatus,
      });
      return;
    }

    const facility = release.hireRequestItem.hireRequest.facility;
    if (facility.user.status !== "APPROVED") {
      res.status(400).json({
        status: "error",
        code: "FACILITY_NOT_APPROVED",
        message: "Requesting facility account is not approved by the platform.",
      });
      return;
    }

    const doctorUserId = release.hireRequestItem.application.doctor.userId;
    const facilityUserId = facility.userId;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update IdentityRelease
      const updatedRelease = await tx.identityRelease.update({
        where: { id: release.id },
        data: {
          status: "APPROVED",
          decidedById: adminUser.id,
          decidedAt: now,
          decisionNote: decisionNote ? String(decisionNote).trim() : null,
        },
      });

      // 2. Update HireRequestItem status to AGREED and HireRequest status to IN_COORDINATION
      await tx.hireRequestItem.update({
        where: { id: release.hireRequestItemId },
        data: { status: "AGREED" },
      });

      await tx.hireRequest.update({
        where: { id: release.hireRequestItem.hireRequestId },
        data: { status: "IN_COORDINATION", coordinatorId: adminUser.id },
      });

      // 3. Create 3-party Conversation
      const conversation = await tx.conversation.create({
        data: {
          identityReleaseId: release.id,
          status: "ACTIVE",
        },
      });

      // 4. Create ConversationParticipants
      await tx.conversationParticipant.createMany({
        data: [
          {
            conversationId: conversation.id,
            userId: doctorUserId,
            role: "DOCTOR",
            joinedAt: now,
          },
          {
            conversationId: conversation.id,
            userId: facilityUserId,
            role: "FACILITY",
            joinedAt: now,
          },
          {
            conversationId: conversation.id,
            userId: adminUser.id,
            role: "PLATFORM",
            joinedAt: now,
          },
        ],
      });

      // 5. Create initial Welcome Message in Conversation
      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: adminUser.id,
          body: `Welcome to the coordination chat for '${release.hireRequestItem.hireRequest.job.title}'. Doctor consent and platform approval are complete. You may now communicate directly regarding interview arrangements and credentialing.`,
        },
      });

      // 6. Notify Doctor and Facility
      await tx.notification.createMany({
        data: [
          {
            userId: doctorUserId,
            type: "IDENTITY_RELEASE",
            data: {
              title: "Identity Release Approved",
              body: `Platform administrators approved identity release to ${facility.name}. A direct 3-party conversation has been created.`,
              conversationId: conversation.id,
            },
          },
          {
            userId: facilityUserId,
            type: "IDENTITY_RELEASE",
            data: {
              title: "Candidate Identity Released",
              body: `Identity release approved for Candidate ${release.hireRequestItem.application.candidateCode} (${release.hireRequestItem.application.doctor.fullName}). Doctor profile and CV are now available.`,
              applicationId: release.hireRequestItem.applicationId,
              conversationId: conversation.id,
            },
          },
        ],
      });

      // 7. Audit log entry
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "IDENTITY_RELEASE_APPROVED",
          entityType: "IdentityRelease",
          entityId: release.id,
          metadata: {
            hireRequestItemId: release.hireRequestItemId,
            applicationId: release.hireRequestItem.applicationId,
            conversationId: conversation.id,
            facilityId: facility.id,
          },
        },
      });

      return { updatedRelease, conversationId: conversation.id };
    });

    res.json({
      status: "success",
      message: "Identity release approved successfully. 3-party conversation created.",
      identityReleaseId: result.updatedRelease.id,
      conversationId: result.conversationId,
    });
  } catch (error) {
    console.error("Admin approve identity release error:", error);
    res.status(500).json({ status: "error", message: "Failed to approve identity release." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/hire-requests/releases/:id/reject
// Platform rejects identity release
// ---------------------------------------------------------------------------
adminHireRequestsRouter.post("/releases/:id/reject", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const releaseId = String(req.params.id);
    const { decisionNote } = req.body || {};

    const release = await prisma.identityRelease.findUnique({
      where: { id: releaseId },
    });

    if (!release) {
      res.status(404).json({ status: "error", message: "Identity release record not found." });
      return;
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.identityRelease.update({
        where: { id: release.id },
        data: {
          status: "REJECTED",
          decidedById: adminUser.id,
          decidedAt: now,
          decisionNote: decisionNote ? String(decisionNote).trim() : "Platform rejected identity release.",
        },
      });

      await tx.hireRequestItem.update({
        where: { id: release.hireRequestItemId },
        data: {
          status: "REJECTED",
          closedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "IDENTITY_RELEASE_REJECTED",
          entityType: "IdentityRelease",
          entityId: release.id,
          metadata: { decisionNote },
        },
      });
    });

    res.json({
      status: "success",
      message: "Identity release rejected and hire request item closed.",
    });
  } catch (error) {
    console.error("Admin reject identity release error:", error);
    res.status(500).json({ status: "error", message: "Failed to reject identity release." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/hire-requests/releases/:id/revoke
// Platform administrator revokes previously approved identity release
// ---------------------------------------------------------------------------
adminHireRequestsRouter.post("/releases/:id/revoke", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const releaseId = String(req.params.id);
    const { reasonNote } = req.body || {};

    const release = await prisma.identityRelease.findUnique({
      where: { id: releaseId },
      include: { hireRequestItem: true },
    });

    if (!release) {
      res.status(404).json({ status: "error", message: "Identity release record not found." });
      return;
    }

    if (release.status === "REVOKED") {
      res.status(400).json({ status: "error", message: "Identity release is already revoked." });
      return;
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      // Trigger conversation_read_only_on_revocation will automatically set Conversation to READ_ONLY
      await tx.identityRelease.update({
        where: { id: release.id },
        data: {
          status: "REVOKED",
          revokedAt: now,
          revocationReason: "PLATFORM_DECISION",
          decisionNote: reasonNote ? String(reasonNote).trim() : release.decisionNote,
        },
      });

      if (!release.hireRequestItem.closedAt) {
        await tx.hireRequestItem.update({
          where: { id: release.hireRequestItemId },
          data: {
            status: "CANCELLED",
            closedAt: now,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "IDENTITY_RELEASE_REVOKED",
          entityType: "IdentityRelease",
          entityId: release.id,
          metadata: { reasonNote },
        },
      });
    });

    res.json({
      status: "success",
      message: "Identity release revoked. Associated conversation is now read-only.",
    });
  } catch (error) {
    console.error("Admin revoke identity release error:", error);
    res.status(500).json({ status: "error", message: "Failed to revoke identity release." });
  }
});
