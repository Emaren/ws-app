CREATE TABLE "FulfillmentAutomationProfile" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "defaultAssigneeUserId" TEXT,
  "defaultAssigneeName" TEXT,
  "autoAssignEnabled" BOOLEAN NOT NULL DEFAULT false,
  "autoEscalateEnabled" BOOLEAN NOT NULL DEFAULT false,
  "slaHours" INTEGER NOT NULL DEFAULT 24,
  "escalationCooldownHours" INTEGER NOT NULL DEFAULT 6,
  "escalationEmail" TEXT,
  "customerContactTemplate" TEXT,
  "delayUpdateTemplate" TEXT,
  "escalationTemplate" TEXT,
  "lastRunAt" TIMESTAMP(3),
  "lastEscalationAt" TIMESTAMP(3),
  "lastRunSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FulfillmentAutomationProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FulfillmentAutomationProfile_businessId_key"
ON "FulfillmentAutomationProfile"("businessId");

CREATE INDEX "FulfillmentAutomationProfile_defaultAssigneeUserId_idx"
ON "FulfillmentAutomationProfile"("defaultAssigneeUserId");

CREATE INDEX "FulfillmentAutomationProfile_lastRunAt_idx"
ON "FulfillmentAutomationProfile"("lastRunAt");

ALTER TABLE "FulfillmentAutomationProfile"
ADD CONSTRAINT "FulfillmentAutomationProfile_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "FulfillmentAutomationProfile"
ADD CONSTRAINT "FulfillmentAutomationProfile_defaultAssigneeUserId_fkey"
FOREIGN KEY ("defaultAssigneeUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
