CREATE TYPE "ArticleCommercePlacement" AS ENUM ('AFTER_FIRST_HEADING', 'CHECKLIST_SPLIT');
CREATE TYPE "ArticleCommerceSide" AS ENUM ('LEFT', 'RIGHT');
CREATE TYPE "ArticleCommerceSizePreset" AS ENUM ('FEATURE', 'COMPACT');

CREATE TABLE "ArticleCommerceModule" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "placement" "ArticleCommercePlacement" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "businessId" TEXT,
    "businessSlug" TEXT,
    "businessName" TEXT,
    "offerId" TEXT,
    "offerTitle" TEXT,
    "inventoryItemId" TEXT,
    "inventoryItemName" TEXT,
    "title" TEXT,
    "badgeText" TEXT,
    "body" TEXT,
    "imageSrc" TEXT,
    "imageAlt" TEXT,
    "caption" TEXT,
    "side" "ArticleCommerceSide" NOT NULL DEFAULT 'RIGHT',
    "sizePreset" "ArticleCommerceSizePreset" NOT NULL DEFAULT 'FEATURE',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleCommerceModule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArticleCommerceModule_articleId_placement_sortOrder_idx"
ON "ArticleCommerceModule"("articleId", "placement", "sortOrder");
CREATE INDEX "ArticleCommerceModule_businessId_idx" ON "ArticleCommerceModule"("businessId");
CREATE INDEX "ArticleCommerceModule_offerId_idx" ON "ArticleCommerceModule"("offerId");
CREATE INDEX "ArticleCommerceModule_inventoryItemId_idx" ON "ArticleCommerceModule"("inventoryItemId");

ALTER TABLE "ArticleCommerceModule"
ADD CONSTRAINT "ArticleCommerceModule_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "Article"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ArticleCommerceModule"
ADD CONSTRAINT "ArticleCommerceModule_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "ArticleCommerceModule"
ADD CONSTRAINT "ArticleCommerceModule_offerId_fkey"
FOREIGN KEY ("offerId") REFERENCES "Offer"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "ArticleCommerceModule"
ADD CONSTRAINT "ArticleCommerceModule_inventoryItemId_fkey"
FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
