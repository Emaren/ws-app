CREATE TABLE "ReviewProfile" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "brandName" TEXT,
    "category" TEXT,
    "reviewScore" INTEGER,
    "verdict" TEXT,
    "organicStatus" TEXT,
    "recommendedFor" TEXT,
    "avoidFor" TEXT,
    "localAvailability" TEXT,
    "conventionalTitle" TEXT,
    "conventionalHref" TEXT,
    "conventionalImageSrc" TEXT,
    "conventionalBadge" TEXT,
    "conventionalPriceHint" TEXT,
    "organicTitle" TEXT,
    "organicHref" TEXT,
    "organicImageSrc" TEXT,
    "organicBadge" TEXT,
    "organicPriceHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewProfile_articleId_key" ON "ReviewProfile"("articleId");
CREATE INDEX "ReviewProfile_productName_idx" ON "ReviewProfile"("productName");
CREATE INDEX "ReviewProfile_category_idx" ON "ReviewProfile"("category");

ALTER TABLE "ReviewProfile"
ADD CONSTRAINT "ReviewProfile_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "Article"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
