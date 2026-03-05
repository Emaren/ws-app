DO $$
BEGIN
  CREATE TYPE "PasswordResetDispatchSource" AS ENUM ('SELF_SERVICE', 'ADMIN_MANUAL', 'ADMIN_RESEND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE "PasswordResetDispatch" (
    "id" TEXT NOT NULL,
    "passwordResetTokenId" TEXT,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" "PasswordResetDispatchSource" NOT NULL,
    "provider" TEXT NOT NULL,
    "delivered" BOOLEAN NOT NULL,
    "reason" TEXT,
    "requestedByUserId" TEXT,
    "requestedByEmail" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetDispatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdentityAutoHealRun" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'manual',
    "wsApiAvailable" BOOLEAN NOT NULL,
    "scannedCount" INTEGER NOT NULL,
    "roleMismatchBefore" INTEGER NOT NULL,
    "roleMismatchAfter" INTEGER NOT NULL,
    "localOnlyCount" INTEGER NOT NULL,
    "wsApiOnlyCount" INTEGER NOT NULL,
    "wsApiRoleUpdated" INTEGER NOT NULL DEFAULT 0,
    "localUsersCreated" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityAutoHealRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicSurfaceProbeRun" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "origin" TEXT NOT NULL,
    "homeUrl" TEXT NOT NULL,
    "apexUrl" TEXT NOT NULL,
    "socialImageUrl" TEXT NOT NULL,
    "xCardBypassUrl" TEXT NOT NULL,
    "homeStatus" INTEGER,
    "apexStatus" INTEGER,
    "socialImageStatus" INTEGER,
    "homeRedirectedTo" TEXT,
    "apexRedirectedTo" TEXT,
    "socialImageContentType" TEXT,
    "hasOgImage" BOOLEAN NOT NULL,
    "hasTwitterCard" BOOLEAN NOT NULL,
    "hasSummaryLargeImage" BOOLEAN NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicSurfaceProbeRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PasswordResetDispatch_userId_createdAt_idx" ON "PasswordResetDispatch"("userId", "createdAt");
CREATE INDEX "PasswordResetDispatch_email_createdAt_idx" ON "PasswordResetDispatch"("email", "createdAt");
CREATE INDEX "PasswordResetDispatch_source_delivered_createdAt_idx" ON "PasswordResetDispatch"("source", "delivered", "createdAt");
CREATE INDEX "PasswordResetDispatch_createdAt_idx" ON "PasswordResetDispatch"("createdAt");

CREATE INDEX "IdentityAutoHealRun_createdAt_idx" ON "IdentityAutoHealRun"("createdAt");
CREATE INDEX "IdentityAutoHealRun_mode_createdAt_idx" ON "IdentityAutoHealRun"("mode", "createdAt");

CREATE INDEX "PublicSurfaceProbeRun_createdAt_idx" ON "PublicSurfaceProbeRun"("createdAt");
CREATE INDEX "PublicSurfaceProbeRun_origin_createdAt_idx" ON "PublicSurfaceProbeRun"("origin", "createdAt");

ALTER TABLE "PasswordResetDispatch"
  ADD CONSTRAINT "PasswordResetDispatch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetDispatch"
  ADD CONSTRAINT "PasswordResetDispatch_passwordResetTokenId_fkey"
  FOREIGN KEY ("passwordResetTokenId") REFERENCES "PasswordResetToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
