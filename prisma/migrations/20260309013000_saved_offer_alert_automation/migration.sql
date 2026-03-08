-- AlterTable
ALTER TABLE "User"
ADD COLUMN "savedOfferAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "savedOfferEmailAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;
