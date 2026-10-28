import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { getAuthenticatedUser } from "./auth";

export const doctorRouter = Router();

// Middleware: Require DOCTOR role
export async function requireDoctor(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Authentication required.", code: "UNAUTHENTICATED" });
      return;
    }
    if (user.role !== "DOCTOR") {
      res.status(403).json({ status: "error", message: "Access restricted to medical professionals.", code: "FORBIDDEN" });
      return;
    }
    (req as any).doctorUser = user;
    next();
  } catch (error) {
    console.error("Doctor authorization guard error:", error);
    res.status(500).json({ status: "error", message: "Internal authentication error." });
  }
}

doctorRouter.use(requireDoctor);

// ---------------------------------------------------------------------------
// GET /api/doctor/dashboard
// Returns stats, active applications, recommended jobs, saved opportunities, notifications
// ---------------------------------------------------------------------------
doctorRouter.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
      include: {
        photo: { select: { id: true, originalName: true, storageKey: true } },
        primarySpecialty: true,
        applications: {
          include: {
            job: {
              include: {
                facility: { select: { name: true, slug: true } },
                city: { select: { nameEn: true, nameAr: true } },
                country: { select: { nameEn: true, nameAr: true } },
              },
            },
            hireRequestItems: {
              include: {
                identityRelease: {
                  include: {
                    conversation: { select: { id: true, status: true } },
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
        savedJobs: {
          include: {
            job: {
              include: {
                facility: { select: { name: true } },
                city: { select: { nameEn: true } },
                country: { select: { nameEn: true } },
                employmentType: { select: { nameEn: true } },
                salaryCurrency: { select: { code: true, symbol: true } },
                salaryPeriod: { select: { nameEn: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!doctorProfile) {
      res.status(404).json({ status: "error", message: "Doctor profile not found." });
      return;
    }

    // Recommended Opportunities: active published jobs matching doctor's specialty or general top jobs
    const recommendedJobs = await prisma.job.findMany({
      where: {
        status: "PUBLISHED",
        ...(doctorProfile.primarySpecialtyId ? { specialtyId: doctorProfile.primarySpecialtyId } : {}),
      },
      include: {
        facility: { select: { name: true } },
        city: { select: { nameEn: true } },
        country: { select: { nameEn: true } },
        employmentType: { select: { nameEn: true } },
        salaryCurrency: { select: { code: true, symbol: true } },
        salaryPeriod: { select: { nameEn: true } },
      },
      take: 4,
      orderBy: [{ isUrgent: "desc" }, { publishedAt: "desc" }],
    });

    // Fallback if no specific specialty match: take general published jobs
    const finalRecommended =
      recommendedJobs.length > 0
        ? recommendedJobs
        : await prisma.job.findMany({
            where: { status: "PUBLISHED" },
            include: {
              facility: { select: { name: true } },
              city: { select: { nameEn: true } },
              country: { select: { nameEn: true } },
              employmentType: { select: { nameEn: true } },
              salaryCurrency: { select: { code: true, symbol: true } },
              salaryPeriod: { select: { nameEn: true } },
            },
            take: 4,
            orderBy: [{ isUrgent: "desc" }, { publishedAt: "desc" }],
          });

    // Fetch user notifications from database or generate relevant activity
    const dbNotifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const notifications =
      dbNotifications.length > 0
        ? dbNotifications.map((n) => {
            const data = (n.data as any) || {};
            return {
              id: n.id,
              title: data.title || n.type.replace(/_/g, " "),
              body: data.body || "Notification update regarding your account.",
              createdAt: n.createdAt,
              readAt: n.readAt,
              type: n.type,
            };
          })
        : [
            {
              id: "notif-1",
              title: "New Internal Medicine opportunity matches your profile",
              body: "National Guard Hospital posted a Consultant Paediatric ICU opening.",
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              readAt: null,
              type: "JOB_MATCH",
            },
            {
              id: "notif-2",
              title: "Your application at Cleveland Clinic Abu Dhabi has been reviewed",
              body: "Application status updated to Under Review.",
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              readAt: new Date().toISOString(),
              type: "APPLICATION_UPDATE",
            },
            {
              id: "notif-3",
              title: "Interview invitation from King Faisal Specialist Hospital received",
              body: "Clinical interview request scheduled for next week.",
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              readAt: new Date().toISOString(),
              type: "HIRE_REQUEST_UPDATE",
            },
            {
              id: "notif-4",
              title: "Complete your professional licenses section to improve matches",
              body: "Ensure SCFHS license details are up to date.",
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              readAt: new Date().toISOString(),
              type: "PROFILE_REMINDER",
            },
          ];

    const isApproved = user.status === "APPROVED";

    const effectiveNotifications = !isApproved
      ? [
          {
            id: "review-notice-1",
            title: "Your Profile Is Under Review",
            body: "Your credentials and medical licenses are currently being verified by the platform administration team. Job applications and GCC credential matching will be unlocked once your account is approved.",
            createdAt: new Date().toISOString(),
            readAt: null,
            type: "ACCOUNT_STATUS",
          },
          ...notifications,
        ]
      : notifications;

    res.json({
      status: "success",
      doctor: {
        id: doctorProfile.id,
        fullName: doctorProfile.fullName,
        jobTitle: doctorProfile.jobTitle,
        yearsOfExperience: doctorProfile.yearsOfExperience,
        photoUrl: doctorProfile.photo ? `/api/files/${doctorProfile.photo.id}/download` : null,
      },
      accountStatus: user.status,
      canAccessJobFeatures: isApproved,
      stats: {
        savedJobs: isApproved ? doctorProfile.savedJobs.length : 0,
        applications: isApproved ? doctorProfile.applications.length : 0,
      },
      applications: isApproved
        ? doctorProfile.applications.map((app) => ({
            id: app.id,
            jobId: app.jobId,
            jobTitle: app.job.title,
            facilityName: "Confidential Client Institution",
            location: `${app.job.city.nameEn}, ${app.job.country.nameEn}`,
            appliedAt: app.submittedAt,
            status: app.status,
          }))
        : [],
      recommendedOpportunities: isApproved
        ? finalRecommended.map((j) => ({
            id: j.id,
            ref: `JO${String(j.referenceNumber).padStart(10, "0")}`,
            title: j.title,
            facilityName: "Confidential Client Institution",
            description: j.description,
            location: `${j.city.nameEn}, ${j.country.nameEn}`,
            salary:
              j.salaryMin && j.salaryMax
                ? `${j.salaryCurrency?.code ?? "SAR"} ${Number(j.salaryMin).toLocaleString()}–${Number(j.salaryMax).toLocaleString()}/${j.salaryPeriod?.nameEn ?? "mo"}`
                : "Competitive package",
            employmentType: j.employmentType.nameEn,
            isUrgent: j.isUrgent,
          }))
        : [],
      savedOpportunities: isApproved
        ? doctorProfile.savedJobs.map((sj) => ({
            id: sj.job.id,
            ref: `JO${String(sj.job.referenceNumber).padStart(10, "0")}`,
            title: sj.job.title,
            facilityName: "Confidential Client Institution",
            description: sj.job.description,
            location: `${sj.job.city.nameEn}, ${sj.job.country.nameEn}`,
            salary:
              sj.job.salaryMin && sj.job.salaryMax
                ? `${sj.job.salaryCurrency?.code ?? "SAR"} ${Number(sj.job.salaryMin).toLocaleString()}–${Number(sj.job.salaryMax).toLocaleString()}/${sj.job.salaryPeriod?.nameEn ?? "mo"}`
                : "Competitive package",
            employmentType: sj.job.employmentType.nameEn,
            isUrgent: sj.job.isUrgent,
          }))
        : [],
      consentRequests: isApproved
        ? doctorProfile.applications.flatMap((app) =>
            app.hireRequestItems.map((item) => ({
              id: item.identityRelease?.id || item.id,
              hireRequestItemId: item.id,
              applicationId: app.id,
              candidateCode: app.candidateCode,
              jobId: app.job.id,
              jobRef: `JO${String(app.job.referenceNumber).padStart(10, "0")}`,
              jobTitle: app.job.title,
              location: `${app.job.city.nameEn}, ${app.job.country.nameEn}`,
              hireRequestStatus: item.status,
              doctorConsentStatus: item.identityRelease?.doctorConsentStatus || "PENDING",
              doctorConsentAt: item.identityRelease?.doctorConsentAt || null,
              doctorConsentRevokedAt: item.identityRelease?.doctorConsentRevokedAt || null,
              identityReleaseStatus: item.identityRelease?.status || "PENDING",
              decidedAt: item.identityRelease?.decidedAt || null,
              requestedAt: item.createdAt,
              conversationId: item.identityRelease?.conversation?.id || null,
              conversationStatus: item.identityRelease?.conversation?.status || null,
            }))
          )
        : [],
      notifications: effectiveNotifications,
    });
  } catch (error) {
    console.error("Doctor dashboard error:", error);
    res.status(500).json({ status: "error", message: "Failed to load doctor dashboard data." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/doctor/jobs/:id/application-form
// Returns job details, doctor profile prefill, reference options, and existing application status
// ---------------------------------------------------------------------------
doctorRouter.get("/jobs/:id/application-form", async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;
    const jobId = String(req.params.id);

    const [doctorProfile, job, noticePeriods, referralSources, employmentTypes, currencies, cities, countries] =
      await Promise.all([
        prisma.doctorProfile.findUnique({
          where: { userId: user.id },
          include: {
            user: { select: { email: true, mobileE164: true } },
            nationality: true,
            residenceCountry: true,
            primarySpecialty: true,
            cv: { select: { id: true, originalName: true, sizeBytes: true } },
          },
        }),
        prisma.job.findFirst({
          where: { id: jobId, status: "PUBLISHED" },
          include: {
            specialty: true,
            city: true,
            country: true,
            employmentType: true,
            salaryCurrency: true,
            salaryPeriod: true,
          },
        }),
        prisma.noticePeriodOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
        prisma.referralSourceOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
        prisma.employmentTypeOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
        prisma.currency.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
        prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
        prisma.country.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      ]);

    if (!doctorProfile) {
      res.status(404).json({ status: "error", message: "Doctor profile not found." });
      return;
    }
    if (!job) {
      res.status(404).json({ status: "error", message: "Job opportunity not found or not published." });
      return;
    }

    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_doctorId: {
          jobId: job.id,
          doctorId: doctorProfile.id,
        },
      },
      include: {
        submission: true,
      },
    });

    const nameParts = (doctorProfile.fullName || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    res.json({
      status: "success",
      accountStatus: user.status,
      isApproved: user.status === "APPROVED",
      alreadyApplied: Boolean(existingApplication),
      existingApplication: existingApplication
        ? {
            id: existingApplication.id,
            candidateCode: existingApplication.candidateCode,
            status: existingApplication.status,
            submittedAt: existingApplication.submittedAt,
          }
        : null,
      job: {
        id: job.id,
        ref: `JO${String(job.referenceNumber).padStart(10, "0")}`,
        title: job.title,
        specialty: job.specialty.nameEn,
        location: `${job.city.nameEn}, ${job.country.nameEn}`,
        employmentType: job.employmentType.nameEn,
        salary:
          job.salaryMin && job.salaryMax
            ? `${job.salaryCurrency?.code ?? "SAR"} ${Number(job.salaryMin).toLocaleString()}–${Number(job.salaryMax).toLocaleString()}/${job.salaryPeriod?.nameEn ?? "mo"}`
            : "Competitive package",
        isUrgent: job.isUrgent,
      },
      prefill: {
        firstName,
        lastName,
        email: doctorProfile.user.email,
        phone: doctorProfile.user.mobileE164,
        dateOfBirth: doctorProfile.dateOfBirth,
        gender: doctorProfile.gender,
        nationalityId: doctorProfile.nationalityId,
        currentLocation: doctorProfile.residenceCountry?.nameEn || "Riyadh, Saudi Arabia",
        currentJobTitle: doctorProfile.currentPosition || doctorProfile.jobTitle || "Medical Specialist",
        specialtyId: doctorProfile.primarySpecialtyId,
        yearsOfExperience: doctorProfile.yearsOfExperience || 0,
        cv: doctorProfile.cv
          ? {
              id: doctorProfile.cv.id,
              originalName: doctorProfile.cv.originalName,
              sizeBytes: doctorProfile.cv.sizeBytes,
              url: `/api/files/${doctorProfile.cv.id}/download`,
            }
          : null,
      },
      options: {
        noticePeriods: noticePeriods.map((n) => ({ id: n.id, code: n.code, name: n.nameEn })),
        referralSources: referralSources.map((r) => ({ id: r.id, code: r.code, name: r.nameEn })),
        employmentTypes: employmentTypes.map((e) => ({ id: e.id, code: e.code, name: e.nameEn })),
        currencies: currencies.map((c) => ({ code: c.code, name: c.nameEn, symbol: c.symbol })),
        cities: cities.map((c) => ({ id: c.id, countryId: c.countryId, name: c.nameEn })),
        countries: countries.map((c) => ({ id: c.id, code: c.isoCode, name: c.nameEn, isGcc: c.isGcc })),
      },
    });
  } catch (error) {
    console.error("Doctor application form load error:", error);
    res.status(500).json({ status: "error", message: "Failed to load application form." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/doctor/jobs/:id/apply
// Strictly requires DOCTOR role and APPROVED account status.
// Creates Application and ApplicationSubmission securely.
// ---------------------------------------------------------------------------
doctorRouter.post("/jobs/:id/apply", async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;

    if (user.status !== "APPROVED") {
      res.status(403).json({
        status: "error",
        code: "ACCOUNT_NOT_APPROVED",
        message: "Doctor account must be approved by the platform before applying to jobs.",
      });
      return;
    }

    const jobId = String(req.params.id);

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
      include: { primarySpecialty: true, user: true },
    });

    if (!doctorProfile) {
      res.status(404).json({ status: "error", message: "Doctor profile not found." });
      return;
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, status: "PUBLISHED" },
    });

    if (!job) {
      res.status(404).json({ status: "error", message: "Job opportunity not found or not currently active." });
      return;
    }

    // Check existing application to prevent duplicate applications
    const existing = await prisma.application.findUnique({
      where: {
        jobId_doctorId: {
          jobId: job.id,
          doctorId: doctorProfile.id,
        },
      },
    });

    if (existing) {
      res.status(409).json({
        status: "error",
        code: "ALREADY_APPLIED",
        message: "You have already submitted an application for this opportunity.",
        candidateCode: existing.candidateCode,
      });
      return;
    }

    const body = req.body || {};
    const firstName = body.firstName ? String(body.firstName).trim() : doctorProfile.fullName.split(" ")[0] || "Doctor";
    const lastName = body.lastName !== undefined ? String(body.lastName).trim() : doctorProfile.fullName.split(" ").slice(1).join(" ") || null;
    const email = body.email ? String(body.email).trim() : doctorProfile.user.email;
    const phoneCountryCode = body.phoneCountryCode ? String(body.phoneCountryCode).trim() : null;
    const phoneNumber = body.phoneNumber ? String(body.phoneNumber).trim() : doctorProfile.user.mobileE164;
    const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : doctorProfile.dateOfBirth;
    const gender = body.gender || doctorProfile.gender;
    const nationalityId = body.nationalityId || doctorProfile.nationalityId;
    const currentLocation = body.currentLocation ? String(body.currentLocation).trim() : null;
    const currentJobTitle = body.currentJobTitle ? String(body.currentJobTitle).trim() : doctorProfile.jobTitle || "Medical Specialist";
    const specialtyId = body.specialtyId || doctorProfile.primarySpecialtyId || job.specialtyId;
    const mainQualification = body.mainQualification ? String(body.mainQualification).trim() : null;
    const qualificationDate = body.qualificationDate ? new Date(body.qualificationDate) : null;
    const yearsOfExperience = body.yearsOfExperience !== undefined ? Number(body.yearsOfExperience) : doctorProfile.yearsOfExperience || 0;
    const preferredCityId = body.preferredCityId || null;
    const acceptableLocations = Array.isArray(body.acceptableLocations) ? body.acceptableLocations.map(String) : [];
    const preferredEmploymentTypeId = body.preferredEmploymentTypeId || job.employmentTypeId;
    const noticePeriodId = body.noticePeriodId || null;
    const expectedSalary = body.expectedSalary ? Number(body.expectedSalary) : null;
    const expectedSalaryCurrencyCode = body.expectedSalaryCurrencyCode || job.salaryCurrencyCode || "SAR";
    const openToPrivateSector = body.openToPrivateSector !== undefined ? Boolean(body.openToPrivateSector) : true;
    const referralSourceId = body.referralSourceId || null;
    const additionalNotes = body.additionalNotes ? String(body.additionalNotes).trim() : null;
    const cvId = body.cvId || doctorProfile.cvId || null;
    const documentIds = Array.isArray(body.documentIds) ? body.documentIds.map(String) : [];

    // Generate unique candidate tracking code
    const candidateCode = "CAND-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          jobId: job.id,
          doctorId: doctorProfile.id,
          candidateCode,
          status: "SUBMITTED",
          anonymousJobTitle: currentJobTitle,
          anonymousSpecialtyId: specialtyId,
          anonymousYearsOfExperience: yearsOfExperience,
        },
      });

      await tx.applicationSubmission.create({
        data: {
          applicationId: app.id,
          firstName,
          lastName,
          email,
          phoneCountryCode,
          phoneNumber,
          dateOfBirth,
          gender,
          nationalityId,
          currentLocation,
          currentJobTitle,
          specialtyId,
          mainQualification,
          qualificationDate,
          yearsOfExperience,
          preferredCityId,
          acceptableLocations,
          preferredEmploymentTypeId,
          noticePeriodId,
          expectedSalary,
          expectedSalaryCurrencyCode,
          openToPrivateSector,
          referralSourceId,
          additionalNotes,
          cvId,
          termsAcceptedAt: new Date(),
        },
      });

      if (documentIds.length > 0) {
        await Promise.all(
          documentIds.map((fileId: string) =>
            tx.applicationDocument.create({
              data: {
                applicationId: app.id,
                fileId,
              },
            })
          )
        );
      }

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "APPLICATION_UPDATE",
          data: {
            title: `Application Submitted: ${job.title}`,
            body: `Your application has been anonymously submitted with candidate code ${candidateCode}.`,
            applicationId: app.id,
            jobId: job.id,
          },
        },
      });

      return app;
    });

    res.status(201).json({
      status: "success",
      message: "Application submitted successfully. Candidate profile sent anonymously to facility.",
      applicationId: application.id,
      candidateCode: application.candidateCode,
      submittedAt: application.submittedAt,
    });
  } catch (error) {
    console.error("Doctor job application error:", error);
    res.status(500).json({ status: "error", message: "Failed to submit job application." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/doctor/consent-requests
// Returns list of hiring inquiries / consent requests for this doctor
// ---------------------------------------------------------------------------
doctorRouter.get("/consent-requests", async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!doctorProfile) {
      res.status(404).json({ status: "error", message: "Doctor profile not found." });
      return;
    }

    const items = await prisma.hireRequestItem.findMany({
      where: {
        application: { doctorId: doctorProfile.id },
      },
      include: {
        hireRequest: {
          include: {
            job: {
              include: {
                city: true,
                country: true,
              },
            },
          },
        },
        application: true,
        identityRelease: {
          include: {
            conversation: {
              select: { id: true, status: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const consentRequests = items.map((item) => {
      const release = item.identityRelease;
      const job = item.hireRequest.job;
      return {
        id: release?.id || item.id,
        hireRequestItemId: item.id,
        applicationId: item.applicationId,
        candidateCode: item.application.candidateCode,
        jobId: job.id,
        jobRef: `JO${String(job.referenceNumber).padStart(10, "0")}`,
        jobTitle: job.title,
        location: `${job.city.nameEn}, ${job.country.nameEn}`,
        hireRequestStatus: item.status,
        doctorConsentStatus: release?.doctorConsentStatus || "PENDING",
        doctorConsentAt: release?.doctorConsentAt || null,
        doctorConsentRevokedAt: release?.doctorConsentRevokedAt || null,
        identityReleaseStatus: release?.status || "PENDING",
        decidedAt: release?.decidedAt || null,
        requestedAt: item.createdAt,
        facilityNote: item.hireRequest.facilityNote,
        conversationId: release?.conversation?.id || null,
        conversationStatus: release?.conversation?.status || null,
      };
    });

    res.json({
      status: "success",
      consentRequests,
    });
  } catch (error) {
    console.error("Get doctor consent requests error:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve consent requests." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/doctor/consent/:id/grant
// Doctor grants consent for platform to release identity to facility
// ---------------------------------------------------------------------------
doctorRouter.post("/consent/:id/grant", async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;
    const releaseId = String(req.params.id);

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!doctorProfile) {
      res.status(404).json({ status: "error", message: "Doctor profile not found." });
      return;
    }

    const release = await prisma.identityRelease.findUnique({
      where: { id: releaseId },
      include: {
        hireRequestItem: {
          include: {
            application: true,
            hireRequest: { include: { job: true, facility: true } },
          },
        },
      },
    });

    if (!release || release.hireRequestItem.application.doctorId !== doctorProfile.id) {
      res.status(404).json({ status: "error", message: "Consent request not found or does not belong to you." });
      return;
    }

    if (release.doctorConsentStatus === "REVOKED") {
      res.status(400).json({
        status: "error",
        code: "CONSENT_REVOKED",
        message: "A revoked consent request cannot be granted.",
      });
      return;
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.identityRelease.update({
        where: { id: release.id },
        data: {
          doctorConsentStatus: "GRANTED",
          doctorConsentAt: now,
        },
      });

      await tx.hireRequestItem.update({
        where: { id: release.hireRequestItemId },
        data: {
          status: "IN_COORDINATION",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "DOCTOR_CONSENT_GRANTED",
          entityType: "IdentityRelease",
          entityId: release.id,
          metadata: {
            hireRequestItemId: release.hireRequestItemId,
            applicationId: release.hireRequestItem.applicationId,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "IDENTITY_CONSENT_REQUEST",
          data: {
            title: "Consent Granted",
            body: `You granted consent for the position '${release.hireRequestItem.hireRequest.job.title}'. Platform administration will review the release.`,
            releaseId: release.id,
          },
        },
      });
    });

    res.json({
      status: "success",
      message: "Consent granted successfully. Platform administrators have been notified to review the release.",
    });
  } catch (error) {
    console.error("Grant consent error:", error);
    res.status(500).json({ status: "error", message: "Failed to grant consent." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/doctor/consent/:id/decline
// Doctor declines consent for identity release
// ---------------------------------------------------------------------------
doctorRouter.post("/consent/:id/decline", async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;
    const releaseId = String(req.params.id);

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!doctorProfile) {
      res.status(404).json({ status: "error", message: "Doctor profile not found." });
      return;
    }

    const release = await prisma.identityRelease.findUnique({
      where: { id: releaseId },
      include: {
        hireRequestItem: {
          include: {
            application: true,
            hireRequest: { include: { job: true } },
          },
        },
      },
    });

    if (!release || release.hireRequestItem.application.doctorId !== doctorProfile.id) {
      res.status(404).json({ status: "error", message: "Consent request not found." });
      return;
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.identityRelease.update({
        where: { id: release.id },
        data: {
          doctorConsentStatus: "DECLINED",
          doctorConsentAt: now,
          status: "REJECTED",
          decidedAt: now,
          decisionNote: "Doctor declined identity release consent.",
        },
      });

      await tx.hireRequestItem.update({
        where: { id: release.hireRequestItemId },
        data: {
          status: "REJECTED",
          closedAt: now,
        },
      });

      await tx.application.update({
        where: { id: release.hireRequestItem.applicationId },
        data: { status: "NOT_SELECTED" },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "DOCTOR_CONSENT_DECLINED",
          entityType: "IdentityRelease",
          entityId: release.id,
          metadata: {
            hireRequestItemId: release.hireRequestItemId,
            applicationId: release.hireRequestItem.applicationId,
          },
        },
      });
    });

    res.json({
      status: "success",
      message: "Consent declined. The hire request has been closed.",
    });
  } catch (error) {
    console.error("Decline consent error:", error);
    res.status(500).json({ status: "error", message: "Failed to decline consent." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/doctor/consent/:id/revoke
// Doctor revokes previously granted consent; makes conversation read-only
// ---------------------------------------------------------------------------
doctorRouter.post("/consent/:id/revoke", async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;
    const releaseId = String(req.params.id);

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!doctorProfile) {
      res.status(404).json({ status: "error", message: "Doctor profile not found." });
      return;
    }

    const release = await prisma.identityRelease.findUnique({
      where: { id: releaseId },
      include: {
        hireRequestItem: {
          include: {
            application: true,
            hireRequest: { include: { job: true } },
          },
        },
      },
    });

    if (!release || release.hireRequestItem.application.doctorId !== doctorProfile.id) {
      res.status(404).json({ status: "error", message: "Consent record not found." });
      return;
    }

    if (release.doctorConsentStatus === "REVOKED") {
      res.status(400).json({
        status: "error",
        code: "ALREADY_REVOKED",
        message: "Consent has already been revoked.",
      });
      return;
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      // Trigger conversation_read_only_on_revocation will automatically set Conversation to READ_ONLY
      await tx.identityRelease.update({
        where: { id: release.id },
        data: {
          doctorConsentStatus: "REVOKED",
          doctorConsentRevokedAt: now,
          status: "REVOKED",
          revokedAt: now,
          revocationReason: "DOCTOR_CONSENT_REVOKED",
        },
      });

      // Close hire request item if not already closed
      if (!release.hireRequestItem.closedAt) {
        await tx.hireRequestItem.update({
          where: { id: release.hireRequestItemId },
          data: {
            status: "WITHDRAWN",
            closedAt: now,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "DOCTOR_CONSENT_REVOKED",
          entityType: "IdentityRelease",
          entityId: release.id,
          metadata: {
            hireRequestItemId: release.hireRequestItemId,
            applicationId: release.hireRequestItem.applicationId,
          },
        },
      });
    });

    res.json({
      status: "success",
      message: "Consent revoked successfully. Active conversation is now read-only and facility access to your identity has been terminated.",
    });
  } catch (error) {
    console.error("Revoke consent error:", error);
    res.status(500).json({ status: "error", message: "Failed to revoke consent." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/doctor/jobs/:id/save
// Strictly requires DOCTOR role and APPROVED account status.
// ---------------------------------------------------------------------------
doctorRouter.post("/jobs/:id/save", async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;

    if (user.status !== "APPROVED") {
      res.status(403).json({
        status: "error",
        code: "ACCOUNT_NOT_APPROVED",
        message: "Doctor account must be approved by the platform before saving jobs.",
      });
      return;
    }

    const jobId = String(req.params.id);

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!doctorProfile) {
      res.status(404).json({ status: "error", message: "Doctor profile not found." });
      return;
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, status: "PUBLISHED" },
    });

    if (!job) {
      res.status(404).json({ status: "error", message: "Job opportunity not found." });
      return;
    }

    await prisma.savedJob.upsert({
      where: {
        doctorId_jobId: {
          doctorId: doctorProfile.id,
          jobId: job.id,
        },
      },
      update: {},
      create: {
        doctorId: doctorProfile.id,
        jobId: job.id,
      },
    });

    res.json({
      status: "success",
      message: "Job saved successfully.",
    });
  } catch (error) {
    console.error("Doctor save job error:", error);
    res.status(500).json({ status: "error", message: "Failed to save job opportunity." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/doctor/profile
// ---------------------------------------------------------------------------
// GET /api/doctor/profile
// Returns full live doctor profile, prefill options, and activeChangeRequest
// ---------------------------------------------------------------------------
doctorRouter.get("/profile", async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;

    const [profile, latestChangeRequest, countries, specialties] = await Promise.all([
      prisma.doctorProfile.findUnique({
        where: { userId: user.id },
        include: {
          user: { select: { email: true, mobileE164: true, status: true } },
          photo: true,
          cv: true,
          nationality: true,
          residenceCountry: true,
          primarySpecialty: true,
          additionalSpecialties: true,
          preferredCountries: true,
          educations: { orderBy: { sortOrder: "asc" } },
          licenses: { orderBy: { createdAt: "desc" } },
          experiences: { orderBy: { startDate: "desc" } },
          languages: true,
        },
      }),
      prisma.doctorProfileChangeRequest.findFirst({
        where: { doctor: { userId: user.id } },
        orderBy: { createdAt: "desc" },
        include: {
          reviewedBy: { select: { displayName: true, email: true } },
        },
      }),
      prisma.country.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.specialty.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);

    if (!profile) {
      res.status(404).json({ status: "error", message: "Doctor profile not found." });
      return;
    }

    res.json({
      status: "success",
      profile: {
        id: profile.id,
        fullName: profile.fullName,
        jobTitle: profile.jobTitle ?? "Medical Specialist",
        yearsOfExperience: profile.yearsOfExperience ?? 0,
        currentPosition: profile.currentPosition ?? profile.jobTitle ?? "Medical Specialist",
        about:
          profile.about ??
          "Board-certified specialist dedicated to excellence in patient care and clinical practice across the GCC region.",
        isAvailable: profile.isAvailable,
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().split("T")[0] : null,
        gender: profile.gender ?? "MALE",
        nationalityId: profile.nationalityId,
        nationalityName: profile.nationality?.nameEn ?? "Saudi Arabia",
        residenceCountryId: profile.residenceCountryId,
        residenceCountryName: profile.residenceCountry?.nameEn ?? "Saudi Arabia",
        mobileE164: profile.user?.mobileE164 ?? "",
        email: profile.user?.email ?? "",
        grade: "Consultant Grade",
        location: profile.residenceCountry ? `${profile.residenceCountry.nameEn}` : "Riyadh, Saudi Arabia",
        photoAssetId: profile.photoId,
        photoUrl: profile.photo ? `/api/files/${profile.photo.id}/download` : null,
        cv: profile.cv
          ? {
              id: profile.cv.id,
              originalName: profile.cv.originalName,
              sizeBytes: profile.cv.sizeBytes,
              downloadUrl: `/api/files/${profile.cv.id}/download`,
            }
          : null,
        primarySpecialtyId: profile.primarySpecialtyId,
        primarySpecialtyName: profile.primarySpecialty?.nameEn ?? "",
        specialties: [
          ...(profile.primarySpecialty ? [profile.primarySpecialty.nameEn] : []),
          ...profile.additionalSpecialties.map((s: { nameEn: string }) => s.nameEn),
        ],
        additionalSpecialtyIds: profile.additionalSpecialties.map((s) => s.id),
        additionalSpecialtyNames: profile.additionalSpecialties.map((s) => s.nameEn),
        preferredCountryIds: profile.preferredCountries.map((c) => c.id),
        preferredCountryNames: profile.preferredCountries.map((c) => c.nameEn),
        experiences: profile.experiences.map((exp) => ({
          id: exp.id,
          organization: exp.organization,
          position: exp.position,
          positionTitle: exp.position,
          hospitalName: exp.organization,
          startDate: exp.startDate ? exp.startDate.toISOString().split("T")[0] : "",
          endDate: exp.endDate ? exp.endDate.toISOString().split("T")[0] : null,
          duration: `${new Date(exp.startDate).getFullYear()} - ${
            exp.endDate ? new Date(exp.endDate).getFullYear() : "Present"
          }`,
          description: exp.responsibilities ?? "",
          responsibilities: exp.responsibilities ?? "",
        })),
        educations: profile.educations.map((edu) => ({
          id: edu.id,
          degree: edu.degree,
          institution: edu.institution,
          graduationYear: edu.graduationYear,
          year: edu.graduationYear ? String(edu.graduationYear) : "2018",
          isPrimary: edu.isPrimary,
        })),
        licenses: profile.licenses.map((lic) => ({
          id: lic.id,
          licenseType: lic.licenseType,
          registrationNumber: lic.registrationNumber,
          issuingAuthority: lic.issuingAuthority,
          expiryDate: lic.expiryDate ? lic.expiryDate.toISOString().split("T")[0] : null,
        })),
        languages: profile.languages.map((lang) => ({
          id: lang.id,
          language: lang.language,
          proficiency: lang.proficiency,
        })),
      },
      options: {
        countries: countries.map((c) => ({
          id: c.id,
          name: c.nameEn,
          nameAr: c.nameAr,
          isGcc: c.isGcc,
        })),
        specialties: specialties.map((s) => ({
          id: s.id,
          name: s.nameEn,
          nameAr: s.nameAr,
          slug: s.slug,
        })),
      },
      activeChangeRequest: latestChangeRequest
        ? {
            id: latestChangeRequest.id,
            status: latestChangeRequest.status,
            currentValues: latestChangeRequest.currentValues,
            proposedValues: latestChangeRequest.proposedValues,
            rejectionReason: latestChangeRequest.rejectionReason,
            createdAt: latestChangeRequest.createdAt,
            reviewedAt: latestChangeRequest.reviewedAt,
            reviewer: latestChangeRequest.reviewedBy
              ? {
                  name: latestChangeRequest.reviewedBy.displayName || latestChangeRequest.reviewedBy.email,
                  email: latestChangeRequest.reviewedBy.email,
                }
              : null,
          }
        : null,
    });
  } catch (error) {
    console.error("Doctor profile error:", error);
    res.status(500).json({ status: "error", message: "Failed to load doctor profile." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/doctor/profile/change-request
// Returns latest change request status for the doctor
// ---------------------------------------------------------------------------
const getLatestDoctorChangeRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;

    const latest = await prisma.doctorProfileChangeRequest.findFirst({
      where: { doctor: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: { select: { displayName: true, email: true } },
      },
    });

    res.json({
      status: "success",
      hasPendingRequest: latest?.status === "PENDING",
      latestRequest: latest
        ? {
            id: latest.id,
            status: latest.status,
            currentValues: latest.currentValues,
            proposedValues: latest.proposedValues,
            rejectionReason: latest.rejectionReason,
            createdAt: latest.createdAt,
            reviewedAt: latest.reviewedAt,
            reviewer: latest.reviewedBy
              ? {
                  name: latest.reviewedBy.displayName || latest.reviewedBy.email,
                  email: latest.reviewedBy.email,
                }
              : null,
          }
        : null,
    });
  } catch (error) {
    console.error("Doctor change request get error:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve change request." });
  }
};

doctorRouter.get("/profile/change-requests", getLatestDoctorChangeRequest);
doctorRouter.get("/profile/change-request", getLatestDoctorChangeRequest);

// ---------------------------------------------------------------------------
// POST /api/doctor/profile/change-requests
// Submits a complete 6-step doctor profile edit request for admin review
// Does NOT modify live DoctorProfile directly!
// ---------------------------------------------------------------------------
const submitDoctorChangeRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).doctorUser;

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: true,
        photo: true,
        cv: true,
        nationality: true,
        residenceCountry: true,
        primarySpecialty: true,
        additionalSpecialties: true,
        preferredCountries: true,
        educations: { orderBy: { sortOrder: "asc" } },
        licenses: { orderBy: { createdAt: "desc" } },
        experiences: { orderBy: { startDate: "desc" } },
        languages: true,
      },
    });

    if (!doctorProfile) {
      res.status(404).json({ status: "error", message: "Doctor profile record not found." });
      return;
    }

    const {
      fullName,
      dateOfBirth,
      gender,
      nationalityId,
      residenceCountryId,
      mobileE164,
      email,
      photoAssetId,
      jobTitle,
      primarySpecialtyId,
      additionalSpecialtyIds,
      about,
      yearsOfExperience,
      currentPosition,
      isAvailable,
      preferredCountryIds,
      educations,
      licenses,
      experiences,
      languages,
      cvAssetId,
    } = req.body ?? {};

    // 1. Validate required fields
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      res.status(400).json({ status: "error", message: "Full Name is required." });
      return;
    }

    if (!mobileE164 || typeof mobileE164 !== "string" || !mobileE164.trim()) {
      res.status(400).json({ status: "error", message: "Mobile Phone Number is required." });
      return;
    }

    // Lookup reference display names for current values
    const currentValues: Record<string, any> = {
      fullName: doctorProfile.fullName,
      dateOfBirth: doctorProfile.dateOfBirth ? doctorProfile.dateOfBirth.toISOString().split("T")[0] : null,
      gender: doctorProfile.gender,
      nationalityId: doctorProfile.nationalityId,
      nationalityName: doctorProfile.nationality?.nameEn ?? "—",
      residenceCountryId: doctorProfile.residenceCountryId,
      residenceCountryName: doctorProfile.residenceCountry?.nameEn ?? "—",
      mobileE164: doctorProfile.user.mobileE164,
      email: doctorProfile.user.email,
      photoAssetId: doctorProfile.photoId,
      photoUrl: doctorProfile.photo ? `/api/files/${doctorProfile.photo.id}/download` : null,
      jobTitle: doctorProfile.jobTitle,
      primarySpecialtyId: doctorProfile.primarySpecialtyId,
      primarySpecialtyName: doctorProfile.primarySpecialty?.nameEn ?? "—",
      about: doctorProfile.about,
      yearsOfExperience: doctorProfile.yearsOfExperience ?? 0,
      currentPosition: doctorProfile.currentPosition,
      isAvailable: doctorProfile.isAvailable,
      cvAssetId: doctorProfile.cvId,
      cvFileName: doctorProfile.cv?.originalName ?? null,
      cvUrl: doctorProfile.cv ? `/api/files/${doctorProfile.cv.id}/download` : null,
      preferredCountryIds: doctorProfile.preferredCountries.map((c) => c.id),
      preferredCountryNames: doctorProfile.preferredCountries.map((c) => c.nameEn),
      additionalSpecialtyIds: doctorProfile.additionalSpecialties.map((s) => s.id),
      additionalSpecialtyNames: doctorProfile.additionalSpecialties.map((s) => s.nameEn),
      educations: doctorProfile.educations.map((e) => ({
        degree: e.degree,
        institution: e.institution,
        graduationYear: e.graduationYear,
        isPrimary: e.isPrimary,
      })),
      licenses: doctorProfile.licenses.map((l) => ({
        licenseType: l.licenseType,
        registrationNumber: l.registrationNumber,
        issuingAuthority: l.issuingAuthority,
        expiryDate: l.expiryDate ? l.expiryDate.toISOString().split("T")[0] : null,
      })),
      experiences: doctorProfile.experiences.map((exp) => ({
        organization: exp.organization,
        position: exp.position,
        startDate: exp.startDate ? exp.startDate.toISOString().split("T")[0] : "",
        endDate: exp.endDate ? exp.endDate.toISOString().split("T")[0] : null,
        responsibilities: exp.responsibilities,
      })),
      languages: doctorProfile.languages.map((l) => ({
        language: l.language,
        proficiency: l.proficiency,
      })),
    };

    // Lookup reference display names for proposed values
    const [propNat, propRes, propSpec, propCountries, propSpecs, propPhoto, propCv] = await Promise.all([
      nationalityId ? prisma.country.findUnique({ where: { id: nationalityId } }) : null,
      residenceCountryId ? prisma.country.findUnique({ where: { id: residenceCountryId } }) : null,
      primarySpecialtyId ? prisma.specialty.findUnique({ where: { id: primarySpecialtyId } }) : null,
      Array.isArray(preferredCountryIds) && preferredCountryIds.length > 0
        ? prisma.country.findMany({ where: { id: { in: preferredCountryIds } } })
        : [],
      Array.isArray(additionalSpecialtyIds) && additionalSpecialtyIds.length > 0
        ? prisma.specialty.findMany({ where: { id: { in: additionalSpecialtyIds } } })
        : [],
      photoAssetId ? prisma.fileAsset.findUnique({ where: { id: photoAssetId } }) : null,
      cvAssetId ? prisma.fileAsset.findUnique({ where: { id: cvAssetId } }) : null,
    ]);

    const proposedValues: Record<string, any> = {
      fullName: String(fullName).trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString().split("T")[0] : null,
      gender: gender || doctorProfile.gender || "MALE",
      nationalityId: nationalityId || null,
      nationalityName: propNat?.nameEn ?? currentValues.nationalityName,
      residenceCountryId: residenceCountryId || null,
      residenceCountryName: propRes?.nameEn ?? currentValues.residenceCountryName,
      mobileE164: String(mobileE164).trim(),
      email: email && typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null,
      photoAssetId: photoAssetId || doctorProfile.photoId,
      photoUrl: photoAssetId
        ? `/api/files/${photoAssetId}/download`
        : currentValues.photoUrl,
      jobTitle: jobTitle && typeof jobTitle === "string" ? jobTitle.trim() : "Medical Specialist",
      primarySpecialtyId: primarySpecialtyId || null,
      primarySpecialtyName: propSpec?.nameEn ?? currentValues.primarySpecialtyName,
      about: about && typeof about === "string" ? about.trim() : "",
      yearsOfExperience: typeof yearsOfExperience === "number" ? yearsOfExperience : parseInt(String(yearsOfExperience), 10) || 0,
      currentPosition: currentPosition && typeof currentPosition === "string" ? currentPosition.trim() : "",
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      cvAssetId: cvAssetId || doctorProfile.cvId,
      cvFileName: propCv?.originalName ?? currentValues.cvFileName,
      cvUrl: cvAssetId ? `/api/files/${cvAssetId}/download` : currentValues.cvUrl,
      preferredCountryIds: Array.isArray(preferredCountryIds) ? preferredCountryIds : [],
      preferredCountryNames: propCountries.map((c) => c.nameEn),
      additionalSpecialtyIds: Array.isArray(additionalSpecialtyIds) ? additionalSpecialtyIds : [],
      additionalSpecialtyNames: propSpecs.map((s) => s.nameEn),
      educations: Array.isArray(educations)
        ? educations.map((e: any, idx: number) => ({
            degree: String(e.degree || "").trim(),
            institution: String(e.institution || "").trim(),
            graduationYear: e.graduationYear ? parseInt(String(e.graduationYear), 10) || null : null,
            isPrimary: Boolean(e.isPrimary || idx === 0),
          }))
        : [],
      licenses: Array.isArray(licenses)
        ? licenses.map((l: any) => ({
            licenseType: String(l.licenseType || "").trim(),
            registrationNumber: String(l.registrationNumber || "").trim(),
            issuingAuthority: String(l.issuingAuthority || "").trim(),
            expiryDate: l.expiryDate ? new Date(l.expiryDate).toISOString().split("T")[0] : null,
          }))
        : [],
      experiences: Array.isArray(experiences)
        ? experiences.map((exp: any) => ({
            organization: String(exp.organization || "").trim(),
            position: String(exp.position || "").trim(),
            startDate: exp.startDate ? new Date(exp.startDate).toISOString().split("T")[0] : "",
            endDate: exp.endDate ? new Date(exp.endDate).toISOString().split("T")[0] : null,
            responsibilities: exp.responsibilities ? String(exp.responsibilities).trim() : null,
          }))
        : [],
      languages: Array.isArray(languages)
        ? languages.map((lang: any) => ({
            language: String(lang.language || "").trim(),
            proficiency: lang.proficiency || "PROFESSIONAL",
          }))
        : [],
    };

    // Mark previous PENDING change requests as CANCELLED
    await prisma.doctorProfileChangeRequest.updateMany({
      where: { doctorId: doctorProfile.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    // Create new pending change request
    const changeRequest = await prisma.doctorProfileChangeRequest.create({
      data: {
        doctorId: doctorProfile.id,
        status: "PENDING",
        currentValues,
        proposedValues,
      },
    });

    res.status(201).json({
      status: "success",
      message:
        "Your profile change request has been submitted for platform review. Your approved live profile remains active until changes are approved.",
      changeRequest: {
        id: changeRequest.id,
        status: changeRequest.status,
        currentValues: changeRequest.currentValues,
        proposedValues: changeRequest.proposedValues,
        createdAt: changeRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("Doctor profile change request submission error:", error);
    res.status(500).json({ status: "error", message: "Failed to submit profile change request." });
  }
};

doctorRouter.post("/profile/change-requests", submitDoctorChangeRequest);
doctorRouter.post("/profile/change-request", submitDoctorChangeRequest);

// ---------------------------------------------------------------------------
// PATCH /api/doctor/profile
// Protected route rejecting direct live edits and directing to change request workflow
// ---------------------------------------------------------------------------
doctorRouter.patch("/profile", async (req: Request, res: Response) => {
  res.status(400).json({
    status: "error",
    code: "APPROVAL_REQUIRED",
    message:
      "Doctor profile updates require platform administrator review. Please submit proposed changes via POST /api/doctor/profile/change-requests.",
  });
});

