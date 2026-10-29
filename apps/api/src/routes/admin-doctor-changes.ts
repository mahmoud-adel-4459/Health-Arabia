import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { recordAdminIdentityRead } from "../lib/admin-audit";
import { requirePlatformAdmin } from "./admin-accounts";

export const adminDoctorChangesRouter = Router();

// Thrown inside review transactions to roll back and report a 409 to the reviewer
class ChangeRequestConflict extends Error {}

// Apply platform admin authorization guard
adminDoctorChangesRouter.use(requirePlatformAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/doctor-changes
// List doctor profile change requests with status filters, search, and counts
// ---------------------------------------------------------------------------
adminDoctorChangesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const statusParam = (req.query.status as string | undefined)?.toUpperCase();
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (statusParam && ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(statusParam)) {
      where.status = statusParam;
    }

    if (search) {
      where.OR = [
        { doctor: { fullName: { contains: search, mode: "insensitive" } } },
        { doctor: { user: { email: { contains: search, mode: "insensitive" } } } },
        { doctor: { user: { mobileE164: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [totalMatching, requests, countsByStatus] = await Promise.all([
      prisma.doctorProfileChangeRequest.count({ where }),
      prisma.doctorProfileChangeRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
          doctor: {
            select: {
              id: true,
              fullName: true,
              jobTitle: true,
              user: { select: { email: true, mobileE164: true, status: true } },
            },
          },
          reviewedBy: {
            select: { id: true, displayName: true, email: true },
          },
        },
      }),
      prisma.doctorProfileChangeRequest.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
      ALL: 0,
    };

    let totalAll = 0;
    for (const c of countsByStatus) {
      statusCounts[c.status] = c._count.id;
      totalAll += c._count.id;
    }
    statusCounts.ALL = totalAll;

    const formatted = requests.map((r) => {
      const cur = (r.currentValues as Record<string, any>) || {};
      const prop = (r.proposedValues as Record<string, any>) || {};

      let changedCount = 0;
      for (const key of Object.keys(prop)) {
        if (key.endsWith("Name") || key.endsWith("Url") || key.endsWith("Display")) continue;
        if (JSON.stringify(cur[key]) !== JSON.stringify(prop[key])) {
          changedCount++;
        }
      }

      return {
        id: r.id,
        doctorId: r.doctorId,
        doctorName: r.doctor.fullName,
        jobTitle: r.doctor.jobTitle ?? "Medical Specialist",
        email: r.doctor.user?.email ?? "",
        mobileE164: r.doctor.user?.mobileE164 ?? "",
        status: r.status,
        changedFieldCount: changedCount,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        reviewer: r.reviewedBy
          ? {
              id: r.reviewedBy.id,
              name: r.reviewedBy.displayName || r.reviewedBy.email,
              email: r.reviewedBy.email,
            }
          : null,
      };
    });

    await recordAdminIdentityRead({
      actorId: (req as any).adminUser.id,
      entityType: "DoctorProfileChangeRequest",
      entityIds: requests.map((r) => r.id),
      context: "GET /api/admin/doctor-changes",
    });

    res.json({
      status: "success",
      requests: formatted,
      counts: statusCounts,
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.ceil(totalMatching / limit),
      },
    });
  } catch (error) {
    console.error("Admin doctor changes list error:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve doctor change requests." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/doctor-changes/:id
// Returns field-by-field and repeatable list comparison for a doctor change request
// ---------------------------------------------------------------------------
adminDoctorChangesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const request = await prisma.doctorProfileChangeRequest.findUnique({
      where: { id },
      include: {
        doctor: {
          include: {
            user: { select: { id: true, email: true, mobileE164: true, status: true, role: true } },
          },
        },
        reviewedBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    if (!request) {
      res.status(404).json({ status: "error", message: "Doctor change request not found." });
      return;
    }

    const cur = (request.currentValues as Record<string, any>) || {};
    const prop = (request.proposedValues as Record<string, any>) || {};

    // Scalar fields definition
    const scalarFieldsToCompare = [
      { key: "fullName", label: "Full Name", type: "text" },
      {
        key: "photoAssetId",
        label: "Profile Photo",
        type: "image",
        curUrl: cur.photoUrl,
        propUrl: prop.photoUrl,
      },
      {
        key: "dateOfBirth",
        label: "Date of Birth",
        type: "text",
        curDisplay: cur.dateOfBirth ? new Date(cur.dateOfBirth).toISOString().split("T")[0] : "—",
        propDisplay: prop.dateOfBirth ? new Date(prop.dateOfBirth).toISOString().split("T")[0] : "—",
      },
      { key: "gender", label: "Gender", type: "enum" },
      {
        key: "nationalityId",
        label: "Nationality",
        type: "ref",
        curDisplay: cur.nationalityName,
        propDisplay: prop.nationalityName,
      },
      {
        key: "residenceCountryId",
        label: "Country of Residence",
        type: "ref",
        curDisplay: cur.residenceCountryName,
        propDisplay: prop.residenceCountryName,
      },
      { key: "mobileE164", label: "Mobile Phone (Primary Login)", type: "text" },
      { key: "email", label: "Email Address", type: "email" },
      { key: "jobTitle", label: "Job Title / Grade", type: "text" },
      {
        key: "primarySpecialtyId",
        label: "Primary Clinical Specialty",
        type: "ref",
        curDisplay: cur.primarySpecialtyName,
        propDisplay: prop.primarySpecialtyName,
      },
      { key: "about", label: "Professional Summary / Bio", type: "textarea" },
      { key: "yearsOfExperience", label: "Years of Experience", type: "number" },
      { key: "currentPosition", label: "Current Position / Clinical Role", type: "text" },
      { key: "isAvailable", label: "Actively Available for Placement", type: "boolean" },
      {
        key: "cvAssetId",
        label: "Curriculum Vitae (CV)",
        type: "file",
        curUrl: cur.cvUrl,
        propUrl: prop.cvUrl,
        curFileName: cur.cvFileName || "Current CV.pdf",
        propFileName: prop.cvFileName || "Proposed CV.pdf",
      },
    ];

    const comparisons = scalarFieldsToCompare.map((f) => {
      const curVal = cur[f.key] !== undefined ? cur[f.key] : null;
      const propVal = prop[f.key] !== undefined ? prop[f.key] : null;
      const hasChanged = JSON.stringify(curVal) !== JSON.stringify(propVal);

      return {
        key: f.key,
        label: f.label,
        type: f.type,
        hasChanged,
        currentValue: curVal,
        proposedValue: propVal,
        currentDisplay: f.curDisplay ?? (curVal !== null && curVal !== undefined ? String(curVal) : "—"),
        proposedDisplay: f.propDisplay ?? (propVal !== null && propVal !== undefined ? String(propVal) : "—"),
        currentImageUrl: (f as any).curUrl ?? null,
        proposedImageUrl: (f as any).propUrl ?? null,
        currentFileName: (f as any).curFileName ?? null,
        proposedFileName: (f as any).propFileName ?? null,
      };
    });

    // Repeatable list comparisons
    const listComparisons = {
      preferredCountries: {
        hasChanged: JSON.stringify(cur.preferredCountryNames || []) !== JSON.stringify(prop.preferredCountryNames || []),
        current: (cur.preferredCountryNames as string[]) || [],
        proposed: (prop.preferredCountryNames as string[]) || [],
      },
      additionalSpecialties: {
        hasChanged: JSON.stringify(cur.additionalSpecialtyNames || []) !== JSON.stringify(prop.additionalSpecialtyNames || []),
        current: (cur.additionalSpecialtyNames as string[]) || [],
        proposed: (prop.additionalSpecialtyNames as string[]) || [],
      },
      educations: {
        hasChanged: JSON.stringify(cur.educations || []) !== JSON.stringify(prop.educations || []),
        current: (cur.educations as any[]) || [],
        proposed: (prop.educations as any[]) || [],
      },
      licenses: {
        hasChanged: JSON.stringify(cur.licenses || []) !== JSON.stringify(prop.licenses || []),
        current: (cur.licenses as any[]) || [],
        proposed: (prop.licenses as any[]) || [],
      },
      experiences: {
        hasChanged: JSON.stringify(cur.experiences || []) !== JSON.stringify(prop.experiences || []),
        current: (cur.experiences as any[]) || [],
        proposed: (prop.experiences as any[]) || [],
      },
      languages: {
        hasChanged: JSON.stringify(cur.languages || []) !== JSON.stringify(prop.languages || []),
        current: (cur.languages as any[]) || [],
        proposed: (prop.languages as any[]) || [],
      },
    };

    await recordAdminIdentityRead({
      actorId: (req as any).adminUser.id,
      entityType: "DoctorProfileChangeRequest",
      entityIds: [request.id],
      context: "GET /api/admin/doctor-changes/:id",
    });

    res.json({
      status: "success",
      changeRequest: {
        id: request.id,
        doctorId: request.doctorId,
        status: request.status,
        rejectionReason: request.rejectionReason,
        createdAt: request.createdAt,
        reviewedAt: request.reviewedAt,
        reviewer: request.reviewedBy
          ? {
              id: request.reviewedBy.id,
              name: request.reviewedBy.displayName || request.reviewedBy.email,
              email: request.reviewedBy.email,
            }
          : null,
        doctor: {
          id: request.doctor.id,
          fullName: request.doctor.fullName,
          jobTitle: request.doctor.jobTitle,
          email: request.doctor.user?.email ?? "",
          mobileE164: request.doctor.user?.mobileE164 ?? "",
          accountStatus: request.doctor.user?.status,
        },
        comparisons,
        listComparisons,
        currentValues: request.currentValues,
        proposedValues: request.proposedValues,
      },
    });
  } catch (error) {
    console.error("Admin doctor change detail error:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve doctor change request." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/doctor-changes/:id/approve
// Approves the change request, atomically updates live DoctorProfile and relations, logs audit
// ---------------------------------------------------------------------------
adminDoctorChangesRouter.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const changeRequest = await prisma.doctorProfileChangeRequest.findUnique({
      where: { id },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!changeRequest) {
      res.status(404).json({ status: "error", message: "Change request not found." });
      return;
    }

    if (changeRequest.status !== "PENDING") {
      res.status(400).json({
        status: "error",
        message: `Change request cannot be approved because it is already ${changeRequest.status}.`,
      });
      return;
    }

    const proposed = (changeRequest.proposedValues as Record<string, any>) || {};
    const optionalText = (value: unknown) => (value === null || value === undefined ? null : String(value).trim());

    // Execute atomic update in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Claim the request: only one reviewer can move it out of PENDING
      const claimed = await tx.doctorProfileChangeRequest.updateMany({
        where: { id: changeRequest.id, status: "PENDING" },
        data: {
          status: "APPROVED",
          reviewedById: adminUser.id,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        throw new ChangeRequestConflict("Change request was already reviewed by another administrator.");
      }

      // Parse date of birth if proposed
      let parsedDob: Date | null | undefined = undefined;
      if (proposed.dateOfBirth !== undefined) {
        if (proposed.dateOfBirth) {
          const d = new Date(proposed.dateOfBirth);
          parsedDob = isNaN(d.getTime()) ? null : d;
        } else {
          parsedDob = null;
        }
      }

      // 2. Atomically update live DoctorProfile scalar fields
      await tx.doctorProfile.update({
        where: { id: changeRequest.doctorId },
        data: {
          ...(proposed.fullName ? { fullName: String(proposed.fullName).trim() } : {}),
          ...(parsedDob !== undefined ? { dateOfBirth: parsedDob } : {}),
          ...(proposed.gender !== undefined ? { gender: proposed.gender || null } : {}),
          ...(proposed.nationalityId !== undefined ? { nationalityId: proposed.nationalityId || null } : {}),
          ...(proposed.residenceCountryId !== undefined
            ? { residenceCountryId: proposed.residenceCountryId || null }
            : {}),
          ...(proposed.photoAssetId !== undefined ? { photoId: proposed.photoAssetId || null } : {}),
          ...(proposed.cvAssetId !== undefined ? { cvId: proposed.cvAssetId || null } : {}),
          ...(proposed.jobTitle !== undefined ? { jobTitle: optionalText(proposed.jobTitle) } : {}),
          ...(proposed.primarySpecialtyId !== undefined
            ? { primarySpecialtyId: proposed.primarySpecialtyId || null }
            : {}),
          ...(proposed.about !== undefined ? { about: optionalText(proposed.about) } : {}),
          ...(proposed.yearsOfExperience !== undefined
            ? { yearsOfExperience: Number(proposed.yearsOfExperience) || 0 }
            : {}),
          ...(proposed.currentPosition !== undefined
            ? { currentPosition: optionalText(proposed.currentPosition) }
            : {}),
          ...(proposed.isAvailable !== undefined ? { isAvailable: Boolean(proposed.isAvailable) } : {}),
        },
      });

      // 3. Update User record (displayName, email, mobileE164) if changed
      const userUpdateData: any = {};
      if (proposed.fullName) {
        userUpdateData.displayName = String(proposed.fullName).trim();
      }
      // Email is optional for doctors: a proposed null clears it. Never skip a conflicting
      // change silently; fail the approval so the admin sees why.
      const proposedEmail =
        proposed.email === undefined ? undefined : proposed.email ? String(proposed.email).trim().toLowerCase() : null;
      if (proposedEmail !== undefined && proposedEmail !== changeRequest.doctor.user.email) {
        if (proposedEmail) {
          const existingEmail = await tx.user.findFirst({
            where: { email: proposedEmail, id: { not: changeRequest.doctor.userId } },
          });
          if (existingEmail) {
            throw new ChangeRequestConflict("The proposed email address is already used by another account.");
          }
        }
        userUpdateData.email = proposedEmail;
      }
      if (proposed.mobileE164 && proposed.mobileE164 !== changeRequest.doctor.user.mobileE164) {
        const existingPhone = await tx.user.findFirst({
          where: { mobileE164: proposed.mobileE164.trim(), id: { not: changeRequest.doctor.userId } },
        });
        if (existingPhone) {
          throw new ChangeRequestConflict("The proposed mobile number is already used by another account.");
        }
        userUpdateData.mobileE164 = proposed.mobileE164.trim();
      }
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: changeRequest.doctor.userId },
          data: userUpdateData,
        });
      }

      // 4. Update Preferred Countries (many-to-many)
      if (Array.isArray(proposed.preferredCountryIds)) {
        await tx.doctorProfile.update({
          where: { id: changeRequest.doctorId },
          data: {
            preferredCountries: {
              set: proposed.preferredCountryIds.map((cid: string) => ({ id: cid })),
            },
          },
        });
      }

      // 5. Update Additional Specialties (many-to-many)
      if (Array.isArray(proposed.additionalSpecialtyIds)) {
        await tx.doctorProfile.update({
          where: { id: changeRequest.doctorId },
          data: {
            additionalSpecialties: {
              set: proposed.additionalSpecialtyIds.map((sid: string) => ({ id: sid })),
            },
          },
        });
      }

      // 6. Update Educations
      if (Array.isArray(proposed.educations)) {
        await tx.doctorEducation.deleteMany({
          where: { doctorId: changeRequest.doctorId },
        });
        for (let i = 0; i < proposed.educations.length; i++) {
          const edu = proposed.educations[i];
          if (edu && edu.degree && edu.institution) {
            await tx.doctorEducation.create({
              data: {
                doctorId: changeRequest.doctorId,
                degree: String(edu.degree).trim(),
                institution: String(edu.institution).trim(),
                graduationYear: edu.graduationYear ? parseInt(String(edu.graduationYear), 10) || null : null,
                isPrimary: Boolean(edu.isPrimary || i === 0),
                sortOrder: i,
              },
            });
          }
        }
      }

      // 7. Update Licenses
      if (Array.isArray(proposed.licenses)) {
        await tx.doctorLicense.deleteMany({
          where: { doctorId: changeRequest.doctorId },
        });
        for (let i = 0; i < proposed.licenses.length; i++) {
          const lic = proposed.licenses[i];
          if (lic && lic.licenseType && lic.registrationNumber && lic.issuingAuthority) {
            let licExp: Date | null = null;
            if (lic.expiryDate) {
              const parsed = new Date(lic.expiryDate);
              if (!isNaN(parsed.getTime())) licExp = parsed;
            }
            await tx.doctorLicense.create({
              data: {
                doctorId: changeRequest.doctorId,
                licenseType: String(lic.licenseType).trim(),
                registrationNumber: String(lic.registrationNumber).trim(),
                issuingAuthority: String(lic.issuingAuthority).trim(),
                expiryDate: licExp,
              },
            });
          }
        }
      }

      // 8. Update Experiences
      if (Array.isArray(proposed.experiences)) {
        await tx.doctorExperience.deleteMany({
          where: { doctorId: changeRequest.doctorId },
        });
        for (let i = 0; i < proposed.experiences.length; i++) {
          const exp = proposed.experiences[i];
          if (exp && exp.organization && exp.position) {
            let startDate = new Date();
            if (exp.startDate) {
              const parsed = new Date(exp.startDate);
              if (!isNaN(parsed.getTime())) startDate = parsed;
            }
            let endDate: Date | null = null;
            if (exp.endDate) {
              const parsed = new Date(exp.endDate);
              if (!isNaN(parsed.getTime())) endDate = parsed;
            }
            await tx.doctorExperience.create({
              data: {
                doctorId: changeRequest.doctorId,
                organization: String(exp.organization).trim(),
                position: String(exp.position).trim(),
                startDate,
                endDate,
                responsibilities: exp.responsibilities ? String(exp.responsibilities).trim() : null,
                sortOrder: i,
              },
            });
          }
        }
      }

      // 9. Update Languages
      if (Array.isArray(proposed.languages)) {
        await tx.doctorLanguage.deleteMany({
          where: { doctorId: changeRequest.doctorId },
        });
        for (let i = 0; i < proposed.languages.length; i++) {
          const lang = proposed.languages[i];
          if (lang && lang.language) {
            await tx.doctorLanguage.create({
              data: {
                doctorId: changeRequest.doctorId,
                language: String(lang.language).trim(),
                proficiency: lang.proficiency || "PROFESSIONAL",
              },
            });
          }
        }
      }

      // 10. Record decision in AuditLog
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "DOCTOR_PROFILE_CHANGE_APPROVED",
          entityType: "DoctorProfileChangeRequest",
          entityId: changeRequest.id,
          metadata: {
            doctorId: changeRequest.doctorId,
            doctorName: proposed.fullName ?? changeRequest.doctor.fullName,
            appliedValues: proposed,
          },
        },
      });

      // 11. Create Notification for doctor user
      await tx.notification.create({
        data: {
          userId: changeRequest.doctor.userId,
          type: "ACCOUNT_STATUS",
          data: {
            title: "Profile Changes Approved",
            body: "Your profile change request has been reviewed and approved by the platform administration. All changes are now live on your credentials.",
            changeRequestId: changeRequest.id,
          },
        },
      });
    });

    res.json({
      status: "success",
      message: "Doctor profile changes approved successfully and applied live.",
    });
  } catch (error) {
    if (error instanceof ChangeRequestConflict) {
      res.status(409).json({ status: "error", code: "CHANGE_REQUEST_CONFLICT", message: error.message });
      return;
    }
    console.error("Admin approve doctor changes error:", error);
    res.status(500).json({ status: "error", message: "Failed to approve doctor change request." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/doctor-changes/:id/reject
// Declines the change request with required reason, keeps live profile unchanged, logs audit
// ---------------------------------------------------------------------------
adminDoctorChangesRouter.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { reason } = req.body ?? {};

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      res.status(400).json({
        status: "error",
        message: "A specific rejection reason is required to decline a doctor profile change request.",
      });
      return;
    }

    const changeRequest = await prisma.doctorProfileChangeRequest.findUnique({
      where: { id },
      include: {
        doctor: { select: { id: true, userId: true, fullName: true } },
      },
    });

    if (!changeRequest) {
      res.status(404).json({ status: "error", message: "Change request not found." });
      return;
    }

    if (changeRequest.status !== "PENDING") {
      res.status(400).json({
        status: "error",
        message: `Change request cannot be rejected because it is already ${changeRequest.status}.`,
      });
      return;
    }

    // Execute rejection in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark change request as REJECTED (only if still PENDING)
      const claimed = await tx.doctorProfileChangeRequest.updateMany({
        where: { id: changeRequest.id, status: "PENDING" },
        data: {
          status: "REJECTED",
          rejectionReason: reason.trim(),
          reviewedById: adminUser.id,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        throw new ChangeRequestConflict("Change request was already reviewed by another administrator.");
      }

      // 2. Record decision in AuditLog
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "DOCTOR_PROFILE_CHANGE_REJECTED",
          entityType: "DoctorProfileChangeRequest",
          entityId: changeRequest.id,
          metadata: {
            doctorId: changeRequest.doctorId,
            doctorName: changeRequest.doctor.fullName,
            rejectionReason: reason.trim(),
          },
        },
      });

      // 3. Create Notification for doctor user
      await tx.notification.create({
        data: {
          userId: changeRequest.doctor.userId,
          type: "ACCOUNT_STATUS",
          data: {
            title: "Profile Change Request Declined",
            body: `Your profile change request was reviewed and declined by the platform administration: "${reason.trim()}". Your existing approved live profile remains active.`,
            changeRequestId: changeRequest.id,
            rejectionReason: reason.trim(),
          },
        },
      });
    });

    res.json({
      status: "success",
      message: "Doctor profile change request rejected. Live profile remains unchanged.",
    });
  } catch (error) {
    if (error instanceof ChangeRequestConflict) {
      res.status(409).json({ status: "error", code: "CHANGE_REQUEST_CONFLICT", message: error.message });
      return;
    }
    console.error("Admin reject doctor changes error:", error);
    res.status(500).json({ status: "error", message: "Failed to reject doctor change request." });
  }
});
