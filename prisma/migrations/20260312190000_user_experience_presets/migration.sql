-- Add first-class preset persistence to user experience profiles.
ALTER TABLE "UserExperienceProfile"
ADD COLUMN "activePresetSlug" TEXT,
ADD COLUMN "savedPresets" JSONB;

ALTER TABLE "UserExperienceProfile"
ALTER COLUMN "activeTheme" SET DEFAULT 'black';

CREATE INDEX "UserExperienceProfile_activePresetSlug_idx"
ON "UserExperienceProfile"("activePresetSlug");
