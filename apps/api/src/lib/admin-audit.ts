import { prisma } from "./prisma";

// Records that a platform admin successfully read doctor identity/contact data.
// One append-only AuditLog row per read, holding record references only (never names, emails, phones, or documents).
// A logging failure is reported but does not fail the admin request that already succeeded.
export async function recordAdminIdentityRead(args: {
  actorId: string;
  entityType: "User" | "Application" | "HireRequest" | "DoctorProfileChangeRequest";
  entityIds: string[];
  context: string; // endpoint, e.g. "GET /api/admin/applications"
}): Promise<void> {
  const ids = Array.from(new Set(args.entityIds.filter(Boolean)));
  if (ids.length === 0) return;
  try {
    await prisma.auditLog.create({
      data: {
        actorId: args.actorId,
        action: "ADMIN_VIEWED_DOCTOR_IDENTITY",
        entityType: args.entityType,
        // Single record: its id. Several records (list pages): "batch", with every id in metadata.
        entityId: ids.length === 1 ? ids[0] : "batch",
        metadata: { context: args.context, entityIds: ids, count: ids.length },
      },
    });
  } catch (error) {
    console.error("Failed to record admin identity read:", error);
  }
}

// Records a platform content / reference-data change: which record, by whom (actor), and which fields changed.
// Field names and simple flags only; long texts are not copied into the audit log.
export async function recordAdminContentChange(
  tx: { auditLog: { create: (args: any) => Promise<unknown> } },
  args: { actorId: string; action: string; entityType: string; entityId: string; changedFields: string[]; extra?: Record<string, unknown> }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: args.actorId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      metadata: { changedFields: args.changedFields, ...(args.extra ?? {}) },
    },
  });
}
