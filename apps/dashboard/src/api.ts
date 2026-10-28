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
const TOKEN_KEY = "ha_admin_token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
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
    token?: string;
    user: AdminUser;
  }>("/auth/login/admin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data.token) {
    setStoredToken(data.token);
  }

  return data.user;
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const data = await request<{ status: string; user: AdminUser | null }>("/auth/me");
    if (data.user?.role !== "PLATFORM_ADMIN") {
      setStoredToken(null);
      return null;
    }
    return data.user;
  } catch {
    setStoredToken(null);
    return null;
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {}
  setStoredToken(null);
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

export function getFileDownloadUrl(fileId: string): string {
  return `${API_BASE}/files/${fileId}/download`;
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
  page?: number;
  limit?: number;
}): Promise<import("./types").AdminHireRequestsResponse> {
  const q = new URLSearchParams();
  if (params.status && params.status !== "ALL") q.set("status", params.status);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));

  const qs = q.toString();
  return request(`/admin/hire-requests${qs ? `?${qs}` : ""}`);
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
