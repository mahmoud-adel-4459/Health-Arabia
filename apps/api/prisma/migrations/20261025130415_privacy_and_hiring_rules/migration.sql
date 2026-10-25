-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "DoctorConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACCOUNT_STATUS', 'JOB_REVIEW', 'JOB_MATCH', 'APPLICATION_UPDATE', 'HIRE_REQUEST_UPDATE', 'IDENTITY_CONSENT_REQUEST', 'IDENTITY_RELEASE', 'NEW_MESSAGE', 'PROFILE_REMINDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ContactSubmissionStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESOLVED', 'SPAM');

-- AlterEnum
ALTER TYPE "FacilityType" ADD VALUE 'CLINIC';

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_cvId_fkey";

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "acceptableLocations",
DROP COLUMN "additionalNotes",
DROP COLUMN "cvId",
DROP COLUMN "expectedSalary",
DROP COLUMN "expectedSalaryCurrency",
DROP COLUMN "noticePeriod",
DROP COLUMN "openToPrivateSector",
DROP COLUMN "preferredEmploymentType",
DROP COLUMN "preferredLocation",
DROP COLUMN "referralSource";

-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "city",
ADD COLUMN     "cityId" UUID,
ADD COLUMN     "publicListingEnabledAt" TIMESTAMP(3),
ADD COLUMN     "publicListingEnabledById" UUID;

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "checksumSha256" TEXT,
ADD COLUMN     "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "HireRequestItem" ADD COLUMN     "closedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "IdentityRelease" ADD COLUMN     "doctorConsentAt" TIMESTAMP(3),
ADD COLUMN     "doctorConsentStatus" "DoctorConsentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "city",
DROP COLUMN "employmentType",
DROP COLUMN "salaryCurrency",
DROP COLUMN "salaryPeriod",
ADD COLUMN     "cityId" UUID NOT NULL,
ADD COLUMN     "employmentTypeId" UUID NOT NULL,
ADD COLUMN     "salaryCurrencyCode" CHAR(3),
ADD COLUMN     "salaryPeriodId" UUID;

-- DropEnum
DROP TYPE "EmploymentType";

-- DropEnum
DROP TYPE "SalaryPeriod";

-- CreateTable
CREATE TABLE "City" (
    "id" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentTypeOption" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryPeriodOption" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryPeriodOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" CHAR(3) NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "symbol" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "SavedJob" (
    "doctorId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("doctorId","jobId")
);

