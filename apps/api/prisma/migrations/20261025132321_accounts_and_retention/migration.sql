-- CreateEnum
CREATE TYPE "AccountDeletionStatus" AS ENUM ('REQUESTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phone",
ADD COLUMN     "mobileE164" TEXT,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AccountDeletionRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "AccountDeletionStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedById" UUID,
    "processedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_userId_idx" ON "AccountDeletionRequest"("userId");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_status_requestedAt_idx" ON "AccountDeletionRequest"("status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobileE164_key" ON "User"("mobileE164");

-- AddForeignKey
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Database rules not expressible in the Prisma schema (kept out of schema diffing).
-- ---------------------------------------------------------------------------

-- Login identifiers: email stored lowercase (case-insensitive uniqueness), mobile in E.164.
ALTER TABLE "User" ADD CONSTRAINT "User_email_lowercase"
  CHECK ("email" = lower("email"));

ALTER TABLE "User" ADD CONSTRAINT "User_mobile_e164"
  CHECK ("mobileE164" IS NULL OR "mobileE164" ~ '^\+[1-9][0-9]{6,14}$');

-- One open deletion request per user; closed requests always record when they were processed.
CREATE UNIQUE INDEX "AccountDeletionRequest_one_open_per_user"
  ON "AccountDeletionRequest"("userId") WHERE ("status" IN ('REQUESTED', 'IN_REVIEW'));

ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_processed_iff_closed"
  CHECK (("status" IN ('COMPLETED', 'REJECTED', 'CANCELLED')) = ("processedAt" IS NOT NULL));

-- Cancelling a hire request cancels only its still-open items; terminal items keep their outcome.
CREATE FUNCTION "hire_request_cancel_open_items"() RETURNS trigger AS $$
BEGIN
  IF NEW."status" = 'CANCELLED' AND OLD."status" <> 'CANCELLED' THEN
    UPDATE "HireRequestItem"
      SET "status" = 'CANCELLED', "closedAt" = now(), "updatedAt" = now()
      WHERE "hireRequestId" = NEW."id" AND "closedAt" IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "HireRequest_cancel_open_items"
  AFTER UPDATE OF "status" ON "HireRequest"
  FOR EACH ROW EXECUTE FUNCTION "hire_request_cancel_open_items"();

-- Closed (completed or cancelled) hire requests accept no new applicants.
CREATE FUNCTION "hire_request_item_requires_open_request"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "HireRequest" WHERE "id" = NEW."hireRequestId" AND "closedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Applicants cannot be added to a closed hire request'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "HireRequestItem_requires_open_request"
  BEFORE INSERT ON "HireRequestItem"
  FOR EACH ROW EXECUTE FUNCTION "hire_request_item_requires_open_request"();

-- Retained records are never hard-deleted (accounts, hiring history, deletion requests).
CREATE FUNCTION "prevent_hard_delete"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% records are retained and cannot be deleted', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_prevent_hard_delete"
  BEFORE DELETE ON "User" FOR EACH ROW EXECUTE FUNCTION "prevent_hard_delete"();
CREATE TRIGGER "Application_prevent_hard_delete"
  BEFORE DELETE ON "Application" FOR EACH ROW EXECUTE FUNCTION "prevent_hard_delete"();
CREATE TRIGGER "HireRequest_prevent_hard_delete"
  BEFORE DELETE ON "HireRequest" FOR EACH ROW EXECUTE FUNCTION "prevent_hard_delete"();
CREATE TRIGGER "HireRequestItem_prevent_hard_delete"
  BEFORE DELETE ON "HireRequestItem" FOR EACH ROW EXECUTE FUNCTION "prevent_hard_delete"();
CREATE TRIGGER "IdentityRelease_prevent_hard_delete"
  BEFORE DELETE ON "IdentityRelease" FOR EACH ROW EXECUTE FUNCTION "prevent_hard_delete"();
CREATE TRIGGER "AccountDeletionRequest_prevent_hard_delete"
  BEFORE DELETE ON "AccountDeletionRequest" FOR EACH ROW EXECUTE FUNCTION "prevent_hard_delete"();
