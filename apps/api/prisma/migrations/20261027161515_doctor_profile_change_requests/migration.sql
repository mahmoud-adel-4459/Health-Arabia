-- CreateTable
CREATE TABLE "DoctorProfileChangeRequest" (
    "id" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "status" "ProfileChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentValues" JSONB NOT NULL,
    "proposedValues" JSONB NOT NULL,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfileChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorProfileChangeRequest_doctorId_status_idx" ON "DoctorProfileChangeRequest"("doctorId", "status");

-- CreateIndex
CREATE INDEX "DoctorProfileChangeRequest_status_createdAt_idx" ON "DoctorProfileChangeRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "DoctorProfileChangeRequest" ADD CONSTRAINT "DoctorProfileChangeRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfileChangeRequest" ADD CONSTRAINT "DoctorProfileChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
