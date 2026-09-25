-- DropForeignKey
ALTER TABLE "AttemptAnswer" DROP CONSTRAINT IF EXISTS "AttemptAnswer_questionId_fkey";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AttemptAnswer_questionId_idx" ON "AttemptAnswer"("questionId");
