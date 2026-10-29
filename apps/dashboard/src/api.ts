import type {
  AccountDetail,
  AdminUser,
  ReviewQueueAccount,
  ReviewQueueMeta,
  FacilityChangeDetail,
  FacilityChangeQueueItem,
  FacilityChangeQueueMeta,
  DoctorChangeDetail,
  DoctorChangeQueueItem,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
// Authentication is the API's HttpOnly admin session cookie (sent via credentials: "include").
// No token is ever read, stored or sent from JavaScript.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    (error as any).status = response.status;
    (error as any).code = data?.code;
    (error as any).field = data?.field;
    throw error;
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function loginAdmin(email: string, password: string): Promise<AdminUser> {
  const data = await request<{
    status: string;
    user: AdminUser;
  }>("/auth/login/admin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return data.user;
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const data = await request<{ status: string; user: AdminUser | null }>("/auth/me?scope=admin");
    return data.user?.role === "PLATFORM_ADMIN" ? data.user : null;
  } catch {
    return null;
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await request("/auth/logout?scope=admin", { method: "POST" });
  } catch {}
}

// ---------------------------------------------------------------------------
// Review Queue & Account Details
// ---------------------------------------------------------------------------

export interface ReviewQueueFilters {
  role?: "ALL" | "DOCTOR" | "FACILITY";
  status?: "ALL" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | "DRAFT";
  search?: string;
  page?: number;
  limit?: number;
}

export async function getReviewAccounts(filters: ReviewQueueFilters = {}): Promise<{
  data: ReviewQueueAccount[];
  meta: ReviewQueueMeta;
}> {
  const params = new URLSearchParams();
  if (filters.role && filters.role !== "ALL") params.set("role", filters.role);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  return request<{
    status: string;
    data: ReviewQueueAccount[];
    meta: ReviewQueueMeta;
  }>(`/admin/accounts?${params.toString()}`);
}

export async function getAccountDetail(id: string): Promise<AccountDetail> {
  const res = await request<{ status: string; account: AccountDetail }>(`/admin/accounts/${id}`);
  return res.account;
}

export async function approveAccount(id: string, note?: string): Promise<void> {
  await request(`/admin/accounts/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function rejectAccount(id: string, reason: string): Promise<void> {
  await request(`/admin/accounts/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function suspendAccount(id: string, reason: string): Promise<void> {
  await request(`/admin/accounts/${id}/suspend`, { method: "POST", body: JSON.stringify({ reason }) });
}

export async function unsuspendAccount(id: string, reason: string): Promise<void> {
  await request(`/admin/accounts/${id}/unsuspend`, { method: "POST", body: JSON.stringify({ reason }) });
}

export async function getDeletionRequests(params: { status?: string; search?: string; page?: number }): Promise<import("./types").DeletionRequestsResponse> {
  const q = new URLSearchParams();
  if (params.status && params.status !== "ALL") q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  const qs = q.toString();
  return request(`/admin/deletion-requests${qs ? `?${qs}` : ""}`);
}

export async function getDeletionRequest(id: string): Promise<import("./types").DeletionRequestDetail> {
  const res = await request<{ request: import("./types").DeletionRequestDetail }>(`/admin/deletion-requests/${id}`);
  return res.request;
}

export async function decideDeletionRequest(id: string, action: "review" | "reject" | "complete", text?: string): Promise<void> {
  await request(`/admin/deletion-requests/${id}/${action}`, { method: "POST", body: JSON.stringify(action === "reject" ? { reason: text } : { note: text }) });
}

export function getFileDownloadUrl(fileId: string): string {
  return `${API_BASE}/files/${fileId}/download`;
}

// API payloads store file links as site-relative "/api/..." paths; on the dashboard origin
// those must point at the API server instead.
export function resolveApiUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/api/") ? `${API_BASE.replace(/\/api\/?$/, "")}${url}` : url;
}

// ---------------------------------------------------------------------------
// Facility Profile Changes
// ---------------------------------------------------------------------------

export interface FacilityChangeFilters {
  status?: "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  search?: string;
  page?: number;
  limit?: number;
}

export async function getFacilityChangeRequests(filters: FacilityChangeFilters = {}): Promise<{
  data: FacilityChangeQueueItem[];
  meta: FacilityChangeQueueMeta;
}> {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  return request<{
    status: string;
    data: FacilityChangeQueueItem[];
    meta: FacilityChangeQueueMeta;
  }>(`/admin/facility-changes?${params.toString()}`);
}

export async function getFacilityChangeRequestDetail(id: string): Promise<FacilityChangeDetail> {
  const res = await request<{ status: string; changeRequest: FacilityChangeDetail }>(
    `/admin/facility-changes/${id}`
  );
  return res.changeRequest;
}

export async function approveFacilityChangeRequest(id: string): Promise<void> {
  await request(`/admin/facility-changes/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectFacilityChangeRequest(id: string, rejectionReason: string): Promise<void> {
  await request(`/admin/facility-changes/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ rejectionReason }),
  });
}

// ---------------------------------------------------------------------------
// Doctor Profile Changes API
// ---------------------------------------------------------------------------

