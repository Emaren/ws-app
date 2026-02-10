-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('PERCENT_OFF', 'AMOUNT_OFF', 'FIXED_PRICE', 'BOGO', 'CLEARANCE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'LIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('PROMOTION', 'GEO_DROP', 'INVENTORY_FLASH', 'LOYALTY', 'AFFILIATE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "DeliveryLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'RESERVED', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeliveryLeadSource" AS ENUM ('ARTICLE_CTA', 'LOCAL_AD', 'INVENTORY_ALERT', 'CAMPAIGN_CLICK', 'AFFILIATE');

-- CreateEnum
CREATE TYPE "AffiliateNetwork" AS ENUM ('AMAZON', 'LOCAL_DIRECT', 'TOKENTAP', 'OTHER');

-- CreateEnum
CREATE TYPE "RewardToken" AS ENUM ('WHEAT', 'STONE');

-- CreateEnum
CREATE TYPE "RewardDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "ownerUserId" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Edmonton',
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreProfile" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "heroImageUrl" TEXT,
    "websiteUrl" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "deliveryRadiusKm" INTEGER,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unitLabel" TEXT,
    "imageUrl" TEXT,
    "priceCents" INTEGER NOT NULL,
    "compareAtCents" INTEGER,
    "costCents" INTEGER,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" "PricingRuleType" NOT NULL DEFAULT 'PERCENT_OFF',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "percentOff" DECIMAL(5,2),
    "amountOffCents" INTEGER,
    "fixedPriceCents" INTEGER,
    "minQuantity" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "redemptionsUsed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "pricingRuleId" TEXT,
    "campaignId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "badgeText" TEXT,
    "couponCode" TEXT,
    "discountPriceCents" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "unitsTotal" INTEGER,
    "unitsClaimed" INTEGER NOT NULL DEFAULT 0,
    "ctaUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL DEFAULT 'PROMOTION',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "geofenceLatitude" DECIMAL(10,7),
    "geofenceLongitude" DECIMAL(10,7),
    "geofenceRadiusM" INTEGER,
    "budgetCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "pushToken" TEXT,
    "preferredChannel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "pushOptIn" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLead" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "offerId" TEXT,
    "recipientId" TEXT,
    "userId" TEXT,
    "source" "DeliveryLeadSource" NOT NULL DEFAULT 'ARTICLE_CTA',
    "status" "DeliveryLeadStatus" NOT NULL DEFAULT 'NEW',
    "requestedQty" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER,
    "totalCents" INTEGER,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfillBy" TIMESTAMP(3),
    "contactedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "campaignId" TEXT,
    "articleId" TEXT,
    "userId" TEXT,
    "network" "AffiliateNetwork" NOT NULL DEFAULT 'AMAZON',
    "sourceContext" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "referrerUrl" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardLedger" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "campaignId" TEXT,
    "userId" TEXT,
    "token" "RewardToken" NOT NULL,
    "direction" "RewardDirection" NOT NULL DEFAULT 'CREDIT',
    "amount" DECIMAL(20,8) NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "Business_ownerUserId_idx" ON "Business"("ownerUserId");

-- CreateIndex
CREATE INDEX "Business_status_idx" ON "Business"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProfile_businessId_key" ON "StoreProfile"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_businessId_sku_key" ON "InventoryItem"("businessId", "sku");

-- CreateIndex
CREATE INDEX "InventoryItem_businessId_isActive_idx" ON "InventoryItem"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "InventoryItem_expiresAt_idx" ON "InventoryItem"("expiresAt");

-- CreateIndex
CREATE INDEX "PricingRule_businessId_isActive_idx" ON "PricingRule"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "PricingRule_inventoryItemId_idx" ON "PricingRule"("inventoryItemId");

-- CreateIndex
CREATE INDEX "PricingRule_startsAt_endsAt_idx" ON "PricingRule"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_businessId_couponCode_key" ON "Offer"("businessId", "couponCode");

-- CreateIndex
CREATE INDEX "Offer_businessId_status_idx" ON "Offer"("businessId", "status");

-- CreateIndex
CREATE INDEX "Offer_startsAt_endsAt_idx" ON "Offer"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Offer_featured_idx" ON "Offer"("featured");

-- CreateIndex
CREATE INDEX "Campaign_businessId_status_idx" ON "Campaign"("businessId", "status");

-- CreateIndex
CREATE INDEX "Campaign_type_idx" ON "Campaign"("type");

-- CreateIndex
CREATE INDEX "Campaign_startsAt_endsAt_idx" ON "Campaign"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_businessId_email_key" ON "NotificationRecipient"("businessId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_businessId_phone_key" ON "NotificationRecipient"("businessId", "phone");

-- CreateIndex
CREATE INDEX "NotificationRecipient_businessId_idx" ON "NotificationRecipient"("businessId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_idx" ON "NotificationRecipient"("userId");

-- CreateIndex
CREATE INDEX "DeliveryLead_businessId_status_idx" ON "DeliveryLead"("businessId", "status");

-- CreateIndex
CREATE INDEX "DeliveryLead_requestedAt_idx" ON "DeliveryLead"("requestedAt");

-- CreateIndex
CREATE INDEX "DeliveryLead_offerId_idx" ON "DeliveryLead"("offerId");

-- CreateIndex
CREATE INDEX "DeliveryLead_recipientId_idx" ON "DeliveryLead"("recipientId");

-- CreateIndex
CREATE INDEX "AffiliateClick_network_createdAt_idx" ON "AffiliateClick"("network", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_businessId_idx" ON "AffiliateClick"("businessId");

-- CreateIndex
CREATE INDEX "AffiliateClick_campaignId_idx" ON "AffiliateClick"("campaignId");

-- CreateIndex
CREATE INDEX "AffiliateClick_articleId_idx" ON "AffiliateClick"("articleId");

-- CreateIndex
CREATE INDEX "AffiliateClick_userId_idx" ON "AffiliateClick"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardLedger_externalRef_key" ON "RewardLedger"("externalRef");

-- CreateIndex
CREATE INDEX "RewardLedger_userId_token_createdAt_idx" ON "RewardLedger"("userId", "token", "createdAt");

-- CreateIndex
CREATE INDEX "RewardLedger_businessId_token_createdAt_idx" ON "RewardLedger"("businessId", "token", "createdAt");

-- CreateIndex
CREATE INDEX "RewardLedger_campaignId_createdAt_idx" ON "RewardLedger"("campaignId", "createdAt");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProfile" ADD CONSTRAINT "StoreProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLead" ADD CONSTRAINT "DeliveryLead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLead" ADD CONSTRAINT "DeliveryLead_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLead" ADD CONSTRAINT "DeliveryLead_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLead" ADD CONSTRAINT "DeliveryLead_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "NotificationRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLead" ADD CONSTRAINT "DeliveryLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
