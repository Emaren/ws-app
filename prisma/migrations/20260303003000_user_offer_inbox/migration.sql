DO $$
BEGIN
  CREATE TYPE "OfferAssignmentMode" AS ENUM ('ALL', 'DIRECT', 'SEGMENT', 'BACKFILL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "OfferInboxStatus" AS ENUM ('ACTIVE', 'SEEN', 'REDEEMED', 'EXPIRED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE "UserOfferInbox" (
    "id" TEXT NOT NULL,
    "userExternalId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT,
    "offerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "assignedByExternal" TEXT,
    "assignedByEmail" TEXT,
    "assignmentMode" "OfferAssignmentMode" NOT NULL DEFAULT 'DIRECT',
    "status" "OfferInboxStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "UserOfferInbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserOfferInbox_userExternalId_offerId_key"
  ON "UserOfferInbox"("userExternalId", "offerId");

CREATE INDEX "UserOfferInbox_userExternalId_status_assignedAt_idx"
  ON "UserOfferInbox"("userExternalId", "status", "assignedAt");

CREATE INDEX "UserOfferInbox_userEmail_status_assignedAt_idx"
  ON "UserOfferInbox"("userEmail", "status", "assignedAt");

CREATE INDEX "UserOfferInbox_businessId_status_assignedAt_idx"
  ON "UserOfferInbox"("businessId", "status", "assignedAt");

CREATE INDEX "UserOfferInbox_offerId_status_idx"
  ON "UserOfferInbox"("offerId", "status");

ALTER TABLE "UserOfferInbox"
  ADD CONSTRAINT "UserOfferInbox_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserOfferInbox"
  ADD CONSTRAINT "UserOfferInbox_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
