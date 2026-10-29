export type UserRole = "DOCTOR" | "FACILITY" | "PLATFORM_ADMIN";

export type AccountStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "DEACTIVATED";

export interface AdminUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  status: AccountStatus;
}

export interface ReviewQueueAccount {
  id: string;
  role: "DOCTOR" | "FACILITY";
  status: AccountStatus;
  applicantName: string;
  email: string | null;
  mobileE164: string | null;
  location: string;
  submittedForReviewAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  reviewedBy: {
    id: string;
    displayName: string | null;
    email: string | null;
  } | null;
  createdAt: string;
  hasCv: boolean;
  hasLogo: boolean;
  summary: {
    jobTitle?: string | null;
    specialty?: string | null;
    yearsOfExperience?: number | null;
    type?: string | null;
    officerName?: string | null;
    hospitalEmail?: string | null;
  };
}

export interface ReviewQueueMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    doctorsPending: number;
    facilitiesPending: number;
  };
}

export interface DoctorEducation {
  id: string;
  degree: string;
  institution: string;
  graduationYear: number;
  isPrimary: boolean;
}

export interface DoctorLicense {
  id: string;
  licenseType: string;
  registrationNumber: string;
  issuingAuthority: string;
  expiryDate: string | null;
}

export interface DoctorExperience {
  id: string;
  organization: string;
  position: string;
  startDate: string;
  endDate: string | null;
  responsibilities: string | null;
}

export interface DoctorDetailProfile {
  id: string;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  jobTitle: string | null;
  about: string | null;
  yearsOfExperience: number | null;
  currentPosition: string | null;
  specialty?: string | null;
  residenceCountry?: string | null;
  nationality?: string | null;
  educations: DoctorEducation[];
  licenses: DoctorLicense[];
  experiences: DoctorExperience[];
  languages: Array<{ language: string; proficiency: string }>;
  cv: {
    id: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
    downloadUrl: string;
  } | null;
  photo: {
    id: string;
    name: string;
    downloadUrl: string;
  } | null;
}

export interface FacilityDetailProfile {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  address: string | null;
  locationUrl: string | null;
  employeeCount: number | null;
  hospitalEmail: string | null;
  inquiryMessage: string | null;
  officerName: string;
  officerPhoneCountryCode: string | null;
  officerPhone: string | null;
  city?: string | null;
  country?: string | null;
  slug?: string | null;
  publicListing?: {
    isListedPublicly: boolean;
    enabledAt: string | null;
    enabledBy: { id: string; name: string } | null;
  };
  logo: {
    id: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
    downloadUrl: string;
  } | null;
}

export interface EntityAuditLog {
  id: string;
  action: string;
  actor: string;
  metadata: any;
  createdAt: string;
}

export interface AccountDetail {
  id: string;
  email: string | null;
  mobileE164: string | null;
  displayName: string | null;
  role: "DOCTOR" | "FACILITY";
  status: AccountStatus;
  submittedForReviewAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  reviewedBy: {
    id: string;
    displayName: string | null;
    email: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  doctorProfile: DoctorDetailProfile | null;
  facility: FacilityDetailProfile | null;
  auditLogs: EntityAuditLog[];
}

export type ProfileChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface FacilityChangeQueueItem {
  id: string;
  facilityId: string;
  facilityName: string;
  officerName: string;
  officerEmail: string;
  status: ProfileChangeRequestStatus;
  changedFieldCount: number;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewer: {
    id: string;
    name: string;
  } | null;
}

export interface FacilityChangeQueueMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts: {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
    CANCELLED: number;
    ALL: number;
  };
}

export interface FieldComparison {
  key: string;
  label: string;
  type: string;
  hasChanged: boolean;
  currentValue: any;
  proposedValue: any;
  currentDisplay: string;
  proposedDisplay: string;
  currentImageUrl?: string | null;
  proposedImageUrl?: string | null;
}

export interface FacilityChangeDetail {
  id: string;
  facilityId: string;
  status: ProfileChangeRequestStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  facility: {
    id: string;
    name: string;
    currentOfficerName: string;
    officerEmail: string;
    accountStatus: AccountStatus;
  };
  comparisons: FieldComparison[];
  currentValues: Record<string, any>;
  proposedValues: Record<string, any>;
}

