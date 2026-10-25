-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DOCTOR', 'FACILITY', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'AR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('CV', 'PROFILE_PHOTO', 'FACILITY_LOGO', 'CERTIFICATE', 'SUPPORTING_DOCUMENT', 'CONTENT_IMAGE');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('GOVERNMENT', 'MILITARY', 'UNIVERSITY', 'PRIVATE', 'OTHER');

-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('NATIVE', 'FLUENT', 'PROFESSIONAL', 'BASIC');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'FIXED_TERM', 'LOCUM', 'PART_TIME');

-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'PUBLISHED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'HIRE_REQUESTED', 'HIRED', 'NOT_SELECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "HireRequestStatus" AS ENUM ('SUBMITTED', 'IN_COORDINATION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HireRequestItemStatus" AS ENUM ('REQUESTED', 'IN_COORDINATION', 'AGREED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "IdentityReleaseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('DOCTOR', 'FACILITY', 'PLATFORM');

-- CreateEnum
CREATE TYPE "ContentPage" AS ENUM ('HOME', 'ABOUT', 'COUNTRIES', 'HOSPITALS', 'FAQ', 'CONTACT', 'JOBS');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'DRAFT',
    "preferredLocale" "Locale" NOT NULL DEFAULT 'EN',
    "submittedForReviewAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" UUID NOT NULL,
    "ownerId" UUID,
    "kind" "FileKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" UUID NOT NULL,
    "isoCode" CHAR(2) NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isGcc" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "summaryEn" TEXT,
    "summaryAr" TEXT,
    "heroImageId" UUID,
    "isGuidePublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "gender" "Gender",
    "nationalityId" UUID,
    "residenceCountryId" UUID,
    "phoneCountryCode" TEXT,
    "phoneNumber" TEXT,
    "photoId" UUID,
    "jobTitle" TEXT,
    "primarySpecialtyId" UUID,
    "about" TEXT,
    "yearsOfExperience" INTEGER,
    "currentPosition" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "cvId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorEducation" (
    "id" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "degree" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "graduationYear" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorLicense" (
    "id" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "licenseType" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "expiryDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorExperience" (
    "id" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "organization" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "responsibilities" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorLanguage" (
    "id" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "language" TEXT NOT NULL,
    "proficiency" "LanguageProficiency" NOT NULL,

    CONSTRAINT "DoctorLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FacilityType",
    "description" TEXT,
    "logoId" UUID,
    "countryId" UUID,
    "city" TEXT,
    "address" TEXT,
    "locationUrl" TEXT,
    "employeeCount" INTEGER,
    "officerName" TEXT NOT NULL,
    "officerEmail" TEXT NOT NULL,
    "officerPhoneCountryCode" TEXT,
    "officerPhone" TEXT,
    "slug" TEXT,
    "isListedPublicly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "referenceNumber" SERIAL NOT NULL,
    "facilityId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "specialtyId" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "positions" INTEGER NOT NULL DEFAULT 1,
    "minYearsExperience" INTEGER,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT[],
    "requirements" TEXT[],
    "benefits" TEXT[],
    "salaryMin" DECIMAL(12,2),
    "salaryMax" DECIMAL(12,2),
    "salaryCurrency" CHAR(3),
    "salaryPeriod" "SalaryPeriod",
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "reviewNote" TEXT,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "candidateCode" TEXT NOT NULL,
    "anonymousJobTitle" TEXT NOT NULL,
    "anonymousSpecialtyId" UUID NOT NULL,
    "anonymousYearsOfExperience" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "cvId" UUID,
    "expectedSalary" DECIMAL(12,2),
    "expectedSalaryCurrency" CHAR(3),
    "noticePeriod" TEXT,
    "preferredLocation" TEXT,
    "acceptableLocations" TEXT[],
    "preferredEmploymentType" "EmploymentType",
    "openToPrivateSector" BOOLEAN,
    "referralSource" TEXT,
    "additionalNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "applicationId" UUID NOT NULL,
    "fileId" UUID NOT NULL,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("applicationId","fileId")
);

-- CreateTable
CREATE TABLE "HireRequest" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "status" "HireRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "facilityNote" TEXT,
    "coordinatorId" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HireRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HireRequestItem" (
    "id" UUID NOT NULL,
    "hireRequestId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "status" "HireRequestItemStatus" NOT NULL DEFAULT 'REQUESTED',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HireRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityRelease" (
    "id" UUID NOT NULL,
    "hireRequestItemId" UUID NOT NULL,
    "status" "IdentityReleaseStatus" NOT NULL DEFAULT 'PENDING',
    "facilityAgreedAt" TIMESTAMP(3),
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "identityReleaseId" UUID NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" UUID NOT NULL,
    "page" "ContentPage" NOT NULL,
    "key" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "data" JSONB,
    "imageId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorTitle" TEXT NOT NULL,
    "authorLocation" TEXT,
    "quote" TEXT NOT NULL,
    "photoId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryGuideSection" (
    "id" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryGuideSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DoctorPreferredCountries" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DoctorPreferredCountries_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DoctorAdditionalSpecialties" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DoctorAdditionalSpecialties_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");

-- CreateIndex
CREATE INDEX "FileAsset_ownerId_idx" ON "FileAsset"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_slug_key" ON "Specialty"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");

-- CreateIndex
CREATE INDEX "DoctorEducation_doctorId_idx" ON "DoctorEducation"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorLicense_doctorId_idx" ON "DoctorLicense"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorExperience_doctorId_idx" ON "DoctorExperience"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorLanguage_doctorId_language_key" ON "DoctorLanguage"("doctorId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_userId_key" ON "Facility"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_slug_key" ON "Facility"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Job_referenceNumber_key" ON "Job"("referenceNumber");

-- CreateIndex
CREATE INDEX "Job_status_publishedAt_idx" ON "Job"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Job_facilityId_status_idx" ON "Job"("facilityId", "status");

-- CreateIndex
CREATE INDEX "Job_specialtyId_idx" ON "Job"("specialtyId");

-- CreateIndex
CREATE INDEX "Job_countryId_idx" ON "Job"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_id_facilityId_key" ON "Job"("id", "facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_candidateCode_key" ON "Application"("candidateCode");

-- CreateIndex
CREATE INDEX "Application_jobId_status_idx" ON "Application"("jobId", "status");

-- CreateIndex
CREATE INDEX "Application_doctorId_idx" ON "Application"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_doctorId_key" ON "Application"("jobId", "doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_id_jobId_key" ON "Application"("id", "jobId");

-- CreateIndex
CREATE INDEX "HireRequest_jobId_idx" ON "HireRequest"("jobId");

-- CreateIndex
CREATE INDEX "HireRequest_facilityId_status_idx" ON "HireRequest"("facilityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HireRequest_id_jobId_key" ON "HireRequest"("id", "jobId");

-- CreateIndex
CREATE INDEX "HireRequestItem_applicationId_idx" ON "HireRequestItem"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "HireRequestItem_hireRequestId_applicationId_key" ON "HireRequestItem"("hireRequestId", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityRelease_hireRequestItemId_key" ON "IdentityRelease"("hireRequestItemId");

-- CreateIndex
CREATE INDEX "IdentityRelease_status_idx" ON "IdentityRelease"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_identityReleaseId_key" ON "Conversation"("identityReleaseId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_page_key_locale_key" ON "ContentBlock"("page", "key", "locale");

-- CreateIndex
CREATE INDEX "Faq_locale_isPublished_sortOrder_idx" ON "Faq"("locale", "isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "Testimonial_locale_isPublished_sortOrder_idx" ON "Testimonial"("locale", "isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "CountryGuideSection_countryId_locale_sortOrder_idx" ON "CountryGuideSection"("countryId", "locale", "sortOrder");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "_DoctorPreferredCountries_B_index" ON "_DoctorPreferredCountries"("B");

-- CreateIndex
CREATE INDEX "_DoctorAdditionalSpecialties_B_index" ON "_DoctorAdditionalSpecialties"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_heroImageId_fkey" FOREIGN KEY ("heroImageId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_nationalityId_fkey" FOREIGN KEY ("nationalityId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_residenceCountryId_fkey" FOREIGN KEY ("residenceCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_primarySpecialtyId_fkey" FOREIGN KEY ("primarySpecialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorEducation" ADD CONSTRAINT "DoctorEducation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorLicense" ADD CONSTRAINT "DoctorLicense_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorExperience" ADD CONSTRAINT "DoctorExperience_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorLanguage" ADD CONSTRAINT "DoctorLanguage_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_anonymousSpecialtyId_fkey" FOREIGN KEY ("anonymousSpecialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_jobId_facilityId_fkey" FOREIGN KEY ("jobId", "facilityId") REFERENCES "Job"("id", "facilityId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequestItem" ADD CONSTRAINT "HireRequestItem_hireRequestId_jobId_fkey" FOREIGN KEY ("hireRequestId", "jobId") REFERENCES "HireRequest"("id", "jobId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequestItem" ADD CONSTRAINT "HireRequestItem_applicationId_jobId_fkey" FOREIGN KEY ("applicationId", "jobId") REFERENCES "Application"("id", "jobId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityRelease" ADD CONSTRAINT "IdentityRelease_hireRequestItemId_fkey" FOREIGN KEY ("hireRequestItemId") REFERENCES "HireRequestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityRelease" ADD CONSTRAINT "IdentityRelease_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_identityReleaseId_fkey" FOREIGN KEY ("identityReleaseId") REFERENCES "IdentityRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryGuideSection" ADD CONSTRAINT "CountryGuideSection_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DoctorPreferredCountries" ADD CONSTRAINT "_DoctorPreferredCountries_A_fkey" FOREIGN KEY ("A") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DoctorPreferredCountries" ADD CONSTRAINT "_DoctorPreferredCountries_B_fkey" FOREIGN KEY ("B") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DoctorAdditionalSpecialties" ADD CONSTRAINT "_DoctorAdditionalSpecialties_A_fkey" FOREIGN KEY ("A") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DoctorAdditionalSpecialties" ADD CONSTRAINT "_DoctorAdditionalSpecialties_B_fkey" FOREIGN KEY ("B") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
