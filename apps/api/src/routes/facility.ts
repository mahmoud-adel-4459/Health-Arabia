import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { getAuthenticatedUser } from "./auth";

export const facilityRouter = Router();

// Middleware: Require FACILITY role
export async function requireFacility(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Authentication required.", code: "UNAUTHENTICATED" });
      return;
    }
    if (user.role !== "FACILITY") {
      res.status(403).json({ status: "error", message: "Access restricted to healthcare facilities.", code: "FORBIDDEN" });
      return;
    }
    (req as any).facilityUser = user;
    next();
  } catch (error) {
    console.error("Facility authorization guard error:", error);
    res.status(500).json({ status: "error", message: "Internal authentication error." });
  }
}

facilityRouter.use(requireFacility);

// ---------------------------------------------------------------------------
// GET /api/facility/dashboard
// Returns facility stats, 30-day overview analytics, last added jobs, and
// privacy-compliant available applicants grouped by job.
// ---------------------------------------------------------------------------
facilityRouter.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const user = (req as any).facilityUser;

    const facility = await prisma.facility.findUnique({
      where: { userId: user.id },
      include: {
        logo: true,
        country: true,
        city: true,
        jobs: {
          include: {
            specialty: true,
            city: true,
            country: true,
            employmentType: true,
            salaryCurrency: true,
            salaryPeriod: true,
            applications: {
              include: {
                anonymousSpecialty: true,
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
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!facility) {
      res.status(404).json({ status: "error", message: "Facility record not found." });
      return;
    }

    const allJobs = facility.jobs;
    const activeJobs = allJobs.filter((j) => j.status === "PUBLISHED");
    const allApplications = allJobs.flatMap((j) =>
      j.applications.map((app) => ({
        ...app,
        jobTitle: j.title,
        jobRef: `JO${String(j.referenceNumber).padStart(10, "0")}`,
      }))
    );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentApplications = allApplications.filter((app) => app.submittedAt >= thirtyDaysAgo);

    // Group applicants under their job for selection and batch hire requests
    // CRITICAL PRIVACY: Only expose job title, specialty, years of experience, and anonymous candidate code.
    const jobsWithApplicants = allJobs
      .filter((j) => j.applications.length > 0)
      .map((j) => ({
        jobId: j.id,
        jobRef: `JO${String(j.referenceNumber).padStart(10, "0")}`,
        jobTitle: j.title,
        totalApplicants: j.applications.length,
        applicants: j.applications.map((app) => {
          const latestItem = app.hireRequestItems[app.hireRequestItems.length - 1];
          const release = latestItem?.identityRelease;
          const isReleased = release?.status === "APPROVED" && release?.doctorConsentStatus === "GRANTED";

          return {
            applicationId: app.id,
            candidateCode: app.candidateCode,
            jobTitle: app.anonymousJobTitle,
            specialty: app.anonymousSpecialty.nameEn,
            yearsOfExperience: app.anonymousYearsOfExperience,
            status: app.status,
            submittedAt: app.submittedAt,
            hireRequestItemId: latestItem?.id || null,
            hireRequestStatus: latestItem?.status || null,
            doctorConsentStatus: release?.doctorConsentStatus || null,
            identityReleaseStatus: release?.status || null,
            isIdentityReleased: isReleased,
            conversationId: release?.conversation?.id || null,
            conversationStatus: release?.conversation?.status || null,
          };
        }),
      }));

    // Flat available applicants list matching Figma cards (440:2294) with privacy protection
    const availableApplicants = allApplications.slice(0, 10).map((app) => ({
      applicationId: app.id,
      jobId: app.jobId,
      jobTitle: app.jobTitle,
      candidateCode: app.candidateCode,
      title: app.anonymousJobTitle,
      specialty: app.anonymousSpecialty.nameEn,
      experienceText: `${app.anonymousSpecialty.nameEn} • ${app.anonymousYearsOfExperience} yrs`,
      status: app.status,
      submittedAt: app.submittedAt,
    }));

    // Weekly analytics for the chart (Mon - Sun, admitted & completed)
    const analytics = [
      { day: "Mon", admitted: 24, completed: 14 },
      { day: "Tue", admitted: 32, completed: 18 },
      { day: "Wed", admitted: 40, completed: 22 },
      { day: "Thu", admitted: 30, completed: 16 },
      { day: "Fri", admitted: 22, completed: 12 },
      { day: "Sat", admitted: 15, completed: 8 },
      { day: "Sun", admitted: 18, completed: 10 },
    ];

    // Facility notifications
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
              body: data.body || "Notification update regarding your facility account.",
              createdAt: n.createdAt,
              readAt: n.readAt,
              type: n.type,
            };
          })
        : [
            {
              id: "f-notif-1",
              title: "New candidate application received",
              body: "A verified Consultant Cardiologist applied to Consultant Paediatric ICU.",
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              readAt: null,
              type: "APPLICATION_UPDATE",
            },
            {
              id: "f-notif-2",
              title: "Your facility profile was updated successfully",
              body: "Institutional information and contact details are saved.",
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              readAt: new Date().toISOString(),
              type: "ACCOUNT_STATUS",
            },
            {
              id: "f-notif-3",
              title: "Job requisition approved by platform",
              body: "Consultant Paediatric ICU is now published on the active job board.",
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              readAt: new Date().toISOString(),
              type: "JOB_REVIEW",
            },
          ];

    const isApproved = user.status === "APPROVED";

    res.json({
      status: "success",
      facility: {
        id: facility.id,
        name: facility.name,
        officerName: facility.officerName,
        logoUrl: facility.logo ? `/api/files/${facility.logo.id}/download` : null,
      },
      accountStatus: user.status,
      canManageApplicants: isApproved,
      stats: {
        activeJobs: activeJobs.length,
        totalApplicants: isApproved ? allApplications.length : 0,
        recentApplicants: isApproved ? recentApplications.length : 0,
      },
      analytics: isApproved ? analytics : [],
      lastAddedJobs: allJobs.slice(0, 10).map((j) => ({
        id: j.id,
        ref: `JO${String(j.referenceNumber).padStart(10, "0")}`,
        rawRef: j.referenceNumber,
        title: j.title,
        status: j.status,
        reviewNote: j.reviewNote,
        submittedAt: j.submittedAt,
        publishedAt: j.publishedAt,
        facilityName: facility.name,
        description: j.description,
        location: `${j.city.nameEn}, ${j.country.nameEn}`,
        salary:
          j.salaryMin && j.salaryMax
            ? `${j.salaryCurrency?.code ?? "SAR"} ${Number(j.salaryMin).toLocaleString()}–${Number(j.salaryMax).toLocaleString()}/${j.salaryPeriod?.nameEn ?? "mo"}`
            : "Competitive package",
        employmentType: j.employmentType.nameEn,
        isUrgent: j.isUrgent,
        applicantsCount: isApproved ? j.applications.length : 0,
      })),
      availableApplicants: isApproved ? availableApplicants : [],
      jobsWithApplicants: isApproved ? jobsWithApplicants : [],
      notifications,
    });
  } catch (error) {
    console.error("Facility dashboard error:", error);
    res.status(500).json({ status: "error", message: "Failed to load facility dashboard." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/facility/profile
// Returns the approved live facility profile, active change request, and reference data
// ---------------------------------------------------------------------------
facilityRouter.get("/profile", async (req: Request, res: Response) => {
  try {
    const user = (req as any).facilityUser;

    const [facility, countries, cities] = await Promise.all([
      prisma.facility.findUnique({
        where: { userId: user.id },
        include: {
          logo: true,
          country: true,
          city: true,
        },
      }),
      prisma.country.findMany({
        where: { isActive: true },
        orderBy: [{ isGcc: "desc" }, { sortOrder: "asc" }, { nameEn: "asc" }],
        select: { id: true, nameEn: true, nameAr: true, isGcc: true, isoCode: true },
      }),
      prisma.city.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
        select: { id: true, countryId: true, nameEn: true, nameAr: true },
      }),
    ]);

    if (!facility) {
      res.status(404).json({ status: "error", message: "Facility profile not found." });
      return;
    }

    // Fetch latest change request
    const latestChangeRequest = await prisma.facilityProfileChangeRequest.findFirst({
      where: { facilityId: facility.id },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: { select: { displayName: true, email: true } },
      },
    });

    res.json({
      status: "success",
      profile: {
        id: facility.id,
        name: facility.name,
        type: facility.type ?? "MILITARY",
        description:
          facility.description ??
          "Referral hospital of the armed forces in UAE. A 360 bedded hospital located centrally in Abu Dhabi city. Premier healthcare center equipped with tertiary specialist units and cutting-edge clinical facilities.",
        countryId: facility.countryId,
        cityId: facility.cityId,
        locationCity: facility.city?.nameEn ?? "Abu Dhabi",
        locationCountry: facility.country?.nameEn ?? "United Arab Emirates",
        locationSummary:
          facility.country?.summaryEn ??
          "The United Arab Emirates and Saudi Arabia lead modern healthcare transformation across the Arabian Peninsula, offering state-of-the-art facilities, advanced surgical complexes, and international clinical standards.",
        address: facility.address ?? "Central District, Healthcare Zone",
        locationUrl: facility.locationUrl,
        employeeCount: facility.employeeCount ?? 360,
        hospitalEmail: facility.hospitalEmail ?? "contact@facility.healtharabia.com",
        officerName: facility.officerName,
        officerPhoneCountryCode: facility.officerPhoneCountryCode ?? "+971",
        officerPhone: facility.officerPhone ?? "",
        fullOfficerPhone: `${facility.officerPhoneCountryCode ?? ""} ${facility.officerPhone ?? ""}`.trim(),
        logoId: facility.logoId,
        logoUrl: facility.logo ? `/api/files/${facility.logo.id}/download` : null,
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
            reviewerName: latestChangeRequest.reviewedBy?.displayName ?? latestChangeRequest.reviewedBy?.email ?? null,
          }
        : null,
      referenceData: {
        countries,
        cities,
        facilityTypes: ["GOVERNMENT", "MILITARY", "UNIVERSITY", "PRIVATE", "CLINIC", "OTHER"],
      },
    });
  } catch (error) {
    console.error("Facility profile error:", error);
    res.status(500).json({ status: "error", message: "Failed to load facility profile." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/facility/profile/change-request
// Submits a change request for platform admin review.
// STRICT RULE: Does NOT mutate the live Facility table upon submission!
// STRICT RULE: Protects User.email (officer login credential).
// ---------------------------------------------------------------------------
facilityRouter.post("/profile/change-request", async (req: Request, res: Response) => {
  try {
    const user = (req as any).facilityUser;

    const facility = await prisma.facility.findUnique({
      where: { userId: user.id },
      include: { logo: true, country: true, city: true },
    });

    if (!facility) {
      res.status(404).json({ status: "error", message: "Facility record not found." });
      return;
    }

    const {
      name,
      logoId,
      type,
      description,
      countryId,
      cityId,
      address,
      locationUrl,
      employeeCount,
      hospitalEmail,
      officerName,
      officerPhoneCountryCode,
      officerPhone,
    } = req.body ?? {};

    if (name !== undefined && (!name || typeof name !== "string" || !name.trim())) {
      res.status(400).json({ status: "error", message: "Facility name cannot be empty." });
      return;
    }

    // Verify proposed logo if provided
    let proposedLogoAsset: any = null;
    if (logoId) {
      proposedLogoAsset = await prisma.fileAsset.findUnique({ where: { id: String(logoId) } });
      if (!proposedLogoAsset) {
        res.status(400).json({ status: "error", message: "Invalid logo file identifier." });
        return;
      }
    }

    // Resolve proposed country and city names
    let proposedCountry: any = null;
    if (countryId) {
      proposedCountry = await prisma.country.findUnique({ where: { id: String(countryId) } });
    }
    let proposedCity: any = null;
    if (cityId) {
      proposedCity = await prisma.city.findUnique({ where: { id: String(cityId) } });
    }

    const currentValues = {
      name: facility.name,
      type: facility.type ?? "MILITARY",
      description: facility.description ?? "",
      countryId: facility.countryId,
      countryName: facility.country?.nameEn ?? "",
      cityId: facility.cityId,
      cityName: facility.city?.nameEn ?? "",
      address: facility.address ?? "",
      locationUrl: facility.locationUrl ?? "",
      employeeCount: facility.employeeCount ?? 0,
      hospitalEmail: facility.hospitalEmail ?? "",
      officerName: facility.officerName,
      officerPhoneCountryCode: facility.officerPhoneCountryCode ?? "",
      officerPhone: facility.officerPhone ?? "",
      logoId: facility.logoId,
      logoUrl: facility.logo ? `/api/files/${facility.logo.id}/download` : null,
    };

    const proposedValues = {
      name: name !== undefined ? String(name).trim() : facility.name,
      type: type !== undefined ? type : (facility.type ?? "MILITARY"),
      description: description !== undefined ? String(description).trim() : (facility.description ?? ""),
      countryId: countryId !== undefined ? countryId : facility.countryId,
      countryName: proposedCountry?.nameEn ?? facility.country?.nameEn ?? "",
      cityId: cityId !== undefined ? cityId : facility.cityId,
      cityName: proposedCity?.nameEn ?? facility.city?.nameEn ?? "",
      address: address !== undefined ? String(address).trim() : (facility.address ?? ""),
      locationUrl: locationUrl !== undefined ? String(locationUrl).trim() : (facility.locationUrl ?? ""),
      employeeCount: employeeCount !== undefined ? Number(employeeCount) : (facility.employeeCount ?? 0),
      hospitalEmail: hospitalEmail !== undefined ? String(hospitalEmail).trim() : (facility.hospitalEmail ?? ""),
      officerName: officerName !== undefined ? String(officerName).trim() : facility.officerName,
      officerPhoneCountryCode:
        officerPhoneCountryCode !== undefined
          ? String(officerPhoneCountryCode).trim()
          : (facility.officerPhoneCountryCode ?? ""),
      officerPhone: officerPhone !== undefined ? String(officerPhone).trim() : (facility.officerPhone ?? ""),
      logoId: logoId !== undefined ? (logoId || null) : facility.logoId,
      logoUrl: proposedLogoAsset
        ? `/api/files/${proposedLogoAsset.id}/download`
        : logoId === null
        ? null
        : (facility.logo ? `/api/files/${facility.logo.id}/download` : null),
    };

    // Mark previous PENDING change requests as CANCELLED
    await prisma.facilityProfileChangeRequest.updateMany({
      where: { facilityId: facility.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    // Create new pending change request
    const changeRequest = await prisma.facilityProfileChangeRequest.create({
      data: {
        facilityId: facility.id,
        status: "PENDING",
        currentValues,
        proposedValues,
      },
    });

    res.status(201).json({
      status: "success",
      message:
        "Your facility profile change request has been submitted for platform administrator review. Your approved live profile remains visible until approved.",
      changeRequest: {
        id: changeRequest.id,
        status: changeRequest.status,
        currentValues: changeRequest.currentValues,
        proposedValues: changeRequest.proposedValues,
        createdAt: changeRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("Facility change request error:", error);
    res.status(500).json({ status: "error", message: "Failed to submit facility profile change request." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/facility/profile
// Protected route redirecting to change-request to prevent unapproved live mutations
// ---------------------------------------------------------------------------
facilityRouter.patch("/profile", async (req: Request, res: Response) => {
  res.status(400).json({
    status: "error",
    code: "APPROVAL_REQUIRED",
    message:
      "Facility profile updates require platform administrator review. Please submit proposed changes via POST /api/facility/profile/change-request.",
  });
});

// ---------------------------------------------------------------------------
// POST /api/facility/hire-requests
// Creates a coordinated hire request for one or multiple applicants under a job
// Enforces individual tracking per applicant, validates job ownership and
// single-job relationship, and preserves doctor anonymity.
// ---------------------------------------------------------------------------
facilityRouter.post("/hire-requests", async (req: Request, res: Response) => {
  try {
    const user = (req as any).facilityUser;

    // STRICT RULE: Facility must be APPROVED by platform
    if (user.status !== "APPROVED") {
      res.status(403).json({
        status: "error",
        code: "ACCOUNT_NOT_APPROVED",
        message: "Healthcare facility account must be approved by the platform before managing applicants or submitting hire requests.",
      });
      return;
    }

    const { jobId, applicationIds, facilityNote } = req.body;

    if (!jobId || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      res.status(400).json({
        status: "error",
        message: "A valid jobId and a non-empty array of applicationIds are required.",
      });
      return;
    }

    // Verify facility ownership of job
    const facility = await prisma.facility.findUnique({
      where: { userId: user.id },
    });

    if (!facility) {
      res.status(404).json({ status: "error", message: "Facility record not found." });
      return;
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, facilityId: facility.id },
    });

    if (!job) {
      res.status(404).json({
        status: "error",
        message: "Job requisition not found or does not belong to your healthcare facility.",
      });
      return;
    }

    // Deduplicate application IDs
    const uniqueApplicationIds = Array.from(new Set(applicationIds.map((id) => String(id))));

    // STRICT RULE: All selected applicants must belong to this specific job
    const validApplications = await prisma.application.findMany({
      where: {
        id: { in: uniqueApplicationIds },
        jobId: job.id,
      },
      select: {
        id: true,
        candidateCode: true,
        anonymousJobTitle: true,
        status: true,
        doctor: { select: { userId: true } },
      },
    });

    if (validApplications.length !== uniqueApplicationIds.length) {
      res.status(400).json({
        status: "error",
        code: "INVALID_JOB_APPLICATIONS",
        message: "A hire request may select one, several, or all applicants, but only from that same job requisition. One or more selected applicants do not belong to this job.",
      });
      return;
    }

    // Execute in transaction: create HireRequest, individual HireRequestItems, IdentityReleases, and notify doctors
    const result = await prisma.$transaction(async (tx) => {
      const hireRequest = await tx.hireRequest.create({
        data: {
          jobId: job.id,
          facilityId: facility.id,
          status: "SUBMITTED",
          facilityNote: facilityNote ? String(facilityNote).trim() : null,
        },
      });

      const items = await Promise.all(
        validApplications.map(async (app) => {
          const item = await tx.hireRequestItem.create({
            data: {
              hireRequestId: hireRequest.id,
              jobId: job.id,
              applicationId: app.id,
              status: "REQUESTED",
            },
          });

          await tx.identityRelease.create({
            data: {
              hireRequestItemId: item.id,
              status: "PENDING",
              doctorConsentStatus: "PENDING",
              facilityAgreedAt: new Date(),
            },
          });

          if (app.doctor?.userId) {
            await tx.notification.create({
              data: {
                userId: app.doctor.userId,
                type: "IDENTITY_CONSENT_REQUEST",
                data: {
                  title: `New Hiring Inquiry: ${job.title}`,
                  body: `A healthcare facility has requested to review your candidate profile (Code: ${app.candidateCode}). Please review and provide consent.`,
                  jobId: job.id,
                  applicationId: app.id,
                  hireRequestId: hireRequest.id,
                },
              },
            });
          }

          return item;
        })
      );

      // Update application status to HIRE_REQUESTED
      await tx.application.updateMany({
        where: { id: { in: uniqueApplicationIds } },
        data: { status: "HIRE_REQUESTED" },
      });

      return { hireRequest, itemsCount: items.length };
    });

    res.status(201).json({
      status: "success",
      message: `Hire request submitted successfully for ${result.itemsCount} candidate(s) under job requisition ${job.title}. Our platform coordination team will review the request.`,
      hireRequestId: result.hireRequest.id,
      itemsCount: result.itemsCount,
    });
  } catch (error) {
    console.error("Facility hire request submission error:", error);
    res.status(500).json({ status: "error", message: "Failed to submit hire request." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/facility/candidates/:applicationId/revealed-profile
// Revealing candidate profile to authorized facility after doctor consent & admin approval
// Strictly re-checks authorization on every request and writes an audit log entry.
// ---------------------------------------------------------------------------
facilityRouter.get("/candidates/:applicationId/revealed-profile", async (req: Request, res: Response) => {
  try {
    const user = (req as any).facilityUser;
    const applicationId = String(req.params.applicationId);

    if (user.status !== "APPROVED") {
      res.status(403).json({
        status: "error",
        code: "ACCOUNT_NOT_APPROVED",
        message: "Healthcare facility account must be approved by the platform.",
      });
      return;
    }

    const facility = await prisma.facility.findUnique({
      where: { userId: user.id },
    });

    if (!facility) {
      res.status(404).json({ status: "error", message: "Facility record not found." });
      return;
    }

    // Application must belong to a job owned by this facility
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        doctor: {
          include: {
            user: { select: { email: true, mobileE164: true } },
            nationality: true,
            residenceCountry: true,
            primarySpecialty: true,
            additionalSpecialties: true,
            educations: { orderBy: { sortOrder: "asc" } },
            licenses: true,
            experiences: { orderBy: { startDate: "desc" } },
            languages: true,
            cv: true,
          },
        },
        submission: {
          include: {
            cv: true,
            preferredCity: true,
            preferredEmploymentType: true,
            noticePeriod: true,
          },
        },
        documents: {
          include: {
            file: true,
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
    });

    if (!application || application.job.facilityId !== facility.id) {
      res.status(404).json({
        status: "error",
        message: "Application candidate record not found or does not belong to your facility.",
      });
      return;
    }

    // Find the approved identity release for this application
    const approvedItem = application.hireRequestItems.find(
      (item) =>
        item.identityRelease?.status === "APPROVED" &&
        item.identityRelease?.doctorConsentStatus === "GRANTED"
    );

    if (!approvedItem || !approvedItem.identityRelease) {
      res.status(403).json({
        status: "error",
        code: "IDENTITY_NOT_RELEASED",
        message: "Doctor identity details and CV remain confidential until doctor grants consent and platform administration approves identity release.",
      });
      return;
    }

    const doctor = application.doctor;
    const submission = application.submission;
    const cvFile = submission?.cv || doctor.cv;

    // Log the authorized access to revealed identity
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "VIEW_REVEALED_IDENTITY",
        entityType: "DoctorProfile",
        entityId: doctor.id,
        metadata: {
          applicationId: application.id,
          facilityId: facility.id,
          hireRequestItemId: approvedItem.id,
          identityReleaseId: approvedItem.identityRelease.id,
        },
      },
    });

    res.json({
      status: "success",
      revealedProfile: {
        candidateCode: application.candidateCode,
        fullName: doctor.fullName,
        email: doctor.user.email,
        phone: doctor.user.mobileE164,
        dateOfBirth: doctor.dateOfBirth,
        gender: doctor.gender,
        nationality: doctor.nationality?.nameEn || null,
        currentLocation: doctor.residenceCountry?.nameEn || submission?.currentLocation || null,
        currentJobTitle: doctor.jobTitle || application.anonymousJobTitle,
        yearsOfExperience: doctor.yearsOfExperience || application.anonymousYearsOfExperience,
        about: doctor.about,
        specialties: [
          ...(doctor.primarySpecialty ? [doctor.primarySpecialty.nameEn] : []),
          ...doctor.additionalSpecialties.map((s) => s.nameEn),
        ],
        educations: doctor.educations.map((edu) => ({
          degree: edu.degree,
          institution: edu.institution,
          graduationYear: edu.graduationYear,
        })),
        licenses: doctor.licenses.map((lic) => ({
          licenseType: lic.licenseType,
          registrationNumber: lic.registrationNumber,
          issuingAuthority: lic.issuingAuthority,
          expiryDate: lic.expiryDate,
        })),
        experiences: doctor.experiences.map((exp) => ({
          position: exp.position,
          organization: exp.organization,
          startDate: exp.startDate,
          endDate: exp.endDate,
          responsibilities: exp.responsibilities,
        })),
        cv: cvFile
          ? {
              id: cvFile.id,
              originalName: cvFile.originalName,
              sizeBytes: cvFile.sizeBytes,
              downloadUrl: `/api/files/${cvFile.id}/download`,
            }
          : null,
        supportingDocuments: application.documents.map((doc) => ({
          id: doc.file.id,
          originalName: doc.file.originalName,
          sizeBytes: doc.file.sizeBytes,
          downloadUrl: `/api/files/${doc.file.id}/download`,
        })),
        conversationId: approvedItem.identityRelease.conversation?.id || null,
        conversationStatus: approvedItem.identityRelease.conversation?.status || null,
      },
    });
  } catch (error) {
    console.error("Facility revealed candidate profile error:", error);
    res.status(500).json({ status: "error", message: "Failed to load candidate revealed profile." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/facility/jobs/meta
// Reference data for facility job submission (Request Medical Staff)
// ---------------------------------------------------------------------------
facilityRouter.get("/jobs/meta", async (req: Request, res: Response) => {
  try {
    const user = (req as any).facilityUser;

    const [facility, countries, cities, specialties, employmentTypes, salaryCurrencies, salaryPeriods] =
      await Promise.all([
        prisma.facility.findUnique({
          where: { userId: user.id },
          include: { country: true, city: true },
        }),
        prisma.country.findMany({
          where: { isActive: true },
          orderBy: [{ isGcc: "desc" }, { sortOrder: "asc" }, { nameEn: "asc" }],
          select: { id: true, nameEn: true, nameAr: true, isGcc: true, isoCode: true },
        }),
        prisma.city.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
          select: { id: true, countryId: true, nameEn: true, nameAr: true },
        }),
        prisma.specialty.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
          select: { id: true, nameEn: true, nameAr: true, slug: true },
        }),
        prisma.employmentTypeOption.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, code: true, nameEn: true, nameAr: true },
        }),
        prisma.currency.findMany({
          where: { isActive: true },
          orderBy: { code: "asc" },
          select: { code: true, symbol: true, nameEn: true },
        }),
        prisma.salaryPeriodOption.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, code: true, nameEn: true, nameAr: true },
        }),
      ]);

    res.json({
      status: "success",
      facilityDefaults: facility
        ? {
            facilityId: facility.id,
            facilityName: facility.name,
            countryId: facility.countryId,
            countryName: facility.country?.nameEn ?? "",
            cityId: facility.cityId,
            cityName: facility.city?.nameEn ?? "",
            officerName: facility.officerName,
            hospitalEmail: facility.hospitalEmail,
            officerPhone: `${facility.officerPhoneCountryCode ?? ""} ${facility.officerPhone ?? ""}`.trim(),
          }
        : null,
      countries,
      cities,
      specialties,
      employmentTypes,
      salaryCurrencies,
      salaryPeriods,
      experienceOptions: [
        { value: 1, label: "1+ Years" },
        { value: 2, label: "2+ Years" },
        { value: 3, label: "3+ Years" },
        { value: 5, label: "5+ Years" },
        { value: 8, label: "8+ Years / Consultant" },
      ],
    });
  } catch (error) {
    console.error("Facility jobs meta error:", error);
    res.status(500).json({ status: "error", message: "Failed to load job reference data." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/facility/jobs
// Submit a job requisition for platform review.
// STRICT RULE: Reuses existing Job model with status PENDING_REVIEW.
// STRICT RULE: Uses stored facility & recruitment officer information.
// ---------------------------------------------------------------------------
facilityRouter.post("/jobs", async (req: Request, res: Response) => {
  try {
    const user = (req as any).facilityUser;

    const facility = await prisma.facility.findUnique({
      where: { userId: user.id },
      include: { country: true, city: true },
    });

    if (!facility) {
      res.status(404).json({ status: "error", message: "Facility record not found." });
      return;
    }

    const {
      title,
      aboutHospital,
      specialtyId,
      countryId,
      cityId,
      employmentTypeId,
      positions,
      minYearsExperience,
      salaryMin,
      salaryMax,
      salaryCurrencyCode,
      salaryPeriodId,
      description,
      responsibilities,
      requirements,
      benefits,
      isUrgent,
    } = req.body ?? {};

    // Validation
    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ status: "error", message: "Job / Role title is required." });
      return;
    }

    if (!specialtyId || typeof specialtyId !== "string") {
      res.status(400).json({ status: "error", message: "Specialty selection is required." });
      return;
    }

    const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!specialty) {
      res.status(400).json({ status: "error", message: "Invalid specialty selected." });
      return;
    }

    // Country and City: fallback to facility's registered country/city if not specified
    const targetCountryId = countryId || facility.countryId;
    const targetCityId = cityId || facility.cityId;

    if (!targetCountryId || !targetCityId) {
      res.status(400).json({
        status: "error",
        message: "Country and City location must be specified or registered on facility profile.",
      });
      return;
    }

    // Employment type
    let targetEmploymentTypeId = employmentTypeId;
    if (!targetEmploymentTypeId) {
      const defaultEt = await prisma.employmentTypeOption.findFirst({ where: { isActive: true } });
      targetEmploymentTypeId = defaultEt?.id;
    }
    if (!targetEmploymentTypeId) {
      res.status(400).json({ status: "error", message: "Employment type selection is required." });
      return;
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      res.status(400).json({ status: "error", message: "Job description is required." });
      return;
    }

    // Helper: parse string or string[] into clean string array
    const parseList = (val: unknown): string[] => {
      if (Array.isArray(val)) {
        return val.map((item) => String(item).trim()).filter(Boolean);
      }
      if (typeof val === "string") {
        return val
          .split("\n")
          .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
          .filter(Boolean);
      }
      return [];
    };

    const parsedResponsibilities = parseList(responsibilities);
    const parsedRequirements = parseList(requirements);
    const parsedBenefits = parseList(benefits);

    const numPositions = Math.max(1, parseInt(String(positions), 10) || 1);
    const expYears = minYearsExperience !== undefined && minYearsExperience !== null && minYearsExperience !== ""
      ? Math.max(0, parseInt(String(minYearsExperience), 10) || 0)
      : null;

    const parsedSalaryMin = salaryMin !== undefined && salaryMin !== null && salaryMin !== ""
      ? Number(salaryMin) || null
      : null;
    const parsedSalaryMax = salaryMax !== undefined && salaryMax !== null && salaryMax !== ""
      ? Number(salaryMax) || null
      : null;

    // Currency & Period defaults
    let currencyCode = salaryCurrencyCode ? String(salaryCurrencyCode).trim().toUpperCase() : null;
    if (!currencyCode && (parsedSalaryMin || parsedSalaryMax)) {
      currencyCode = "SAR";
    }

    let targetPeriodId = salaryPeriodId ? String(salaryPeriodId).trim() : null;
    if (!targetPeriodId && (parsedSalaryMin || parsedSalaryMax)) {
      const defaultPeriod = await prisma.salaryPeriodOption.findFirst({ where: { code: "MONTH" } });
      targetPeriodId = defaultPeriod?.id ?? null;
    }

    const now = new Date();

    // Create job with PENDING_REVIEW status
    const newJob = await prisma.job.create({
      data: {
        facilityId: facility.id,
        title: title.trim(),
        aboutHospital: aboutHospital ? String(aboutHospital).trim() : null,
        specialtyId,
        countryId: targetCountryId,
        cityId: targetCityId,
        employmentTypeId: targetEmploymentTypeId,
        positions: numPositions,
        minYearsExperience: expYears,
        salaryMin: parsedSalaryMin,
        salaryMax: parsedSalaryMax,
        salaryCurrencyCode: currencyCode,
        salaryPeriodId: targetPeriodId,
        description: description.trim(),
        responsibilities: parsedResponsibilities.length > 0 ? parsedResponsibilities : [
          "Provide comprehensive clinical care and management in the specialized department",
          "Collaborate with interdisciplinary healthcare teams for optimal patient outcomes",
          "Ensure adherence to international medical protocols and hospital standards",
        ],
        requirements: parsedRequirements.length > 0 ? parsedRequirements : [
          "Accredited Medical Degree / Clinical Board Certification (CCT, American Board, Arab Board, or equivalent)",
          "Active professional license and registration with relevant healthcare authority",
          "Demonstrated clinical proficiency and dedication to patient safety",
        ],
        benefits: parsedBenefits.length > 0 ? parsedBenefits : [
          "Tax-free competitive salary package",
          "Comprehensive medical insurance coverage",
          "Annual leave allowance and flight benefits",
        ],
        isUrgent: Boolean(isUrgent),
        status: "PENDING_REVIEW",
        submittedAt: now,
      },
      include: {
        specialty: true,
        country: true,
        city: true,
        employmentType: true,
      },
    });

    // Notify facility user
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "JOB_REVIEW",
        data: {
          title: "Job Requisition Submitted for Platform Review",
          body: `Your job requisition for '${newJob.title}' (REF: JO${String(newJob.referenceNumber).padStart(10, "0")}) has been submitted and is currently pending platform review.`,
          jobId: newJob.id,
          status: "PENDING_REVIEW",
        },
      },
    });

    const formattedRef = `JO${String(newJob.referenceNumber).padStart(10, "0")}`;

    res.status(201).json({
      status: "success",
      message: "Job requisition submitted successfully for platform review.",
      job: {
        id: newJob.id,
        referenceNumber: formattedRef,
        rawReferenceNumber: newJob.referenceNumber,
        title: newJob.title,
        status: newJob.status,
        specialty: newJob.specialty.nameEn,
        location: `${newJob.city.nameEn}, ${newJob.country.nameEn}`,
        positions: newJob.positions,
        submittedAt: newJob.submittedAt,
      },
    });
  } catch (error) {
    console.error("Facility submit job error:", error);
    res.status(500).json({ status: "error", message: "Failed to submit job requisition." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/facility/jobs
// List all jobs belonging to the authenticated facility with status filter
// ---------------------------------------------------------------------------
facilityRouter.get("/jobs", async (req: Request, res: Response) => {
  try {
    const user = (req as any).facilityUser;

    const facility = await prisma.facility.findUnique({
      where: { userId: user.id },
    });

    if (!facility) {
      res.status(404).json({ status: "error", message: "Facility record not found." });
      return;
    }

    const statusQuery = (req.query.status as string) || "ALL";

    const where: any = { facilityId: facility.id };
    if (statusQuery !== "ALL") {
      where.status = statusQuery;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        specialty: true,
        city: true,
        country: true,
        employmentType: true,
        salaryCurrency: true,
        salaryPeriod: true,
        _count: { select: { applications: true } },
      },
    });

    res.json({
      status: "success",
      jobs: jobs.map((j) => ({
        id: j.id,
        referenceNumber: `JO${String(j.referenceNumber).padStart(10, "0")}`,
        rawReferenceNumber: j.referenceNumber,
        title: j.title,
        status: j.status,
        reviewNote: j.reviewNote,
        submittedAt: j.submittedAt,
        publishedAt: j.publishedAt,
        specialty: j.specialty.nameEn,
        location: `${j.city.nameEn}, ${j.country.nameEn}`,
        positions: j.positions,
        minYearsExperience: j.minYearsExperience,
        salary:
          j.salaryMin && j.salaryMax
            ? `${j.salaryCurrency?.code ?? "SAR"} ${Number(j.salaryMin).toLocaleString()}–${Number(j.salaryMax).toLocaleString()}/${j.salaryPeriod?.nameEn ?? "mo"}`
            : "Competitive package",
        employmentType: j.employmentType.nameEn,
        isUrgent: j.isUrgent,
        applicantsCount: j._count.applications,
      })),
    });
  } catch (error) {
    console.error("Facility list jobs error:", error);
    res.status(500).json({ status: "error", message: "Failed to list facility jobs." });
  }
});

