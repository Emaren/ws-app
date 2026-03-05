CREATE TABLE "AccountRescueRun" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "targetUserId" TEXT,
    "targetEmail" TEXT NOT NULL,
    "wsApiAvailable" BOOLEAN NOT NULL,
    "localPasswordUpdated" BOOLEAN NOT NULL,
    "wsApiPasswordUpdated" BOOLEAN NOT NULL,
    "resetDispatchDelivered" BOOLEAN NOT NULL,
    "resetDispatchProvider" TEXT NOT NULL,
    "resetDispatchReason" TEXT,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRescueRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountRescueRun_targetEmail_createdAt_idx" ON "AccountRescueRun"("targetEmail", "createdAt");
CREATE INDEX "AccountRescueRun_createdAt_idx" ON "AccountRescueRun"("createdAt");
