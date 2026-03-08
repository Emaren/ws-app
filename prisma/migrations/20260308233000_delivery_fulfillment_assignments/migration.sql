-- Alter delivery leads to support explicit assignee ownership.
ALTER TABLE "DeliveryLead"
ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "assignedToName" TEXT,
ADD COLUMN "assignedToUserId" TEXT;

ALTER TABLE "DeliveryLead"
ADD CONSTRAINT "DeliveryLead_assignedToUserId_fkey"
FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "DeliveryLead_assignedToUserId_status_idx"
ON "DeliveryLead"("assignedToUserId", "status");
