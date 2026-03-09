-- CreateEnum
CREATE TYPE "ExperiencePackStatus" AS ENUM ('DRAFT', 'PREVIEWABLE', 'SELECTABLE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "UserExperienceProfile"
ADD COLUMN "activeExperiencePackId" TEXT;

-- CreateTable
CREATE TABLE "ExperiencePack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "status" "ExperiencePackStatus" NOT NULL DEFAULT 'DRAFT',
    "isSelectable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperiencePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperiencePackPage" (
    "id" TEXT NOT NULL,
    "experiencePackId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "viewportLabel" TEXT,
    "imageUrl" TEXT NOT NULL,
    "originalFilename" TEXT,
    "fileSizeBytes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperiencePackPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExperiencePack_slug_key" ON "ExperiencePack"("slug");

-- CreateIndex
CREATE INDEX "ExperiencePack_status_isSelectable_sortOrder_idx" ON "ExperiencePack"("status", "isSelectable", "sortOrder");

-- CreateIndex
CREATE INDEX "ExperiencePack_slug_status_idx" ON "ExperiencePack"("slug", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExperiencePackPage_experiencePackId_routeKey_key" ON "ExperiencePackPage"("experiencePackId", "routeKey");

-- CreateIndex
CREATE INDEX "ExperiencePackPage_routeKey_isPublished_idx" ON "ExperiencePackPage"("routeKey", "isPublished");

-- CreateIndex
CREATE INDEX "ExperiencePackPage_experiencePackId_sortOrder_idx" ON "ExperiencePackPage"("experiencePackId", "sortOrder");

-- CreateIndex
CREATE INDEX "UserExperienceProfile_activeExperiencePackId_idx" ON "UserExperienceProfile"("activeExperiencePackId");

-- AddForeignKey
ALTER TABLE "UserExperienceProfile"
ADD CONSTRAINT "UserExperienceProfile_activeExperiencePackId_fkey"
FOREIGN KEY ("activeExperiencePackId") REFERENCES "ExperiencePack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperiencePackPage"
ADD CONSTRAINT "ExperiencePackPage_experiencePackId_fkey"
FOREIGN KEY ("experiencePackId") REFERENCES "ExperiencePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
