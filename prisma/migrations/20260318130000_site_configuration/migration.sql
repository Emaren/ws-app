-- CreateTable
CREATE TABLE "SiteConfiguration" (
    "id" TEXT NOT NULL,
    "homePagePresetSlug" TEXT NOT NULL DEFAULT 'walnut-rustic-gazette',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfiguration_pkey" PRIMARY KEY ("id")
);
