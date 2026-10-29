import { Router, type Request, type Response } from "express";
import type { AccountDeletionStatus } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { recordAdminIdentityRead } from "../lib/admin-audit";
import { requirePlatformAdmin } from "./admin-accounts";

// Account-deletion requests raised by doctors and facilities. Completing one DEACTIVATES the account
// (the existing final lifecycle state); nothing is hard-deleted and all history is preserved.
export const adminDeletionRequestsRouter = Router();
adminDeletionRequestsRouter.use(requirePlatformAdmin);

const STATUSES: AccountDeletionStatus[] = ["REQUESTED", "IN_REVIEW", "COMPLETED", "REJECTED", "CANCELLED"];
// Valid transitions only. CANCELLED is final and is not set by any admin action.
const FROM: Record<"review" | "reject" | "complete", AccountDeletionStatus[]> = {
  review: ["REQUESTED"],
  reject: ["REQUESTED", "IN_REVIEW"],
  complete: ["IN_REVIEW"],
};
const nextActions = (status: AccountDeletionStatus) => (Object.keys(FROM) as (keyof typeof FROM)[]).filter((a) => FROM[a].includes(status));

class Conflict extends Error {}

const accountName = (u: { displayName: string | null; email: string | null; doctorProfile: { fullName: string } | null; facility: { name: string } | null }) =>
  u.facility?.name ?? u.doctorProfile?.fullName ?? u.displayName ?? u.email ?? "Account";

const userSelect = {
  id: true, role: true, status: true, displayName: true, email: true, mobileE164: true, createdAt: true, deactivatedAt: true,
  doctorProfile: { select: { fullName: true } },
  facility: { select: { name: true } },
} as const;

adminDeletionRequestsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status ?? "").toUpperCase() as AccountDeletionStatus;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = 20;
    const like = { contains: search, mode: "insensitive" as const };
    const where = {
      ...(STATUSES.includes(status) ? { status } : {}),
      ...(search ? { user: { OR: [{ email: like }, { displayName: like }, { facility: { name: like } }, { doctorProfile: { fullName: like } }] } } : {}),
    };
    const [rows, total, grouped] = await Promise.all([
      prisma.accountDeletionRequest.findMany({ where, orderBy: { requestedAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { user: { select: userSelect } } }),
      prisma.accountDeletionRequest.count({ where }),
      prisma.accountDeletionRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const counts: Record<string, number> = { ALL: 0 };
    for (const g of grouped) { counts[g.status] = g._count._all; counts.ALL += g._count._all; }

    await recordAdminIdentityRead({ actorId: (req as any).adminUser.id, entityType: "User", entityIds: rows.filter((r) => r.user.role === "DOCTOR").map((r) => r.userId), context: "GET /api/admin/deletion-requests" });

    res.json({
      status: "success",
      items: rows.map((r) => ({
        id: r.id, status: r.status, reason: r.reason, requestedAt: r.requestedAt, processedAt: r.processedAt,
        account: { id: r.user.id, role: r.user.role, status: r.user.status, name: accountName(r.user), email: r.user.email },
        nextActions: nextActions(r.status),
      })),
      meta: { total, page, totalPages: Math.ceil(total / limit) || 1, counts },
    });
  } catch (error) {
    console.error("Admin deletion requests list error:", error);
    res.status(500).json({ status: "error", message: "Failed to load deletion requests." });
  }
});

adminDeletionRequestsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const r = await prisma.accountDeletionRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { user: { select: userSelect }, processedBy: { select: { displayName: true, email: true } } },
    });
    if (!r) { res.status(404).json({ status: "error", message: "Deletion request not found.", code: "NOT_FOUND" }); return; }
    const uid = r.userId;
    const [applications, hireRequestItems, conversations, messages, jobs, history] = await Promise.all([
      prisma.application.count({ where: { doctor: { userId: uid } } }),
      prisma.hireRequestItem.count({ where: { OR: [{ application: { doctor: { userId: uid } } }, { hireRequest: { facility: { userId: uid } } }] } }),
      prisma.conversationParticipant.count({ where: { userId: uid } }),
      prisma.message.count({ where: { senderId: uid } }),
      prisma.job.count({ where: { facility: { userId: uid } } }),
      prisma.auditLog.findMany({ where: { entityType: "AccountDeletionRequest", entityId: r.id }, orderBy: { createdAt: "asc" }, include: { actor: { select: { displayName: true, email: true } } } }),
    ]);
    if (r.user.role === "DOCTOR") await recordAdminIdentityRead({ actorId: (req as any).adminUser.id, entityType: "User", entityIds: [uid], context: "GET /api/admin/deletion-requests/:id" });
    res.json({
      status: "success",
      request: {
        id: r.id, status: r.status, reason: r.reason, requestedAt: r.requestedAt, processedAt: r.processedAt, resolutionNote: r.resolutionNote,
        processedBy: r.processedBy ? (r.processedBy.displayName ?? r.processedBy.email) : null,
        nextActions: nextActions(r.status),
        account: { id: r.user.id, role: r.user.role, status: r.user.status, name: accountName(r.user), email: r.user.email, mobile: r.user.mobileE164, createdAt: r.user.createdAt, deactivatedAt: r.user.deactivatedAt },
        preserved: { applications, hireRequestItems, conversations, messages, jobs },
        history: history.map((h) => ({ action: h.action, at: h.createdAt, actor: h.actor ? (h.actor.displayName ?? h.actor.email) : "System", reason: (h.metadata as any)?.reason ?? null })),
      },
    });
  } catch (error) {
    console.error("Admin deletion request detail error:", error);
    res.status(500).json({ status: "error", message: "Failed to load the deletion request." });
  }
});

