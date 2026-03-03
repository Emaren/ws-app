-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIALS', 'GOOGLE', 'APPLE', 'FACEBOOK', 'MICROSOFT', 'GITHUB', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthRegistrationStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "lastAuthAt" TIMESTAMP(3),
ADD COLUMN "lastAuthProvider" "AuthProvider",
ADD COLUMN "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "registeredVia" "AuthProvider" NOT NULL DEFAULT 'CREDENTIALS';

-- CreateTable
CREATE TABLE "AuthRegistrationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "method" "AuthProvider" NOT NULL,
    "status" "AuthRegistrationStatus" NOT NULL,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthRegistrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthRegistrationEvent_createdAt_idx" ON "AuthRegistrationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuthRegistrationEvent_method_status_createdAt_idx" ON "AuthRegistrationEvent"("method", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AuthRegistrationEvent_email_createdAt_idx" ON "AuthRegistrationEvent"("email", "createdAt");

-- CreateIndex
CREATE INDEX "AuthRegistrationEvent_userId_createdAt_idx" ON "AuthRegistrationEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthRegistrationEvent" ADD CONSTRAINT "AuthRegistrationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
