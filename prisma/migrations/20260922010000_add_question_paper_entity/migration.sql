-- CreateEnum
CREATE TYPE "PaperSourceType" AS ENUM ('HTML_IMPORT', 'MANUAL', 'AI_GENERATED', 'DUPLICATED');

-- CreateEnum
CREATE TYPE "PaperStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "questionPaperId" TEXT;

-- CreateTable
CREATE TABLE "QuestionPaper" (
    "id" TEXT NOT NULL,
    "paperCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "chapter" TEXT,
    "topic" TEXT,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sourceType" "PaperSourceType" NOT NULL DEFAULT 'HTML_IMPORT',
    "sourceMeta" JSONB,
    "status" "PaperStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPaperQuestion" (
    "id" TEXT NOT NULL,
    "questionPaperId" TEXT NOT NULL,
    "questionId" TEXT,
    "questionSnapshot" JSONB NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "orderNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionPaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPaper_paperCode_key" ON "QuestionPaper"("paperCode");

-- CreateIndex
CREATE INDEX "QuestionPaper_classId_subjectId_idx" ON "QuestionPaper"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "QuestionPaper_status_idx" ON "QuestionPaper"("status");

-- CreateIndex
CREATE INDEX "QuestionPaperQuestion_questionPaperId_idx" ON "QuestionPaperQuestion"("questionPaperId");

-- CreateIndex
CREATE INDEX "Exam_questionPaperId_idx" ON "Exam"("questionPaperId");

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaperQuestion" ADD CONSTRAINT "QuestionPaperQuestion_questionPaperId_fkey" FOREIGN KEY ("questionPaperId") REFERENCES "QuestionPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaperQuestion" ADD CONSTRAINT "QuestionPaperQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_questionPaperId_fkey" FOREIGN KEY ("questionPaperId") REFERENCES "QuestionPaper"("id") ON DELETE SET NULL ON UPDATE CASCADE;