export interface DoctorChangeQueueItem {
  id: string;
  doctorId: string;
  doctorName: string;
  jobTitle: string;
  email: string;
  mobileE164: string;
  status: ProfileChangeRequestStatus;
  changedFieldCount: number;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

export interface DoctorChangeDetail {
  id: string;
  doctorId: string;
  status: ProfileChangeRequestStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  doctor: {
    id: string;
    fullName: string;
    jobTitle: string | null;
    email: string;
    mobileE164: string;
    accountStatus: AccountStatus;
  };
  comparisons: Array<
    FieldComparison & {
      currentFileName?: string | null;
      proposedFileName?: string | null;
    }
  >;
  listComparisons: {
    preferredCountries: { hasChanged: boolean; current: string[]; proposed: string[] };
    additionalSpecialties: { hasChanged: boolean; current: string[]; proposed: string[] };
    educations: { hasChanged: boolean; current: any[]; proposed: any[] };
    licenses: { hasChanged: boolean; current: any[]; proposed: any[] };
    experiences: { hasChanged: boolean; current: any[]; proposed: any[] };
    languages: { hasChanged: boolean; current: any[]; proposed: any[] };
  };
  currentValues: Record<string, any>;
  proposedValues: Record<string, any>;
}

export type JobModerationStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "PUBLISHED"
  | "REJECTED"
  | "CLOSED";

export interface JobSubmissionItem {
  id: string;
  referenceNumber: string;
  rawReferenceNumber: number;
  title: string;
  status: JobModerationStatus;
  specialty: string;
  location: string;
  employmentType: string;
  positions: number;
  minYearsExperience: number | null;
  salary: string | null;
  isUrgent: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  reviewNote: string | null;
  reviewerName: string | null;
  applicationsCount: number;
  facility: {
    id: string;
    name: string;
    type: string | null;
    accountStatus: AccountStatus;
    loginEmail: string | null;
    hospitalEmail: string | null;
    officerName: string;
    officerPhone: string;
    logoUrl: string | null;
  };
}

export interface JobQueueMeta {
  counts: {
    all: number;
    pendingReview: number;
    published: number;
    rejected: number;
    changesRequested?: number;
  };
}

export interface JobSubmissionDetail {
  id: string;
  referenceNumber: string;
  rawReferenceNumber: number;
  title: string;
  status: JobModerationStatus;
  aboutHospital: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  positions: number;
  minYearsExperience: number | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryCurrencyCode: string | null;
  salaryPeriodName: string;
  isUrgent: boolean;
  specialty: {
    id: string;
    nameEn: string;
    nameAr: string;
  };
  location: {
    countryId: string;
    countryName: string;
    cityId: string;
    cityName: string;
  };
  employmentType: {
    id: string;
    code: string;
    nameEn: string;
  };
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  reviewNote: string | null;
  reviewer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  stats: {
    applicationsCount: number;
    hireRequestsCount: number;
  };
  facility: {
    id: string;
    name: string;
    type: string | null;
    description: string | null;
    address: string | null;
    locationUrl: string | null;
    employeeCount: number | null;
    countryName: string | null;
    cityName: string | null;
    logoUrl: string | null;
    accountStatus: AccountStatus;
    userCreatedAt: string;
    recruitmentOfficer: {
      name: string;
      loginEmail: string | null;
      hospitalEmail: string | null;
      phoneCountryCode: string | null;
      phone: string | null;
      fullPhone: string;
    };
  };
}

export interface AdminReleaseSummary {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  doctorConsentStatus: "PENDING" | "GRANTED" | "DECLINED" | "REVOKED";
  doctorConsentAt: string | null;
  decidedAt: string | null;
  revokedAt: string | null;
  conversationId: string | null;
  conversationStatus: string | null;
}

export interface AdminHireRequestItem {
  id: string;
  applicationId: string;
  candidateCode: string;
  jobTitle: string;
  specialty: string;
  yearsOfExperience: number;
  status: string;
  identityRelease: AdminReleaseSummary | null;
}

export interface AdminHireRequest {
  id: string;
  status: "SUBMITTED" | "IN_COORDINATION" | "COMPLETED" | "CANCELLED";
  submittedAt: string | null;
  facilityNote: string | null;
  itemsCount: number;
  facility: { id: string; name: string; officerName: string | null; email: string | null; status: string; location: string };
  job: { id: string; ref: string; title: string; location: string };
  items: AdminHireRequestItem[];
}

export interface AdminHireRequestsResponse {
  hireRequests: AdminHireRequest[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    pendingConsentCount: number;
    pendingReleaseCount: number;
    placementsReadyCount: number;
    counts: { submitted: number; inCoordination: number; completed: number; cancelled: number };
  };
}

export interface AdminHireRequestDetail {
  id: string;
  status: AdminHireRequest["status"];
  facilityNote: string | null;
  submittedAt: string | null;
  closedAt: string | null;
  facility: { id: string; accountId: string; name: string; type: string | null; officerName: string | null; email: string | null; phone: string; accountStatus: string; country?: string; city?: string };
  job: { id: string; ref: string; title: string; specialty: string; location: string };
  coordinator: { id: string; name: string } | null;
  history: Array<{ action: string; at: string; candidateCode: string | null; actor: string; actorRole: string | null; reason: string | null }>;
  items: Array<{
    id: string;
    status: string;
    createdAt: string | null;
    closedAt: string | null;
    application: {
      id: string;
      candidateCode: string;
      anonymousJobTitle: string;
      specialty: string;
      yearsOfExperience: number;
      status: string;
      doctor: { id: string; userId: string; fullName: string; email: string | null; phone: string | null; status: string; nationality?: string };
    };
    identityRelease: null | {
      id: string;
      status: AdminReleaseSummary["status"];
      doctorConsentStatus: AdminReleaseSummary["doctorConsentStatus"];
      doctorConsentAt: string | null;
      doctorConsentRevokedAt: string | null;
      decidedAt: string | null;
      decisionNote: string | null;
      decidedBy: { id: string; name: string } | null;
      revokedAt: string | null;
      revocationReason: string | null;
      conversation: null | { id: string; status: string; readOnlyAt: string | null; participants: Array<{ userId: string; role: string; name: string }>; recentMessagesCount: number };
    };
  }>;
}

export interface ContactSubmissionDetail {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  language: string | null;
  status: string;
  nextStatuses: string[];
  internalNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  submittedBy: { role: string } | null;
  history: Array<{ at: string; from: string | null; to: string | null; note: string | null; actor: string }>;
}

// ---------------------------------------------------------------------------
// Doctor Applications (GET /api/admin/applications)
// ---------------------------------------------------------------------------
export type ApplicationStatus = "SUBMITTED" | "UNDER_REVIEW" | "HIRE_REQUESTED" | "HIRED" | "NOT_SELECTED" | "WITHDRAWN";

export interface AdminApplicationItem {
  id: string;
  candidateCode: string;
  status: ApplicationStatus;
  submittedAt: string;
  anonymous: { jobTitle: string; specialty: string; yearsOfExperience: number };
  doctor: { id: string; accountId: string; fullName: string; email: string | null; mobileE164: string | null; accountStatus: string };
  job: { id: string; ref: string; title: string; status: string };
  facility: {
    id: string;
    accountId: string;
    name: string;
    accountStatus: string;
    hospitalEmail: string | null;
    recruitmentContact: { name: string; email: string | null; phone: string | null };
  };
  hireRequest: {
    itemId: string;
    itemStatus: string;
    requestId: string;
    requestStatus: string;
    requestedAt: string;
    identityReleaseStatus: string | null;
    doctorConsentStatus: string | null;
  } | null;
}

export interface AdminApplicationsResponse {
  status: string;
  items: AdminApplicationItem[];
  meta: { page: number; limit: number; total: number; totalPages: number; counts: Record<string, number> };
}

// Admin application detail (GET /api/admin/applications/:id)
export interface AdminApplicationDetail extends Omit<AdminApplicationItem, "hireRequest"> {
  hireRequests: Array<{
    itemId: string;
    itemStatus: string;
    itemClosedAt: string | null;
    requestId: string;
    requestStatus: string;
    requestedAt: string;
    requestClosedAt: string | null;
    facilityNote: string | null;
    identityRelease: {
      id: string;
      status: string;
      doctorConsentStatus: string;
      doctorConsentAt: string | null;
      decidedAt: string | null;
      decidedBy: string | null;
      decisionNote: string | null;
      revokedAt: string | null;
      conversation: { id: string; status: string; createdAt: string; messageCount: number } | null;
    } | null;
  }>;
  canCompletePlacement: boolean;
  nextAction: string;
  history: Array<{ id: string; action: string; entityType: string; actor: string; actorRole: string | null; note: string | null; createdAt: string }>;
}

// GET /api/admin/overview
export interface AdminOverview {
  accounts: { pendingDoctors: number; pendingFacilities: number; approvedDoctors: number; approvedFacilities: number };
  jobs: { pendingReview: number; published: number };
  applications: { byStatus: Record<string, number>; withoutHireRequest: number };
  hireRequests: { byStatus: Record<string, number>; releasesAwaitingConsent: number; releasesAwaitingDecision: number; placementsReadyToComplete: number };
  profileChanges: { doctorPending: number; facilityPending: number };
  directory: { listed: number; approvedUnlisted: number };
  contact: { new: number; inReview: number };
  audit: { last7Days: number };
  trends: OverviewTrends;
}

export interface OverviewTrends {
  rangeDays: number;
  since: string;
  applicationsPerDay: Array<{ date: string; count: number }>;
  funnel: { applied: number; hireRequested: number; consentGranted: number; identityReleased: number; hired: number };
  placementsCompleted: number;
  placementsPerWeek: Array<{ weekStarting: string; count: number }>;
  applicationsBySpecialty: Array<{ name: string; count: number }>;
  publishedJobsByCountry: Array<{ name: string; count: number }>;
}

export interface FacilityListingRow {
  id: string;
  accountId: string;
  name: string;
  slug: string | null;
  location: string | null;
  accountStatus: string;
  isListedPublicly: boolean;
  isPubliclyVisible: boolean;
  enabledAt: string | null;
  enabledBy: string | null;
  jobsCount: number;
}

export interface ReferenceDataResponse {
  editable: boolean;
  managedBy: string;
  countries: Array<{ id: string; nameEn: string; isoCode: string | null; isGcc: boolean; isActive: boolean; isGuidePublished: boolean; citiesCount: number; guideSectionsCount: number }>;
  cities: Array<{ id: string; nameEn: string; country: string; isActive: boolean }>;
  specialties: Array<{ id: string; nameEn: string; slug: string; isActive: boolean }>;
  options: Record<string, Array<{ id?: string; code: string; nameEn: string; isActive: boolean }>>;
  faqs: Array<{ id: string; locale: string; question: string; isPublished: boolean; updatedAt: string }>;
  contentBlocks: Array<{ id: string; page: string; key: string; locale: string; title: string | null; isPublished: boolean; updatedAt: string }>;
  siteSettings: string[];
}

export interface ContactSubmissionRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: "NEW" | "IN_REVIEW" | "RESOLVED" | "SPAM";
  nextStatuses: string[];
  internalNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

export interface ContactSubmissionsResponse {
  items: ContactSubmissionRow[];
  meta: { page: number; limit: number; total: number; totalPages: number; counts: Record<string, number> };
}

export interface AuditLogsResponse {
  items: Array<{ id: string; action: string; entityType: string; entityId: string; actor: string; actorRole: string | null; metadata: Record<string, unknown>; createdAt: string }>;
  filters: { actions: Array<{ value: string; count: number }>; entityTypes: Array<{ value: string; count: number }> };
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface BadgeCounts { pendingAccounts: number; doctorChanges: number; facilityChanges: number; jobsPending: number; releasesToDecide: number; placementsReady: number; contactNew: number; deletionOpen: number }

export type DeletionAction = "review" | "reject" | "complete";
export interface DeletionRequestRow {
  id: string; status: string; reason: string | null; requestedAt: string; processedAt: string | null;
  account: { id: string; role: string; status: string; name: string; email: string | null };
  nextActions: DeletionAction[];
}
export interface DeletionRequestsResponse { items: DeletionRequestRow[]; meta: { total: number; page: number; totalPages: number; counts: Record<string, number> } }
export interface DeletionRequestDetail {
  id: string; status: string; reason: string | null; requestedAt: string; processedAt: string | null; resolutionNote: string | null; processedBy: string | null;
  nextActions: DeletionAction[];
  account: { id: string; role: string; status: string; name: string; email: string | null; mobile: string | null; createdAt: string; deactivatedAt: string | null };
  preserved: { applications: number; hireRequestItems: number; conversations: number; messages: number; jobs: number };
  history: Array<{ action: string; at: string; actor: string; reason: string | null }>;
}
export interface ContentBlockRow { id: string; page: string; key: string; locale: string; title: string | null; body: string | null; data: unknown; sortOrder: number; isPublished: boolean; updatedAt: string }
export interface FaqRow { id: string; locale: string; question: string; answer: string; sortOrder: number; isPublished: boolean }
export interface CountryContentRow { id: string; slug: string; isoCode: string; isGcc: boolean; nameEn: string; nameAr: string; summaryEn: string | null; summaryAr: string | null; isActive: boolean; isGuidePublished: boolean; sortOrder: number; usedBy?: { jobs: number; hospitals: number }; cities?: Array<{ id: string; nameEn: string; nameAr: string; isActive: boolean; sortOrder: number }>; sections: Array<{ id: string; locale: string; title: string; body: string; sortOrder: number }> }

export interface SiteGeneral { brandName: string; logoUrl: string; faviconUrl: string; social: { facebook: string; linkedin: string; x: string }; contact: { address: string; email: string; phone: string; hours: string }; tagline: string; copyrightCompany: string }
export interface SeoValues { title?: string; description?: string; ogTitle?: string; ogDescription?: string; ogImage?: string; canonicalUrl?: string; noindex?: boolean }
export interface SeoSettings { seo: Record<string, SeoValues>; builtIn: Record<string, { title: string; description: string }>; pages: string[] }
export interface ListRow { id: string; code: string | null; nameEn: string; nameAr: string; isActive: boolean; sortOrder: number; symbol?: string | null; country?: string; countryId?: string }
