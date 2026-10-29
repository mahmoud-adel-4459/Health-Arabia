// Shared display helpers for the Admin dashboard: dates and human-readable status wording.

export const EMPTY = "—";

const toDate = (value: string | number | Date | null | undefined): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "12 Oct 2026", or an em dash when the value is missing or not a valid date. */
export function formatDate(value: string | number | Date | null | undefined, fallback = EMPTY): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : fallback;
}

/** "12 Oct 2026, 14:05", or an em dash when the value is missing or not a valid date. */
export function formatDateTime(value: string | number | Date | null | undefined, fallback = EMPTY): string {
  const d = toDate(value);
  return d ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : fallback;
}

export const orDash = (value: string | number | null | undefined) => (value === null || value === undefined || value === "" ? EMPTY : String(value));

export const humanize = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";
export interface Labeled { label: string; tone: Tone }

export const REQUEST_STATUS: Record<string, Labeled> = {
  SUBMITTED: { label: "Submitted", tone: "warning" },
  IN_COORDINATION: { label: "In coordination", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const ITEM_STATUS: Record<string, Labeled> = {
  REQUESTED: { label: "Requested", tone: "warning" },
  IN_COORDINATION: { label: "In coordination", tone: "info" },
  AGREED: { label: "Agreed", tone: "info" },
  HIRED: { label: "Hired", tone: "success" },
  REJECTED: { label: "Not selected", tone: "neutral" },
  WITHDRAWN: { label: "Withdrawn", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const CONSENT_STATUS: Record<string, Labeled> = {
  PENDING: { label: "Waiting for doctor", tone: "warning" },
  GRANTED: { label: "Doctor agreed", tone: "success" },
  DECLINED: { label: "Doctor declined", tone: "danger" },
  REVOKED: { label: "Doctor withdrew consent", tone: "danger" },
};

export const RELEASE_STATUS: Record<string, Labeled> = {
  PENDING: { label: "Not released", tone: "neutral" },
  APPROVED: { label: "Identity released", tone: "success" },
  REJECTED: { label: "Release declined", tone: "danger" },
  REVOKED: { label: "Release revoked", tone: "danger" },
};

export const CONTACT_STATUS: Record<string, Labeled> = {
  NEW: { label: "New", tone: "warning" },
  IN_REVIEW: { label: "In review", tone: "info" },
  RESOLVED: { label: "Resolved", tone: "success" },
  SPAM: { label: "Spam", tone: "neutral" },
};

export const HISTORY_ACTION: Record<string, string> = {
  DOCTOR_CONSENT_GRANTED: "Doctor agreed to share their identity",
  DOCTOR_CONSENT_DECLINED: "Doctor declined to share their identity",
  DOCTOR_CONSENT_REVOKED: "Doctor withdrew consent",
  IDENTITY_RELEASE_APPROVED: "Identity release approved",
  IDENTITY_RELEASE_REJECTED: "Identity release declined",
  IDENTITY_RELEASE_REVOKED: "Identity release revoked",
  PLACEMENT_COMPLETED: "Placement completed",
};

export type NextActionKind = "decide" | "complete" | "wait" | "done" | "none";
export interface NextAction { kind: NextActionKind; text: string; tone: Tone }

interface ItemLike {
  status: string;
  identityRelease: { status: string; doctorConsentStatus: string; conversationId?: string | null; conversation?: { id: string } | null } | null;
}

/** The single next step for one applicant, following the platform's existing lifecycle rules. */
export function nextAction(item: ItemLike): NextAction {
  const r = item.identityRelease;
  if (item.status === "HIRED") return { kind: "done", text: "Placement completed", tone: "success" };
  if (["REJECTED", "WITHDRAWN", "CANCELLED"].includes(item.status)) return { kind: "done", text: "Closed — no further action", tone: "neutral" };
  if (!r) return { kind: "none", text: "No identity release started", tone: "neutral" };
  const hasChat = !!(r.conversationId ?? r.conversation?.id);
  if (r.status === "PENDING" && r.doctorConsentStatus === "PENDING") return { kind: "wait", text: "Waiting for the doctor to respond", tone: "warning" };
  if (r.status === "PENDING" && r.doctorConsentStatus === "GRANTED") return { kind: "decide", text: "Your decision: approve or decline the identity release", tone: "warning" };
  if (r.status === "PENDING") return { kind: "done", text: "Doctor did not agree — identity cannot be released", tone: "danger" };
  if (r.status === "APPROVED" && r.doctorConsentStatus === "GRANTED" && item.status === "AGREED" && hasChat) return { kind: "complete", text: "Ready to complete the placement", tone: "success" };
  if (r.status === "APPROVED") return { kind: "wait", text: "Identity released — the facility and doctor are coordinating", tone: "info" };
  if (r.status === "REJECTED") return { kind: "done", text: "Identity release was declined", tone: "neutral" };
  return { kind: "done", text: "Identity release was revoked", tone: "neutral" };
}