-- CreateTable
CREATE TABLE "ApplicationSubmission" (
    "applicationId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phoneCountryCode" TEXT,
    "phoneNumber" TEXT,
    "dateOfBirth" DATE,
    "gender" "Gender",
    "nationalityId" UUID,
    "currentLocation" TEXT,
    "currentJobTitle" TEXT,
    "specialtyId" UUID,
    "mainQualification" TEXT,
    "qualificationDate" DATE,
    "yearsOfExperience" INTEGER,
    "preferredCityId" UUID,
    "acceptableLocations" TEXT[],
    "preferredEmploymentTypeId" UUID,
    "noticePeriod" TEXT,
    "expectedSalary" DECIMAL(12,2),
    "expectedSalaryCurrencyCode" CHAR(3),
    "openToPrivateSector" BOOLEAN,
    "referralSource" TEXT,
    "additionalNotes" TEXT,
    "cvId" UUID,
    "termsAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationSubmission_pkey" PRIMARY KEY ("applicationId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "data" JSONB,
    "linkPath" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "locale" "Locale",
    "status" "ContactSubmissionStatus" NOT NULL DEFAULT 'NEW',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_countryId_nameEn_key" ON "City"("countryId", "nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "City_id_countryId_key" ON "City"("id", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentTypeOption_code_key" ON "EmploymentTypeOption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryPeriodOption_code_key" ON "SalaryPeriodOption"("code");

-- CreateIndex
CREATE INDEX "SavedJob_jobId_idx" ON "SavedJob"("jobId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Facility_isListedPublicly_idx" ON "Facility"("isListedPublicly");

-- CreateIndex
CREATE UNIQUE INDEX "HireRequestItem_one_open_per_application" ON "HireRequestItem"("applicationId") WHERE ("closedAt" IS NULL);

-- CreateIndex
CREATE INDEX "Job_cityId_idx" ON "Job"("cityId");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_publicListingEnabledById_fkey" FOREIGN KEY ("publicListingEnabledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_cityId_countryId_fkey" FOREIGN KEY ("cityId", "countryId") REFERENCES "City"("id", "countryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_employmentTypeId_fkey" FOREIGN KEY ("employmentTypeId") REFERENCES "EmploymentTypeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_salaryCurrencyCode_fkey" FOREIGN KEY ("salaryCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_salaryPeriodId_fkey" FOREIGN KEY ("salaryPeriodId") REFERENCES "SalaryPeriodOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_nationalityId_fkey" FOREIGN KEY ("nationalityId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_preferredCityId_fkey" FOREIGN KEY ("preferredCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_preferredEmploymentTypeId_fkey" FOREIGN KEY ("preferredEmploymentTypeId") REFERENCES "EmploymentTypeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_expectedSalaryCurrencyCode_fkey" FOREIGN KEY ("expectedSalaryCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Database rules not expressible in the Prisma schema (kept out of schema diffing)
-- ---------------------------------------------------------------------------

-- Identity can only be released after the doctor explicitly consents.
ALTER TABLE "IdentityRelease" ADD CONSTRAINT "IdentityRelease_approval_requires_consent"
  CHECK ("status" <> 'APPROVED' OR "doctorConsentStatus" = 'GRANTED');

-- A consent decision always records when it was made.
ALTER TABLE "IdentityRelease" ADD CONSTRAINT "IdentityRelease_consent_timestamp"
  CHECK (("doctorConsentStatus" = 'PENDING') = ("doctorConsentAt" IS NULL));

-- Declined or withdrawn hire request items are closed, which frees the application for a new request.
ALTER TABLE "HireRequestItem" ADD CONSTRAINT "HireRequestItem_closed_status_has_closedAt"
  CHECK ("status" NOT IN ('DECLINED', 'WITHDRAWN') OR "closedAt" IS NOT NULL);

-- CVs, certificates, supporting documents, and doctor photos are always private.
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_public_only_for_public_kinds"
  CHECK ("visibility" = 'PRIVATE' OR "kind" IN ('FACILITY_LOGO', 'CONTENT_IMAGE'));

-- Public listing must be explicitly enabled by the platform.
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_public_listing_enabled"
  CHECK (NOT "isListedPublicly" OR "publicListingEnabledAt" IS NOT NULL);

-- Group chat requires an approved identity release with doctor consent.
CREATE FUNCTION "conversation_requires_released_identity"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "IdentityRelease"
    WHERE "id" = NEW."identityReleaseId"
      AND "status" = 'APPROVED'
      AND "doctorConsentStatus" = 'GRANTED'
  ) THEN
    RAISE EXCEPTION 'Conversation requires an approved identity release with doctor consent'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Conversation_requires_released_identity"
  BEFORE INSERT OR UPDATE OF "identityReleaseId" ON "Conversation"
  FOR EACH ROW EXECUTE FUNCTION "conversation_requires_released_identity"();

-- Doctors can apply only after account approval, and only to published jobs.
CREATE FUNCTION "application_requires_approved_doctor_and_published_job"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "DoctorProfile" d
    JOIN "User" u ON u."id" = d."userId"
    WHERE d."id" = NEW."doctorId" AND u."role" = 'DOCTOR' AND u."status" = 'APPROVED'
  ) THEN
    RAISE EXCEPTION 'Applications require an approved doctor account'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "Job" WHERE "id" = NEW."jobId" AND "status" = 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'Applications require a published job'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Application_requires_approved_doctor_and_published_job"
  BEFORE INSERT ON "Application"
  FOR EACH ROW EXECUTE FUNCTION "application_requires_approved_doctor_and_published_job"();

-- Only approved facility accounts can be listed publicly.
CREATE FUNCTION "facility_listing_requires_approved_account"() RETURNS trigger AS $$
BEGIN
  IF NEW."isListedPublicly" AND NOT EXISTS (
    SELECT 1 FROM "User" WHERE "id" = NEW."userId" AND "status" = 'APPROVED'
  ) THEN
    RAISE EXCEPTION 'Only approved facility accounts can be listed publicly'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Facility_listing_requires_approved_account"
  BEFORE INSERT OR UPDATE OF "isListedPublicly", "userId" ON "Facility"
  FOR EACH ROW EXECUTE FUNCTION "facility_listing_requires_approved_account"();

-- A facility account that loses approval is removed from the public directory.
CREATE FUNCTION "unlist_facility_when_account_not_approved"() RETURNS trigger AS $$
BEGIN
  IF NEW."status" <> 'APPROVED' THEN
    UPDATE "Facility" SET "isListedPublicly" = false WHERE "userId" = NEW."id" AND "isListedPublicly";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_unlist_facility_when_not_approved"
  AFTER UPDATE OF "status" ON "User"
  FOR EACH ROW EXECUTE FUNCTION "unlist_facility_when_account_not_approved"();
