-- AlterTable
ALTER TABLE "ExamAssignment" ADD COLUMN "isEligible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "ineligibilityReason" TEXT;
