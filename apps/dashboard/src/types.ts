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

export interface AdminHireRequestItem {
  id: string;
  status: string;
  candidateCode: string;
  specialty: string;
  yearsOfExperience: number;
  notes: string | null;
  application: {
    id: string;
    candidateCode: string;
    status: string;
  };
  identityRelease: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
    doctorConsentStatus: "PENDING" | "GRANTED" | "DECLINED" | "REVOKED";
    doctorConsentAt: string | null;
    releaseApprovedAt: string | null;
    releaseRevokedAt: string | null;
    conversation: {
      id: string;
      status: "ACTIVE" | "ARCHIVED" | "READ_ONLY";
    } | null;
  } | null;
}

export interface AdminHireRequest {
  id: string;
  status: "SUBMITTED" | "IN_COORDINATION" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  facility: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    city: string | null;
    country: string | null;
  };
  job: {
    id: string;
    title: string;
  };
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
  };
}
