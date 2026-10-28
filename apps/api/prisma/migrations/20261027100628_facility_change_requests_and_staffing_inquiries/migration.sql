-- CreateEnum
CREATE TYPE "ProfileChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StaffingRequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'FULFILLED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "FacilityProfileChangeRequest" (
    "id" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "status" "ProfileChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentValues" JSONB NOT NULL,
    "proposedValues" JSONB NOT NULL,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityProfileChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffingRequest" (
    "id" UUID NOT NULL,
    "facilityId" UUID,
    "institutionName" TEXT NOT NULL,
    "countryId" UUID,
    "cityName" TEXT NOT NULL,
    "specialtyId" UUID,
    "positions" INTEGER NOT NULL DEFAULT 1,
    "minExperienceYears" INTEGER,
    "experienceRange" TEXT,
    "contractType" TEXT,
    "description" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "StaffingRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilityProfileChangeRequest_facilityId_status_idx" ON "FacilityProfileChangeRequest"("facilityId", "status");

-- CreateIndex
CREATE INDEX "FacilityProfileChangeRequest_status_createdAt_idx" ON "FacilityProfileChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StaffingRequest_facilityId_status_idx" ON "StaffingRequest"("facilityId", "status");

-- CreateIndex
CREATE INDEX "StaffingRequest_status_createdAt_idx" ON "StaffingRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "FacilityProfileChangeRequest" ADD CONSTRAINT "FacilityProfileChangeRequest_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityProfileChangeRequest" ADD CONSTRAINT "FacilityProfileChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequest" ADD CONSTRAINT "StaffingRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
