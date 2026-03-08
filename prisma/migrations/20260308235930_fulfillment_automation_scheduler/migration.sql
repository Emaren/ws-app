CREATE TYPE "FulfillmentAutomationRunSource" AS ENUM ('MANUAL', 'SCHEDULED');

CREATE TYPE "FulfillmentAutomationRunStatus" AS ENUM ('SUCCESS', 'SKIPPED', 'FAILED');

CREATE TYPE "FulfillmentAutomationAlertType" AS ENUM ('ESCALATION', 'DIGEST');

CREATE TYPE "FulfillmentAutomationAlertStatus" AS ENUM ('QUEUED', 'SKIPPED', 'FAILED');

ALTER TABLE "FulfillmentAutomationProfile"
ADD COLUMN "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "scheduleIntervalHours" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "digestCadenceHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN "digestEmail" TEXT,
ADD COLUMN "digestTemplate" TEXT,
ADD COLUMN "lastDigestAt" TIMESTAMP(3);

CREATE TABLE "FulfillmentAutomationRun" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "source" "FulfillmentAutomationRunSource" NOT NULL DEFAULT 'MANUAL',
    "status" "FulfillmentAutomationRunStatus" NOT NULL DEFAULT 'SUCCESS',
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "autoAssignedCount" INTEGER NOT NULL DEFAULT 0,
    "overdueLeadCount" INTEGER NOT NULL DEFAULT 0,
    "openLeadCount" INTEGER NOT NULL DEFAULT 0,
    "unassignedLeadCount" INTEGER NOT NULL DEFAULT 0,
    "escalationQueued" BOOLEAN NOT NULL DEFAULT false,
    "digestQueued" BOOLEAN NOT NULL DEFAULT false,
    "escalationSkippedReason" TEXT,
    "digestSkippedReason" TEXT,
    "processSummary" JSONB,
    "summary" JSONB,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FulfillmentAutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FulfillmentAutomationAlert" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "runId" TEXT,
    "type" "FulfillmentAutomationAlertType" NOT NULL,
    "status" "FulfillmentAutomationAlertStatus" NOT NULL DEFAULT 'QUEUED',
    "recipientEmail" TEXT,
    "subject" TEXT,
    "leadCount" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FulfillmentAutomationAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FulfillmentAutomationProfile_scheduleEnabled_lastRunAt_idx" ON "FulfillmentAutomationProfile"("scheduleEnabled", "lastRunAt");

CREATE INDEX "FulfillmentAutomationProfile_digestEnabled_lastDigestAt_idx" ON "FulfillmentAutomationProfile"("digestEnabled", "lastDigestAt");

CREATE INDEX "FulfillmentAutomationRun_profileId_startedAt_idx" ON "FulfillmentAutomationRun"("profileId", "startedAt");

CREATE INDEX "FulfillmentAutomationRun_businessId_startedAt_idx" ON "FulfillmentAutomationRun"("businessId", "startedAt");

CREATE INDEX "FulfillmentAutomationRun_source_startedAt_idx" ON "FulfillmentAutomationRun"("source", "startedAt");

CREATE INDEX "FulfillmentAutomationRun_status_startedAt_idx" ON "FulfillmentAutomationRun"("status", "startedAt");

CREATE INDEX "FulfillmentAutomationAlert_profileId_createdAt_idx" ON "FulfillmentAutomationAlert"("profileId", "createdAt");

CREATE INDEX "FulfillmentAutomationAlert_businessId_createdAt_idx" ON "FulfillmentAutomationAlert"("businessId", "createdAt");

CREATE INDEX "FulfillmentAutomationAlert_type_createdAt_idx" ON "FulfillmentAutomationAlert"("type", "createdAt");

CREATE INDEX "FulfillmentAutomationAlert_status_createdAt_idx" ON "FulfillmentAutomationAlert"("status", "createdAt");

ALTER TABLE "FulfillmentAutomationRun"
ADD CONSTRAINT "FulfillmentAutomationRun_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "FulfillmentAutomationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FulfillmentAutomationRun"
ADD CONSTRAINT "FulfillmentAutomationRun_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FulfillmentAutomationAlert"
ADD CONSTRAINT "FulfillmentAutomationAlert_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "FulfillmentAutomationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FulfillmentAutomationAlert"
ADD CONSTRAINT "FulfillmentAutomationAlert_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FulfillmentAutomationAlert"
ADD CONSTRAINT "FulfillmentAutomationAlert_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "FulfillmentAutomationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
