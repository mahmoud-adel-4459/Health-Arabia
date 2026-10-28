import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { requirePlatformAdmin } from "./admin-accounts";

export const adminFacilityChangesRouter = Router();

// Apply platform admin authorization guard
adminFacilityChangesRouter.use(requirePlatformAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/facility-changes
// List facility profile change requests with status filters, search, and counts
// ---------------------------------------------------------------------------
adminFacilityChangesRouter.get("/", async (req: Request, res: Response) => {
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
        { facility: { name: { contains: search, mode: "insensitive" } } },
        { facility: { officerName: { contains: search, mode: "insensitive" } } },
        { facility: { user: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [totalMatching, requests, countsByStatus] = await Promise.all([
      prisma.facilityProfileChangeRequest.count({ where }),
      prisma.facilityProfileChangeRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
          facility: {
            select: {
              id: true,
              name: true,
              officerName: true,
              user: { select: { email: true } },
            },
          },
          reviewedBy: {
            select: { id: true, displayName: true, email: true },
          },
        },
      }),
      prisma.facilityProfileChangeRequest.groupBy({
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

      // Count changed fields
      let changedCount = 0;
      for (const key of Object.keys(prop)) {
        if (key === "logoUrl" || key === "countryName" || key === "cityName") continue;
        if (JSON.stringify(cur[key]) !== JSON.stringify(prop[key])) {
          changedCount++;
        }
      }

      return {
        id: r.id,
        facilityId: r.facilityId,
        facilityName: r.facility.name,
        officerName: r.facility.officerName,
        officerEmail: r.facility.user?.email ?? "",
        status: r.status,
        changedFieldCount: changedCount,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        reviewer: r.reviewedBy
          ? {
              id: r.reviewedBy.id,
              name: r.reviewedBy.displayName || r.reviewedBy.email,
            }
          : null,
      };
    });

    res.json({
      status: "success",
      data: formatted,
      meta: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.ceil(totalMatching / limit) || 1,
        counts: statusCounts,
      },
    });
  } catch (error) {
    console.error("Admin facility changes list error:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve facility change requests." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/facility-changes/:id
// Get single change request with full field-by-field diff comparison data
// ---------------------------------------------------------------------------
adminFacilityChangesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const request = await prisma.facilityProfileChangeRequest.findUnique({
      where: { id },
      include: {
        facility: {
          include: {
            user: { select: { id: true, email: true, status: true } },
            logo: true,
            country: true,
            city: true,
          },
        },
        reviewedBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    if (!request) {
      res.status(404).json({ status: "error", message: "Facility change request not found." });
      return;
    }

    const cur = (request.currentValues as Record<string, any>) || {};
    const prop = (request.proposedValues as Record<string, any>) || {};

    // Definition of editable fields to compare
    const fieldsToCompare = [
      { key: "name", label: "Hospital / Facility Name", type: "text" },
      { key: "logoId", label: "Facility Logo", type: "image", curUrl: cur.logoUrl, propUrl: prop.logoUrl },
      { key: "type", label: "Facility Type", type: "enum" },
      { key: "description", label: "Description & Overview", type: "textarea" },
      { key: "countryId", label: "Country", type: "ref", curDisplay: cur.countryName, propDisplay: prop.countryName },
      { key: "cityId", label: "City", type: "ref", curDisplay: cur.cityName, propDisplay: prop.cityName },
      { key: "address", label: "Physical Address", type: "text" },
      { key: "locationUrl", label: "Location / Map URL", type: "url" },
      { key: "employeeCount", label: "Employee / Bed Count", type: "number" },
      { key: "hospitalEmail", label: "Official Hospital Email", type: "email" },
      { key: "officerName", label: "Recruitment Officer Name", type: "text" },
      {
        key: "officerPhone",
        label: "Officer Phone Number",
        type: "text",
        curDisplay: `${cur.officerPhoneCountryCode ?? ""} ${cur.officerPhone ?? ""}`.trim(),
        propDisplay: `${prop.officerPhoneCountryCode ?? ""} ${prop.officerPhone ?? ""}`.trim(),
      },
    ];

    const comparisons = fieldsToCompare.map((f) => {
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
      };
    });

    res.json({
      status: "success",
      changeRequest: {
        id: request.id,
        facilityId: request.facilityId,
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
        facility: {
          id: request.facility.id,
          name: request.facility.name,
          currentOfficerName: request.facility.officerName,
          officerEmail: request.facility.user?.email ?? "",
          accountStatus: request.facility.user?.status,
        },
        comparisons,
        currentValues: request.currentValues,
        proposedValues: request.proposedValues,
      },
    });
  } catch (error) {
    console.error("Admin facility change detail error:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve facility change request." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/facility-changes/:id/approve
// Approves the change request, atomically updates live Facility, logs audit
// ---------------------------------------------------------------------------
adminFacilityChangesRouter.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const changeRequest = await prisma.facilityProfileChangeRequest.findUnique({
      where: { id },
      include: { facility: true },
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

    // Execute atomic update in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark change request as APPROVED
      await tx.facilityProfileChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: "APPROVED",
          reviewedById: adminUser.id,
          reviewedAt: new Date(),
        },
      });

      // 2. Atomically update live Facility record
      await tx.facility.update({
        where: { id: changeRequest.facilityId },
        data: {
          ...(proposed.name ? { name: String(proposed.name).trim() } : {}),
          ...(proposed.type ? { type: proposed.type } : {}),
          ...(proposed.description !== undefined ? { description: String(proposed.description).trim() } : {}),
          ...(proposed.countryId ? { countryId: String(proposed.countryId) } : {}),
          ...(proposed.cityId ? { cityId: String(proposed.cityId) } : {}),
          ...(proposed.address !== undefined ? { address: String(proposed.address).trim() } : {}),
          ...(proposed.locationUrl !== undefined ? { locationUrl: String(proposed.locationUrl).trim() } : {}),
          ...(proposed.employeeCount !== undefined ? { employeeCount: Number(proposed.employeeCount) } : {}),
          ...(proposed.hospitalEmail !== undefined ? { hospitalEmail: String(proposed.hospitalEmail).trim() } : {}),
          ...(proposed.officerName ? { officerName: String(proposed.officerName).trim() } : {}),
          ...(proposed.officerPhoneCountryCode !== undefined
            ? { officerPhoneCountryCode: String(proposed.officerPhoneCountryCode).trim() }
            : {}),
          ...(proposed.officerPhone !== undefined ? { officerPhone: String(proposed.officerPhone).trim() } : {}),
          ...(proposed.logoId !== undefined ? { logoId: proposed.logoId || null } : {}),
        },
      });

      // 3. Record decision in AuditLog
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "FACILITY_PROFILE_CHANGE_APPROVED",
          entityType: "FacilityProfileChangeRequest",
          entityId: changeRequest.id,
          metadata: {
            facilityId: changeRequest.facilityId,
            facilityName: proposed.name ?? changeRequest.facility.name,
            appliedValues: proposed,
          },
        },
      });

      // 4. Create Notification for facility account user
      if (changeRequest.facility.userId) {
        await tx.notification.create({
          data: {
            userId: changeRequest.facility.userId,
            type: "ACCOUNT_STATUS",
            data: {
              title: "Facility Profile Changes Approved",
              body: "Your proposed profile changes have been approved by platform administration and are now live.",
              requestId: changeRequest.id,
            },
          },
        });
      }
    });

    res.json({
      status: "success",
      message: "Facility profile change request approved successfully. Changes are now live.",
    });
  } catch (error) {
    console.error("Admin approve facility change error:", error);
    res.status(500).json({ status: "error", message: "Failed to approve facility profile change request." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/facility-changes/:id/reject
// Rejects the change request, records rejectionReason, leaves Facility unchanged, logs audit
// ---------------------------------------------------------------------------
adminFacilityChangesRouter.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { rejectionReason } = req.body ?? {};

    if (!rejectionReason || typeof rejectionReason !== "string" || !rejectionReason.trim()) {
      res.status(400).json({
        status: "error",
        message: "A clear rejection reason is mandatory when rejecting a profile change request.",
      });
      return;
    }

    const changeRequest = await prisma.facilityProfileChangeRequest.findUnique({
      where: { id },
      include: { facility: true },
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
      // 1. Update change request to REJECTED with rejectionReason
      // STRICT RULE: Live Facility record is completely untouched!
      await tx.facilityProfileChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason.trim(),
          reviewedById: adminUser.id,
          reviewedAt: new Date(),
        },
      });

      // 2. Record decision in AuditLog
      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "FACILITY_PROFILE_CHANGE_REJECTED",
          entityType: "FacilityProfileChangeRequest",
          entityId: changeRequest.id,
          metadata: {
            facilityId: changeRequest.facilityId,
            facilityName: changeRequest.facility.name,
            rejectionReason: rejectionReason.trim(),
          },
        },
      });

      // 3. Create Notification for facility account user
      if (changeRequest.facility.userId) {
        await tx.notification.create({
          data: {
            userId: changeRequest.facility.userId,
            type: "ACCOUNT_STATUS",
            data: {
              title: "Facility Profile Changes Declined",
              body: `Your proposed profile changes were declined: ${rejectionReason.trim()}`,
              requestId: changeRequest.id,
            },
          },
        });
      }
    });

    res.json({
      status: "success",
      message: "Facility profile change request rejected. Live profile remains unchanged.",
    });
  } catch (error) {
    console.error("Admin reject facility change error:", error);
    res.status(500).json({ status: "error", message: "Failed to reject facility profile change request." });
  }
});
