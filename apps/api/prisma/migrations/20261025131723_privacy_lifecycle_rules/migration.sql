-- Replaced below by "HireRequestItem_closed_iff_terminal"; must go before the enum type change.
ALTER TABLE "HireRequestItem" DROP CONSTRAINT "HireRequestItem_closed_status_has_closedAt";

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'READ_ONLY');

-- AlterEnum
ALTER TYPE "DoctorConsentStatus" ADD VALUE 'REVOKED';

-- AlterEnum
BEGIN;
CREATE TYPE "HireRequestItemStatus_new" AS ENUM ('REQUESTED', 'IN_COORDINATION', 'AGREED', 'HIRED', 'REJECTED', 'WITHDRAWN', 'CANCELLED');
ALTER TABLE "public"."HireRequestItem" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "HireRequestItem" ALTER COLUMN "status" TYPE "HireRequestItemStatus_new" USING ("status"::text::"HireRequestItemStatus_new");
ALTER TYPE "HireRequestItemStatus" RENAME TO "HireRequestItemStatus_old";
ALTER TYPE "HireRequestItemStatus_new" RENAME TO "HireRequestItemStatus";
DROP TYPE "public"."HireRequestItemStatus_old";
ALTER TABLE "HireRequestItem" ALTER COLUMN "status" SET DEFAULT 'REQUESTED';
COMMIT;

-- AlterTable
ALTER TABLE "ApplicationSubmission" DROP COLUMN "noticePeriod",
DROP COLUMN "referralSource",
ADD COLUMN     "noticePeriodId" UUID,
ADD COLUMN     "referralSourceId" UUID;

-- AlterTable
ALTER TABLE "ContactSubmission" DROP COLUMN "subject",
ADD COLUMN     "subjectId" UUID;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "isClosed",
ADD COLUMN     "readOnlyAt" TIMESTAMP(3),
ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "IdentityRelease" ADD COLUMN     "doctorConsentRevokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "body",
DROP COLUMN "linkPath",
DROP COLUMN "title",
ALTER COLUMN "data" SET NOT NULL,
ALTER COLUMN "data" SET DEFAULT '{}';

-- CreateTable
CREATE TABLE "ContactSubjectOption" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSubjectOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticePeriodOption" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoticePeriodOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralSourceOption" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralSourceOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactSubjectOption_code_key" ON "ContactSubjectOption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "NoticePeriodOption_code_key" ON "NoticePeriodOption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralSourceOption_code_key" ON "ReferralSourceOption"("code");

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_noticePeriodId_fkey" FOREIGN KEY ("noticePeriodId") REFERENCES "NoticePeriodOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_referralSourceId_fkey" FOREIGN KEY ("referralSourceId") REFERENCES "ReferralSourceOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "ContactSubjectOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Database rules not expressible in the Prisma schema (kept out of schema diffing).
-- Enum comparisons use ::text because enum values added in this migration cannot be
-- referenced as enum literals until the migration commits.
-- ---------------------------------------------------------------------------

-- Hire request items stay open through agreement and chat; only terminal outcomes close them.
ALTER TABLE "HireRequestItem" ADD CONSTRAINT "HireRequestItem_closed_iff_terminal"
  CHECK (("status"::text IN ('HIRED', 'REJECTED', 'WITHDRAWN', 'CANCELLED')) = ("closedAt" IS NOT NULL));

ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_closed_iff_terminal"
  CHECK (("status"::text IN ('COMPLETED', 'CANCELLED')) = ("closedAt" IS NOT NULL));

-- A closed hire request item is final; a new request must be created instead of reopening.
CREATE FUNCTION "hire_request_item_cannot_reopen"() RETURNS trigger AS $$
BEGIN
  IF OLD."closedAt" IS NOT NULL AND (NEW."closedAt" IS NULL OR NEW."status" <> OLD."status") THEN
    RAISE EXCEPTION 'Closed hire request items cannot be reopened or changed'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "HireRequestItem_cannot_reopen"
  BEFORE UPDATE ON "HireRequestItem"
  FOR EACH ROW EXECUTE FUNCTION "hire_request_item_cannot_reopen"();

-- Consent revocation: always timestamped, forces the release to REVOKED, and is final.
ALTER TABLE "IdentityRelease" ADD CONSTRAINT "IdentityRelease_consent_revoked_timestamp"
  CHECK (("doctorConsentStatus"::text = 'REVOKED') = ("doctorConsentRevokedAt" IS NOT NULL));