const ACTIONS = {
  review: { to: "IN_REVIEW", audit: "ACCOUNT_DELETION_REVIEW_STARTED", needsReason: false, title: "Account closure request is being reviewed", body: "Our team has started reviewing your account closure request." },
  reject: { to: "REJECTED", audit: "ACCOUNT_DELETION_REJECTED", needsReason: true, title: "Account closure request declined", body: "Your account closure request was declined. Your account remains active." },
  complete: { to: "COMPLETED", audit: "ACCOUNT_DELETION_COMPLETED", needsReason: false, title: "Account closed", body: "Your account closure request was completed and the account is now deactivated." },
} as const;

for (const action of Object.keys(ACTIONS) as (keyof typeof ACTIONS)[]) {
  adminDeletionRequestsRouter.post(`/:id/${action}`, async (req: Request, res: Response) => {
    const cfg = ACTIONS[action];
    try {
      const id = String(req.params.id);
      const admin = (req as any).adminUser;
      const raw = req.body?.reason ?? req.body?.note;
      const text = typeof raw === "string" ? raw.trim().slice(0, 2000) : "";
      if (cfg.needsReason && text.length < 3) {
        res.status(400).json({ status: "error", message: "A reason of at least 3 characters is required to decline the request.", code: "MISSING_REASON", field: "reason" });
        return;
      }
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.accountDeletionRequest.findUnique({ where: { id }, include: { user: { select: { id: true, role: true, status: true } } } });
        if (!existing) throw Object.assign(new Error("Deletion request not found."), { statusCode: 404, code: "NOT_FOUND" });
        if (!FROM[action].includes(existing.status)) {
          throw Object.assign(new Error(`A request that is ${existing.status.toLowerCase().replace("_", " ")} cannot be moved this way.`), { statusCode: 409, code: "INVALID_TRANSITION" });
        }
        if (action === "complete" && (existing.user.role === "PLATFORM_ADMIN" || existing.user.status === "DEACTIVATED")) {
          throw Object.assign(new Error("This account cannot be deactivated through a deletion request."), { statusCode: 409, code: "INVALID_ACCOUNT" });
        }
        const claimed = await tx.accountDeletionRequest.updateMany({
          where: { id, status: { in: FROM[action] } },
          data: {
            status: cfg.to,
            ...(action === "review" ? {} : { processedById: admin.id, processedAt: new Date(), resolutionNote: text || null }),
          },
        });
        if (claimed.count !== 1) throw new Conflict();
        // COMPLETED: the database trigger sets the user DEACTIVATED (final); revoke sessions and unlist here as well so it never depends on that alone.
        if (action === "complete") {
          await tx.session.updateMany({ where: { userId: existing.userId, revokedAt: null }, data: { revokedAt: new Date() } });
          await tx.facility.updateMany({ where: { userId: existing.userId, isListedPublicly: true }, data: { isListedPublicly: false } });
        }
        await tx.auditLog.create({
          data: {
            actorId: admin.id, action: cfg.audit, entityType: "AccountDeletionRequest", entityId: id,
            metadata: { requestId: id, accountId: existing.userId, previousStatus: existing.status, newStatus: cfg.to, ...(text ? { reason: text } : {}) },
          },
        });
        // No names, contact data or reasons in the notification
        await tx.notification.create({ data: { userId: existing.userId, type: "ACCOUNT_STATUS", data: { title: cfg.title, body: cfg.body, requestId: id, status: cfg.to } } });
        return { id, status: cfg.to };
      });
      res.json({ status: "success", message: `Request moved to ${cfg.to.toLowerCase().replace("_", " ")}.`, request: result });
    } catch (error: any) {
      if (error instanceof Conflict) { res.status(409).json({ status: "error", message: "The request changed while you were working. Reload and try again.", code: "INVALID_TRANSITION" }); return; }
      if (error?.statusCode) { res.status(error.statusCode).json({ status: "error", message: error.message, code: error.code }); return; }
      console.error("Deletion request action error:", error);
      res.status(500).json({ status: "error", message: "Failed to update the deletion request." });
    }
  });
}
