-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- AlterTable
ALTER TABLE "Result" ADD COLUMN "status" "ResultStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "correctionReason" TEXT,
ADD COLUMN "correctedAt" TIMESTAMP(3),
ADD COLUMN "correctedBy" TEXT;

-- CreateIndex
CREATE INDEX "Result_status_idx" ON "Result"("status");

-- CreateIndex
CREATE INDEX "Result_isOfficial_status_idx" ON "Result"("isOfficial", "status");