ALTER TABLE "IdentityRelease" ADD CONSTRAINT "IdentityRelease_revoked_consent_revokes_release"
  CHECK ("doctorConsentStatus"::text <> 'REVOKED' OR "status"::text = 'REVOKED');

ALTER TABLE "IdentityRelease" ADD CONSTRAINT "IdentityRelease_revoked_timestamp"
  CHECK (("status"::text = 'REVOKED') = ("revokedAt" IS NOT NULL));

CREATE FUNCTION "identity_release_revocation_is_final"() RETURNS trigger AS $$
BEGIN
  IF (OLD."status"::text = 'REVOKED' AND NEW."status"::text <> 'REVOKED')
     OR (OLD."doctorConsentStatus"::text = 'REVOKED' AND NEW."doctorConsentStatus"::text <> 'REVOKED') THEN
    RAISE EXCEPTION 'A revoked identity release cannot be restored'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IdentityRelease_revocation_is_final"
  BEFORE UPDATE ON "IdentityRelease"
  FOR EACH ROW EXECUTE FUNCTION "identity_release_revocation_is_final"();

-- Revoking a release makes its conversation read-only (history is kept).
CREATE FUNCTION "conversation_read_only_on_revocation"() RETURNS trigger AS $$
BEGIN
  IF NEW."status"::text = 'REVOKED' AND OLD."status"::text <> 'REVOKED' THEN
    UPDATE "Conversation"
      SET "status" = 'READ_ONLY', "readOnlyAt" = now(), "updatedAt" = now()
      WHERE "identityReleaseId" = NEW."id" AND "status"::text = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IdentityRelease_conversation_read_only_on_revocation"
  AFTER UPDATE OF "status" ON "IdentityRelease"
  FOR EACH ROW EXECUTE FUNCTION "conversation_read_only_on_revocation"();

-- Read-only conversations are final and conversations are never deleted.
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_read_only_timestamp"
  CHECK (("status"::text = 'READ_ONLY') = ("readOnlyAt" IS NOT NULL));

CREATE FUNCTION "conversation_history_is_preserved"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Conversations cannot be deleted'
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD."status"::text = 'READ_ONLY' AND NEW."status"::text <> 'READ_ONLY' THEN
    RAISE EXCEPTION 'Read-only conversations cannot be reactivated'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Conversation_history_is_preserved"
  BEFORE UPDATE OR DELETE ON "Conversation"
  FOR EACH ROW EXECUTE FUNCTION "conversation_history_is_preserved"();

-- New messages require an active conversation, a released identity with consent,
-- and a sender who is a participant.
CREATE FUNCTION "message_requires_active_released_conversation"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Conversation" c
    JOIN "IdentityRelease" r ON r."id" = c."identityReleaseId"
    WHERE c."id" = NEW."conversationId"
      AND c."status"::text = 'ACTIVE'
      AND r."status"::text = 'APPROVED'
      AND r."doctorConsentStatus"::text = 'GRANTED'
  ) THEN
    RAISE EXCEPTION 'Messages require an active conversation with consented identity release'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "ConversationParticipant"
    WHERE "conversationId" = NEW."conversationId" AND "userId" = NEW."senderId"
  ) THEN
    RAISE EXCEPTION 'Message sender must be a conversation participant'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Message_requires_active_released_conversation"
  BEFORE INSERT ON "Message"
  FOR EACH ROW EXECUTE FUNCTION "message_requires_active_released_conversation"();

-- Messages in read-only conversations cannot be edited or deleted.
CREATE FUNCTION "message_read_only_history"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Conversation"
    WHERE "id" = OLD."conversationId" AND "status"::text = 'READ_ONLY'
  ) THEN
    RAISE EXCEPTION 'Messages in a read-only conversation cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Message_read_only_history"
  BEFORE UPDATE OR DELETE ON "Message"
  FOR EACH ROW EXECUTE FUNCTION "message_read_only_history"();

-- Audit log is append-only. The only allowed update is the FK clearing actorId
-- when a user is deleted (ON DELETE SET NULL).
CREATE FUNCTION "audit_log_is_append_only"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit log entries cannot be deleted'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."actorId" IS NULL
     AND NEW."id" = OLD."id"
     AND NEW."action" = OLD."action"
     AND NEW."entityType" = OLD."entityType"
     AND NEW."entityId" = OLD."entityId"
     AND NEW."metadata" IS NOT DISTINCT FROM OLD."metadata"
     AND NEW."createdAt" = OLD."createdAt" THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Audit log entries cannot be modified'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_is_append_only"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_is_append_only"();
