-- CreateEnum
CREATE TYPE "AuthFunnelStage" AS ENUM (
  'REGISTER_VIEW_STARTED',
  'REGISTER_SUBMIT_ATTEMPTED',
  'REGISTER_SUCCESS',
  'FIRST_LOGIN_SUCCESS'
);

-- CreateTable
CREATE TABLE "AuthFunnelEvent" (
    "id" TEXT NOT NULL,
    "stage" "AuthFunnelStage" NOT NULL,
    "method" "AuthProvider",
    "userId" TEXT,
    "email" TEXT,
    "sessionId" TEXT,
    "sourceContext" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthFunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthFunnelEvent_stage_createdAt_idx" ON "AuthFunnelEvent"("stage", "createdAt");

-- CreateIndex
CREATE INDEX "AuthFunnelEvent_method_stage_createdAt_idx" ON "AuthFunnelEvent"("method", "stage", "createdAt");

-- CreateIndex
CREATE INDEX "AuthFunnelEvent_userId_stage_createdAt_idx" ON "AuthFunnelEvent"("userId", "stage", "createdAt");

-- CreateIndex
CREATE INDEX "AuthFunnelEvent_email_stage_createdAt_idx" ON "AuthFunnelEvent"("email", "stage", "createdAt");

-- CreateIndex
CREATE INDEX "AuthFunnelEvent_sessionId_stage_createdAt_idx" ON "AuthFunnelEvent"("sessionId", "stage", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthFunnelEvent" ADD CONSTRAINT "AuthFunnelEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
