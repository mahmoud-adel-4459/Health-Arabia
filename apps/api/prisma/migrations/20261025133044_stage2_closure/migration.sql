-- CreateEnum
CREATE TYPE "IdentityRevocationReason" AS ENUM ('DOCTOR_CONSENT_REVOKED', 'HIRE_REQUEST_CANCELLED', 'PLATFORM_DECISION');

-- AlterEnum
ALTER TYPE "AccountStatus" ADD VALUE 'DEACTIVATED';

-- AlterTable
ALTER TABLE "ApplicationSubmission" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DoctorProfile" DROP COLUMN "phoneCountryCode",
DROP COLUMN "phoneNumber";

-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "officerEmail";

-- AlterTable
ALTER TABLE "IdentityRelease" ADD COLUMN     "revocationReason" "IdentityRevocationReason";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Database rules not expressible in the Prisma schema (kept out of schema diffing).
-- Enum comparisons use ::text because enum values added in this migration cannot be
-- referenced as enum literals until the migration commits.
-- ---------------------------------------------------------------------------

-- Login identifiers: doctors use mobile, facilities use the officer's email, every
-- account has at least one identifier.
ALTER TABLE "User" ADD CONSTRAINT "User_doctor_requires_mobile"
  CHECK ("role"::text <> 'DOCTOR' OR "mobileE164" IS NOT NULL);

ALTER TABLE "User" ADD CONSTRAINT "User_facility_requires_email"
  CHECK ("role"::text <> 'FACILITY' OR "email" IS NOT NULL);

ALTER TABLE "User" ADD CONSTRAINT "User_has_login_identifier"
  CHECK ("email" IS NOT NULL OR "mobileE164" IS NOT NULL);

-- Deactivation is timestamped and final.
ALTER TABLE "User" ADD CONSTRAINT "User_deactivated_timestamp"
  CHECK (("status"::text = 'DEACTIVATED') = ("deactivatedAt" IS NOT NULL));

CREATE FUNCTION "user_deactivation_is_final"() RETURNS trigger AS $$
BEGIN
  IF OLD."status"::text = 'DEACTIVATED' AND NEW."status"::text <> 'DEACTIVATED' THEN
    RAISE EXCEPTION 'Deactivated accounts cannot be reactivated'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_deactivation_is_final"
  BEFORE UPDATE OF "status" ON "User"
  FOR EACH ROW EXECUTE FUNCTION "user_deactivation_is_final"();

-- Deactivating an account revokes all of its sessions.
CREATE FUNCTION "revoke_sessions_on_deactivation"() RETURNS trigger AS $$
BEGIN
  IF NEW."status"::text = 'DEACTIVATED' AND OLD."status"::text <> 'DEACTIVATED' THEN
    UPDATE "Session" SET "revokedAt" = now()
      WHERE "userId" = NEW."id" AND "revokedAt" IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_revoke_sessions_on_deactivation"
  AFTER UPDATE OF "status" ON "User"
  FOR EACH ROW EXECUTE FUNCTION "revoke_sessions_on_deactivation"();

-- Deactivated accounts cannot open new sessions (blocks future login).
CREATE FUNCTION "session_requires_active_account"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User" WHERE "id" = NEW."userId" AND "status"::text = 'DEACTIVATED'
  ) THEN
    RAISE EXCEPTION 'Deactivated accounts cannot log in'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Session_requires_active_account"
  BEFORE INSERT ON "Session"
  FOR EACH ROW EXECUTE FUNCTION "session_requires_active_account"();

-- Completing an account deletion request deactivates the account (records are kept).
CREATE FUNCTION "deactivate_account_on_deletion_completed"() RETURNS trigger AS $$
BEGIN
  IF NEW."status"::text = 'COMPLETED' AND OLD."status"::text <> 'COMPLETED' THEN
    UPDATE "User"
      SET "status" = 'DEACTIVATED', "deactivatedAt" = now(), "updatedAt" = now()
      WHERE "id" = NEW."userId" AND "status"::text <> 'DEACTIVATED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AccountDeletionRequest_deactivate_on_completed"
  AFTER UPDATE OF "status" ON "AccountDeletionRequest"
  FOR EACH ROW EXECUTE FUNCTION "deactivate_account_on_deletion_completed"();

-- Every revoked release records why; consent revocation is recorded as such.
ALTER TABLE "IdentityRelease" ADD CONSTRAINT "IdentityRelease_revocation_reason"
  CHECK (("status"::text = 'REVOKED') = ("revocationReason" IS NOT NULL));

ALTER TABLE "IdentityRelease" ADD CONSTRAINT "IdentityRelease_consent_revocation_reason"
  CHECK ("doctorConsentStatus"::text <> 'REVOKED' OR "revocationReason"::text = 'DOCTOR_CONSENT_REVOKED');

-- A release can only be approved while its hire request item is open.
CREATE FUNCTION "identity_release_approval_requires_open_item"() RETURNS trigger AS $$
BEGIN
  IF NEW."status"::text = 'APPROVED'
     AND (TG_OP = 'INSERT' OR OLD."status"::text <> 'APPROVED')
     AND EXISTS (
       SELECT 1 FROM "HireRequestItem" WHERE "id" = NEW."hireRequestItemId" AND "closedAt" IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Identity can only be released for an open hire request item'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IdentityRelease_approval_requires_open_item"
  BEFORE INSERT OR UPDATE OF "status" ON "IdentityRelease"
  FOR EACH ROW EXECUTE FUNCTION "identity_release_approval_requires_open_item"();

-- Cancelling an item revokes its approved release (facility access ends, chat becomes
-- read-only via the existing revocation trigger). The doctor's consent is unchanged.
CREATE FUNCTION "revoke_release_on_item_cancelled"() RETURNS trigger AS $$
BEGIN
  IF NEW."status"::text = 'CANCELLED' AND OLD."status"::text <> 'CANCELLED' THEN
    UPDATE "IdentityRelease"
      SET "status" = 'REVOKED', "revokedAt" = now(),
          "revocationReason" = 'HIRE_REQUEST_CANCELLED', "updatedAt" = now()
      WHERE "hireRequestItemId" = NEW."id" AND "status"::text = 'APPROVED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "HireRequestItem_revoke_release_on_cancelled"
  AFTER UPDATE OF "status" ON "HireRequestItem"
  FOR EACH ROW EXECUTE FUNCTION "revoke_release_on_item_cancelled"();
