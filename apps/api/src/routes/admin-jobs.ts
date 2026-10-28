import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { requirePlatformAdmin } from "./admin-accounts";

export const adminJobsRouter = Router();

adminJobsRouter.use(requirePlatformAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/jobs
// List submitted job requisitions with status filters, search, and counts
// ---------------------------------------------------------------------------
adminJobsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const statusQuery = (req.query.status as string) || "ALL";
    const search = ((req.query.search as string) || "").trim();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string, 10) || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (statusQuery !== "ALL") {
      where.status = statusQuery;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { facility: { name: { contains: search, mode: "insensitive" } } },
        { facility: { officerName: { contains: search, mode: "insensitive" } } },
        { facility: { hospitalEmail: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [jobs, total, pendingCount, publishedCount, rejectedCount, allCount] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: [{ status: "asc" }, { submittedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          specialty: { select: { id: true, nameEn: true, nameAr: true, slug: true } },
          country: { select: { id: true, nameEn: true, nameAr: true, isoCode: true } },
          city: { select: { id: true, nameEn: true, nameAr: true } },
          employmentType: { select: { id: true, code: true, nameEn: true, nameAr: true } },
          salaryCurrency: { select: { code: true, symbol: true } },
          salaryPeriod: { select: { code: true, nameEn: true } },
          reviewedBy: { select: { id: true, displayName: true, email: true } },
          facility: {
            select: {
              id: true,
              name: true,
              type: true,
              hospitalEmail: true,
              officerName: true,
              officerPhoneCountryCode: true,
              officerPhone: true,
              logo: { select: { id: true } },
              user: { select: { id: true, email: true, status: true } },
            },
          },
          _count: { select: { applications: true } },
        },
      }),
      prisma.job.count({ where }),
      prisma.job.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.job.count({ where: { status: "PUBLISHED" } }),
      prisma.job.count({ where: { status: "REJECTED" } }),
      prisma.job.count(),
    ]);

    res.json({
      status: "success",
      jobs: jobs.map((j) => ({
        id: j.id,
        referenceNumber: `JO${String(j.referenceNumber).padStart(10, "0")}`,
        rawReferenceNumber: j.referenceNumber,
        title: j.title,
        status: j.status,
        specialty: j.specialty.nameEn,
        location: `${j.city.nameEn}, ${j.country.nameEn}`,
        employmentType: j.employmentType.nameEn,
        positions: j.positions,
        minYearsExperience: j.minYearsExperience,
        salary:
          j.salaryMin && j.salaryMax
            ? `${j.salaryCurrency?.code ?? "SAR"} ${Number(j.salaryMin).toLocaleString()}–${Number(j.salaryMax).toLocaleString()}/${j.salaryPeriod?.nameEn ?? "mo"}`
            : null,
        isUrgent: j.isUrgent,
        submittedAt: j.submittedAt,
        reviewedAt: j.reviewedAt,
        publishedAt: j.publishedAt,
        reviewNote: j.reviewNote,
        reviewerName: j.reviewedBy?.displayName ?? j.reviewedBy?.email ?? null,
        applicationsCount: j._count.applications,
        facility: {
          id: j.facility.id,
          name: j.facility.name,
          type: j.facility.type,
          accountStatus: j.facility.user.status,
          loginEmail: j.facility.user.email,
          hospitalEmail: j.facility.hospitalEmail,
          officerName: j.facility.officerName,
          officerPhone: `${j.facility.officerPhoneCountryCode ?? ""} ${j.facility.officerPhone ?? ""}`.trim(),
          logoUrl: j.facility.logo ? `/api/files/${j.facility.logo.id}/download` : null,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      meta: {
        counts: {
          all: allCount,
          pendingReview: pendingCount,
          published: publishedCount,
          rejected: rejectedCount,
        },
      },
    });
  } catch (error) {
    console.error("Admin list jobs error:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve job submissions queue." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/jobs/:id
// Get full job details with associated facility and recruitment officer details
// ---------------------------------------------------------------------------
adminJobsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        specialty: true,
        country: true,
        city: true,
        employmentType: true,
        salaryCurrency: true,
        salaryPeriod: true,
        reviewedBy: { select: { id: true, displayName: true, email: true } },
        facility: {
          include: {
            country: true,
            city: true,
            logo: true,
            user: { select: { id: true, email: true, mobileE164: true, status: true, createdAt: true } },
          },
        },
        _count: { select: { applications: true, hireRequests: true } },
      },
    });

    if (!job) {
      res.status(404).json({ status: "error", message: "Job submission not found." });
      return;
    }

    res.json({
      status: "success",
      job: {
        id: job.id,
        referenceNumber: `JO${String(job.referenceNumber).padStart(10, "0")}`,
        rawReferenceNumber: job.referenceNumber,
        title: job.title,
        status: job.status,
        aboutHospital: job.aboutHospital,
        description: job.description,
        responsibilities: job.responsibilities,
        requirements: job.requirements,
        benefits: job.benefits,
        positions: job.positions,
        minYearsExperience: job.minYearsExperience,
        salaryMin: job.salaryMin?.toString() ?? null,
        salaryMax: job.salaryMax?.toString() ?? null,
        salaryCurrencyCode: job.salaryCurrencyCode,
        salaryPeriodName: job.salaryPeriod?.nameEn ?? "Month",
        isUrgent: job.isUrgent,
        specialty: {
          id: job.specialty.id,
          nameEn: job.specialty.nameEn,
          nameAr: job.specialty.nameAr,
        },
        location: {
          countryId: job.countryId,
          countryName: job.country.nameEn,
          cityId: job.cityId,
          cityName: job.city.nameEn,
        },
        employmentType: {
          id: job.employmentType.id,
          code: job.employmentType.code,
          nameEn: job.employmentType.nameEn,
        },
        submittedAt: job.submittedAt,
        reviewedAt: job.reviewedAt,
        publishedAt: job.publishedAt,
        reviewNote: job.reviewNote,
        reviewer: job.reviewedBy
          ? {
              id: job.reviewedBy.id,
              name: job.reviewedBy.displayName || job.reviewedBy.email,
              email: job.reviewedBy.email,
            }
          : null,
        stats: {
          applicationsCount: job._count.applications,
          hireRequestsCount: job._count.hireRequests,
        },
        // Facility & Recruitment Officer Information (visible to platform admins)
        facility: {
          id: job.facility.id,
          name: job.facility.name,
          type: job.facility.type,
          description: job.facility.description,
          address: job.facility.address,
          locationUrl: job.facility.locationUrl,
          employeeCount: job.facility.employeeCount,
          countryName: job.facility.country?.nameEn ?? null,
          cityName: job.facility.city?.nameEn ?? null,
          logoUrl: job.facility.logo ? `/api/files/${job.facility.logo.id}/download` : null,
          accountStatus: job.facility.user.status,
          userCreatedAt: job.facility.user.createdAt,
          recruitmentOfficer: {
            name: job.facility.officerName,
            loginEmail: job.facility.user.email,
            hospitalEmail: job.facility.hospitalEmail,
            phoneCountryCode: job.facility.officerPhoneCountryCode,
            phone: job.facility.officerPhone,
            fullPhone: `${job.facility.officerPhoneCountryCode ?? ""} ${job.facility.officerPhone ?? ""}`.trim(),
          },
        },
      },
    });
  } catch (error) {
    console.error("Admin get job detail error:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve job details." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/jobs/:id/approve
// Atomically approve and publish the job requisition
// ---------------------------------------------------------------------------
adminJobsRouter.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const id = String(req.params.id);

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: {
        facility: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    if (!existingJob) {
      res.status(404).json({ status: "error", message: "Job submission not found." });
      return;
    }

    if (existingJob.status === "PUBLISHED") {
      res.status(400).json({ status: "error", message: "Job is already published." });
      return;
    }

    const now = new Date();

    const updatedJob = await prisma.$transaction(async (tx) => {
      const job = await tx.job.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: now,
          reviewedAt: now,
          reviewedById: adminUser.id,
          reviewNote: null,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "JOB_PUBLISHED",
          entityType: "Job",
          entityId: job.id,
          metadata: {
            jobTitle: job.title,
            referenceNumber: job.referenceNumber,
            facilityId: job.facilityId,
            facilityName: existingJob.facility.name,
            decidedBy: adminUser.email,
          },
        },
      });

      // Notification to facility user
      await tx.notification.create({
        data: {
          userId: existingJob.facility.userId,
          type: "JOB_REVIEW",
          data: {
            title: "Job Requisition Approved & Published",
            body: `Your job posting for '${job.title}' (REF: JO${String(job.referenceNumber).padStart(10, "0")}) has been approved and published to the directory.`,
            jobId: job.id,
            status: "PUBLISHED",
          },
        },
      });

      return job;
    });

    res.json({
      status: "success",
      message: `Job requisition '${updatedJob.title}' has been successfully approved and published.`,
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        publishedAt: updatedJob.publishedAt,
        reviewedAt: updatedJob.reviewedAt,
      },
    });
  } catch (error) {
    console.error("Admin approve job error:", error);
    res.status(500).json({ status: "error", message: "Failed to approve job requisition." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/jobs/:id/reject
// Atomically reject the job requisition with mandatory rejection feedback
// ---------------------------------------------------------------------------
adminJobsRouter.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const id = String(req.params.id);
    const { reason } = req.body ?? {};

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      res.status(400).json({
        status: "error",
        message: "A clear rejection reason must be provided to advise the healthcare facility.",
      });
      return;
    }

    const rejectionReason = reason.trim();

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: {
        facility: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    if (!existingJob) {
      res.status(404).json({ status: "error", message: "Job submission not found." });
      return;
    }

    const now = new Date();

    const updatedJob = await prisma.$transaction(async (tx) => {
      const job = await tx.job.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedAt: now,
          reviewedById: adminUser.id,
          reviewNote: rejectionReason,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "JOB_REJECTED",
          entityType: "Job",
          entityId: job.id,
          metadata: {
            jobTitle: job.title,
            referenceNumber: job.referenceNumber,
            facilityId: job.facilityId,
            facilityName: existingJob.facility.name,
            reason: rejectionReason,
            decidedBy: adminUser.email,
          },
        },
      });

      // Notification to facility user
      await tx.notification.create({
        data: {
          userId: existingJob.facility.userId,
          type: "JOB_REVIEW",
          data: {
            title: "Job Requisition Review Feedback",
            body: `Your job posting for '${job.title}' was reviewed with feedback: "${rejectionReason}". Please review and submit revised details.`,
            jobId: job.id,
            status: "REJECTED",
            rejectionReason,
          },
        },
      });

      return job;
    });

    res.json({
      status: "success",
      message: `Job requisition '${updatedJob.title}' was rejected. Feedback recorded and facility notified.`,
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        reviewNote: updatedJob.reviewNote,
        reviewedAt: updatedJob.reviewedAt,
      },
    });
  } catch (error) {
    console.error("Admin reject job error:", error);
    res.status(500).json({ status: "error", message: "Failed to reject job requisition." });
  }
});