export async function getDoctorChangeRequests(query: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  requests: DoctorChangeQueueItem[];
  counts: Record<string, number>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const params = new URLSearchParams();
  if (query.status && query.status !== "ALL") params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));

  const res = await request<{
    status: string;
    requests: DoctorChangeQueueItem[];
    counts: Record<string, number>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/admin/doctor-changes?${params.toString()}`);

  return {
    requests: res.requests,
    counts: res.counts,
    pagination: res.pagination,
  };
}

export async function getDoctorChangeRequestDetail(id: string): Promise<DoctorChangeDetail> {
  const res = await request<{ status: string; changeRequest: DoctorChangeDetail }>(
    `/admin/doctor-changes/${id}`
  );
  return res.changeRequest;
}

export async function approveDoctorChangeRequest(id: string): Promise<void> {
  await request(`/admin/doctor-changes/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectDoctorChangeRequest(id: string, reason: string): Promise<void> {
  await request(`/admin/doctor-changes/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ---------------------------------------------------------------------------
// Job Submissions Moderation API
// ---------------------------------------------------------------------------

export async function getJobSubmissions(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  jobs: import("./types").JobSubmissionItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  meta: import("./types").JobQueueMeta;
}> {
  const q = new URLSearchParams();
  if (params.status && params.status !== "ALL") q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));

  const qs = q.toString();
  return request(`/admin/jobs${qs ? `?${qs}` : ""}`);
}

export async function getJobSubmissionDetail(id: string): Promise<import("./types").JobSubmissionDetail> {
  const res = await request<{ status: string; job: import("./types").JobSubmissionDetail }>(`/admin/jobs/${id}`);
  return res.job;
}

export async function requestJobChanges(id: string, reason: string): Promise<{ message: string }> {
  return request(`/admin/jobs/${id}/request-changes`, { method: "POST", body: JSON.stringify({ reason }) });
}

export async function approveJobSubmission(id: string): Promise<void> {
  await request(`/admin/jobs/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectJobSubmission(id: string, reason: string): Promise<void> {
  await request(`/admin/jobs/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ---------------------------------------------------------------------------
// Hire Requests & Identity Releases
// ---------------------------------------------------------------------------

export async function getAdminHireRequests(params: {
  status?: string;
  search?: string;
  attention?: string;
  page?: number;
  limit?: number;
}): Promise<import("./types").AdminHireRequestsResponse> {
  const q = new URLSearchParams();
  if (params.status && params.status !== "ALL") q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.attention) q.set("attention", params.attention);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));

  const qs = q.toString();
  return request(`/admin/hire-requests${qs ? `?${qs}` : ""}`);
}

export async function getAdminHireRequestDetail(id: string): Promise<import("./types").AdminHireRequestDetail> {
  const data = await request<{ hireRequest: import("./types").AdminHireRequestDetail }>(`/admin/hire-requests/${id}`);
  return data.hireRequest;
}

export async function getContactSubmission(id: string): Promise<import("./types").ContactSubmissionDetail> {
  const data = await request<{ submission: import("./types").ContactSubmissionDetail }>(`/admin/contact-submissions/${id}`);
  return data.submission;
}

// ---------------------------------------------------------------------------
// Doctor Applications (platform view: doctor identity + job + facility)
// ---------------------------------------------------------------------------

export async function getAdminApplications(params: {
  status?: string;
  search?: string;
  jobId?: string;
  facilityId?: string;
  page?: number;
  limit?: number;
}): Promise<import("./types").AdminApplicationsResponse> {
  const q = new URLSearchParams();
  if (params.status && params.status !== "ALL") q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.jobId) q.set("jobId", params.jobId);
  if (params.facilityId) q.set("facilityId", params.facilityId);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return request(`/admin/applications${qs ? `?${qs}` : ""}`);
}

export async function getAdminApplicationDetail(id: string): Promise<import("./types").AdminApplicationDetail> {
  const data = await request<{ application: import("./types").AdminApplicationDetail }>(`/admin/applications/${id}`);
  return data.application;
}

export async function completePlacement(id: string, note?: string): Promise<{ message: string; hireRequestCompleted: boolean }> {
  return request(`/admin/applications/${id}/complete-placement`, { method: "POST", body: JSON.stringify({ note }) });
}

// ---------------------------------------------------------------------------
// Platform areas: overview, directory listings, reference data, contact submissions, audit history
// ---------------------------------------------------------------------------

export async function getAdminOverview(days = 30): Promise<import("./types").AdminOverview> {
  const data = await request<{ overview: import("./types").AdminOverview }>(`/admin/overview?days=${days}`);
  return data.overview;
}

export async function getFacilityListings(filter = "ALL"): Promise<import("./types").FacilityListingRow[]> {
  const data = await request<{ facilities: import("./types").FacilityListingRow[] }>(`/admin/facility-listings?filter=${encodeURIComponent(filter)}`);
  return data.facilities;
}

// Content / reference-data editing (all admin-only; nothing is deleted, records are hidden or deactivated)
type Save = { changed?: boolean; message: string; id?: string };
const send = (method: string, path: string, body: unknown): Promise<Save> => request(path, { method, body: JSON.stringify(body) });

export const getBadgeCounts = () => request<{ counts: import("./types").BadgeCounts }>("/admin/badge-counts").then((r) => r.counts);
export const getContentBlocks = (q: { page?: string; locale?: string }) => request<{ blocks: import("./types").ContentBlockRow[] }>(`/admin/content/blocks?${new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][])}`).then((r) => r.blocks);
export const updateContentBlock = (id: string, body: Record<string, unknown>) => send("PATCH", `/admin/content/blocks/${id}`, body);
export const getFaqs = () => request<{ faqs: import("./types").FaqRow[] }>("/admin/content/faqs").then((r) => r.faqs);
export const createFaq = (body: Record<string, unknown>) => send("POST", "/admin/content/faqs", body);
export const updateFaq = (id: string, body: Record<string, unknown>) => send("PATCH", `/admin/content/faqs/${id}`, body);
export const getCountryContent = () => request<{ countries: import("./types").CountryContentRow[] }>("/admin/content/countries").then((r) => r.countries);
export const createCountry = (body: Record<string, unknown>) => send("POST", "/admin/content/countries", body) as Promise<{ id: string; message?: string }>;
export const getSiteGeneral = () => request<{ general: import("./types").SiteGeneral; builtIn: { brandName: string; logoUrl: string } }>("/admin/settings/general");
export const saveSiteGeneral = (body: Record<string, unknown>) => send("PATCH", "/admin/settings/general", body);
export const getSeoSettings = () => request<import("./types").SeoSettings>("/admin/settings/seo");
export const saveSeoSettings = (scope: string, values: Record<string, unknown>) => send("PATCH", "/admin/settings/seo", { scope, values });
export const updateCountry = (id: string, body: Record<string, unknown>) => send("PATCH", `/admin/content/countries/${id}`, body);
export const addGuideSection = (countryId: string, body: Record<string, unknown>) => send("POST", `/admin/content/countries/${countryId}/sections`, body);
export const updateGuideSection = (id: string, body: Record<string, unknown>) => send("PATCH", `/admin/content/sections/${id}`, body);
export const getContentLists = () => request<{ lists: Record<string, import("./types").ListRow[]> }>("/admin/content/lists").then((r) => r.lists);
export const updateListItem = (list: string, id: string, body: Record<string, unknown>) => send("PATCH", `/admin/content/lists/${list}/${id}`, body);
export const createListItem = (list: string, body: Record<string, unknown>) => send("POST", `/admin/content/lists/${list}`, body);

export async function getReferenceData(): Promise<import("./types").ReferenceDataResponse> {
  return request("/admin/reference-data");
}

export async function getContactSubmissions(params: { status?: string; search?: string; page?: number }): Promise<import("./types").ContactSubmissionsResponse> {
  const q = new URLSearchParams();
  if (params.status && params.status !== "ALL") q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  const qs = q.toString();
  return request(`/admin/contact-submissions${qs ? `?${qs}` : ""}`);
}

export async function updateContactSubmissionStatus(id: string, status: string, internalNote?: string): Promise<{ message: string }> {
  return request(`/admin/contact-submissions/${id}/status`, { method: "POST", body: JSON.stringify({ status, internalNote }) });
}

export async function getAuditLogs(params: { action?: string; entityType?: string; page?: number }): Promise<import("./types").AuditLogsResponse> {
  const q = new URLSearchParams();
  if (params.action) q.set("action", params.action);
  if (params.entityType) q.set("entityType", params.entityType);
  if (params.page) q.set("page", String(params.page));
  const qs = q.toString();
  return request(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
}

// Facility public Hospitals-directory listing (approved facilities only)
export async function setFacilityPublicListing(
  accountId: string,
  enabled: boolean
): Promise<{ changed: boolean; isListedPublicly: boolean; message: string }> {
  return request(`/admin/accounts/${accountId}/public-listing`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

export async function approveIdentityRelease(
  releaseId: string,
  decisionNote?: string
): Promise<{ status: string; release: any; conversation: any }> {
  return request(`/admin/hire-requests/releases/${releaseId}/approve`, {
    method: "POST",
    body: JSON.stringify({ decisionNote }),
  });
}

export async function rejectIdentityRelease(
  releaseId: string,
  decisionNote?: string
): Promise<{ status: string; release: any }> {
  return request(`/admin/hire-requests/releases/${releaseId}/reject`, {
    method: "POST",
    body: JSON.stringify({ decisionNote }),
  });
}

export async function revokeIdentityRelease(
  releaseId: string,
  reasonNote?: string
): Promise<{ status: string; release: any }> {
  return request(`/admin/hire-requests/releases/${releaseId}/revoke`, {
    method: "POST",
    body: JSON.stringify({ reasonNote }),
  });
}

// ---------------------------------------------------------------------------
// Conversations (3-Party Chat)
// ---------------------------------------------------------------------------

export async function getConversation(conversationId: string): Promise<{ conversation: any }> {
  return request(`/conversations/${conversationId}`);
}

export async function sendConversationMessage(
  conversationId: string,
  body: string
): Promise<{ message: any }> {
  return request(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
