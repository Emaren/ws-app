-- CreateTable
CREATE TABLE "UserExperienceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "activeTheme" TEXT NOT NULL DEFAULT 'gray',
    "activeSkin" TEXT NOT NULL DEFAULT 'editorial',
    "activeSiteVersion" TEXT NOT NULL DEFAULT 'v1',
    "personalDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "digestCadenceHours" INTEGER NOT NULL DEFAULT 168,
    "lastDigestAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "lastSeenPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserExperienceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserExperienceHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferenceKey" TEXT NOT NULL,
    "previousValue" TEXT,
    "nextValue" TEXT NOT NULL,
    "sourceContext" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserExperienceHistory_pkey" PRIMARY KEY ("id")
);

-- AlterEnum
ALTER TYPE "AnalyticsEventType" ADD VALUE 'PAGE_VIEW';

-- CreateIndex
CREATE UNIQUE INDEX "UserExperienceProfile_userId_key" ON "UserExperienceProfile"("userId");

-- CreateIndex
CREATE INDEX "UserExperienceProfile_activeTheme_idx" ON "UserExperienceProfile"("activeTheme");

-- CreateIndex
CREATE INDEX "UserExperienceProfile_activeSkin_idx" ON "UserExperienceProfile"("activeSkin");

-- CreateIndex
CREATE INDEX "UserExperienceProfile_activeSiteVersion_idx" ON "UserExperienceProfile"("activeSiteVersion");

-- CreateIndex
CREATE INDEX "UserExperienceProfile_lastSeenAt_idx" ON "UserExperienceProfile"("lastSeenAt");

-- CreateIndex
CREATE INDEX "UserExperienceHistory_userId_preferenceKey_createdAt_idx" ON "UserExperienceHistory"("userId", "preferenceKey", "createdAt");

-- CreateIndex
CREATE INDEX "UserExperienceHistory_preferenceKey_createdAt_idx" ON "UserExperienceHistory"("preferenceKey", "createdAt");

-- AddForeignKey
ALTER TABLE "UserExperienceProfile" ADD CONSTRAINT "UserExperienceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserExperienceHistory" ADD CONSTRAINT "UserExperienceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
