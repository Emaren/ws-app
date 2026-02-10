-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM (
    'NONE',
    'INCOMPLETE',
    'INCOMPLETE_EXPIRED',
    'TRIALING',
    'ACTIVE',
    'PAST_DUE',
    'CANCELED',
    'UNPAID',
    'PAUSED'
);

-- CreateTable
CREATE TABLE "SubscriptionEntitlement" (
    "id" TEXT NOT NULL,
    "userExternalId" TEXT,
    "userEmail" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeProductId" TEXT,
    "checkoutSessionId" TEXT,
    "latestInvoiceId" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "mismatchReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionEntitlement_userExternalId_key" ON "SubscriptionEntitlement"("userExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionEntitlement_stripeCustomerId_key" ON "SubscriptionEntitlement"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionEntitlement_stripeSubscriptionId_key" ON "SubscriptionEntitlement"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionEntitlement_userEmail_idx" ON "SubscriptionEntitlement"("userEmail");

-- CreateIndex
CREATE INDEX "SubscriptionEntitlement_plan_idx" ON "SubscriptionEntitlement"("plan");

-- CreateIndex
CREATE INDEX "SubscriptionEntitlement_status_idx" ON "SubscriptionEntitlement"("status");

-- CreateIndex
CREATE INDEX "SubscriptionEntitlement_currentPeriodEnd_idx" ON "SubscriptionEntitlement"("currentPeriodEnd");
