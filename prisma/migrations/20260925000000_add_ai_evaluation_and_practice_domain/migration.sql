-- CreateEnum
CREATE TYPE "SubmissionFormat" AS ENUM ('TYPED_TEXT', 'HANDWRITTEN_DOCUMENT', 'HYBRID');

-- CreateEnum
CREATE TYPE "EvaluationJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'FAILED_VALIDATION');

-- CreateEnum
CREATE TYPE "TeacherReviewAction" AS ENUM ('APPROVED', 'MODIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PracticeSourceType" AS ENUM ('ADMIN_CREATED', 'STUDENT_UPLOAD', 'AI_GENERATED', 'DUPLICATED');

-- CreateEnum
CREATE TYPE "PracticeVisibility" AS ENUM ('PRIVATE', 'SHARED_CLASS', 'PUBLIC_ACADEMY');

-- CreateEnum
CREATE TYPE "PracticeAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'ABANDONED');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "rubric" JSONB;

-- CreateTable
CREATE TABLE "SubjectiveSubmission" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT,
    "examQuestionId" TEXT,
    "submissionFormat" "SubmissionFormat" NOT NULL DEFAULT 'TYPED_TEXT',
    "typedContent" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectiveSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionDocument" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "structuredExtraction" JSONB,
    "ocrConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationJob" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" "EvaluationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "targetModel" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorMeta" JSONB,

    CONSTRAINT "EvaluationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIEvaluation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "jobId" TEXT,
    "proposedMarks" DOUBLE PRECISION NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "criteriaEvaluations" JSONB NOT NULL,
    "deductions" JSONB NOT NULL,
    "positiveFeedback" TEXT NOT NULL,
    "improvementSuggestions" JSONB NOT NULL,
    "extractedAnswerSummary" TEXT,
    "uncertainties" JSONB,
    "modelProvider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "promptHash" TEXT,
    "tokenUsage" JSONB NOT NULL,
    "estimatedCostUsd" DOUBLE PRECISION,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherEvaluationReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "aiEvaluationId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "action" "TeacherReviewAction" NOT NULL DEFAULT 'APPROVED',
    "officialMarks" DOUBLE PRECISION NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "marksModified" BOOLEAN NOT NULL DEFAULT false,
    "scoreDelta" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rubricAdjustments" JSONB,
    "teacherNotes" TEXT,
    "feedbackToStudent" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherEvaluationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticePaper" (
    "id" TEXT NOT NULL,
    "practiceCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "classId" TEXT,
    "subjectId" TEXT,
    "chapter" TEXT,
    "topic" TEXT,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "sourceType" "PracticeSourceType" NOT NULL DEFAULT 'STUDENT_UPLOAD',
    "sourceMeta" JSONB,
    "visibility" "PracticeVisibility" NOT NULL DEFAULT 'PRIVATE',
    "ownerStudentId" TEXT,
    "createdBy" TEXT,
    "status" "PaperStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticePaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticePaperQuestion" (
    "id" TEXT NOT NULL,
    "practicePaperId" TEXT NOT NULL,
    "questionSnapshot" JSONB NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "orderNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticePaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL,
    "practicePaperId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" "PracticeAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeAttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "selectedOptions" JSONB,
    "answerText" TEXT,
    "numericAnswer" DOUBLE PRECISION,
    "isCorrect" BOOLEAN,
    "marksAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "aiEvaluation" JSONB,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeResult" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "practicePaperId" TEXT NOT NULL,
    "rawMarks" DOUBLE PRECISION NOT NULL,
    "maximumMarks" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "performanceLabel" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "unansweredCount" INTEGER NOT NULL DEFAULT 0,
    "topicBreakdown" JSONB,
    "aiTutorFeedback" JSONB,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubjectiveSubmission_attemptId_idx" ON "SubjectiveSubmission"("attemptId");

-- CreateIndex
CREATE INDEX "SubjectiveSubmission_questionId_idx" ON "SubjectiveSubmission"("questionId");

-- CreateIndex
CREATE INDEX "SubjectiveSubmission_examQuestionId_idx" ON "SubjectiveSubmission"("examQuestionId");

-- CreateIndex
CREATE INDEX "SubmissionDocument_submissionId_idx" ON "SubmissionDocument"("submissionId");

-- CreateIndex
CREATE INDEX "EvaluationJob_submissionId_idx" ON "EvaluationJob"("submissionId");

-- CreateIndex
CREATE INDEX "EvaluationJob_status_idx" ON "EvaluationJob"("status");

-- CreateIndex
CREATE INDEX "AIEvaluation_submissionId_idx" ON "AIEvaluation"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherEvaluationReview_aiEvaluationId_key" ON "TeacherEvaluationReview"("aiEvaluationId");

-- CreateIndex
CREATE INDEX "TeacherEvaluationReview_submissionId_idx" ON "TeacherEvaluationReview"("submissionId");

-- CreateIndex
CREATE INDEX "TeacherEvaluationReview_reviewerId_idx" ON "TeacherEvaluationReview"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticePaper_practiceCode_key" ON "PracticePaper"("practiceCode");

-- CreateIndex
CREATE INDEX "PracticePaper_ownerStudentId_idx" ON "PracticePaper"("ownerStudentId");

-- CreateIndex
CREATE INDEX "PracticePaper_classId_subjectId_idx" ON "PracticePaper"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "PracticePaper_visibility_idx" ON "PracticePaper"("visibility");

-- CreateIndex
CREATE INDEX "PracticePaper_status_idx" ON "PracticePaper"("status");

-- CreateIndex
CREATE INDEX "PracticePaperQuestion_practicePaperId_idx" ON "PracticePaperQuestion"("practicePaperId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_practicePaperId_studentId_idx" ON "PracticeAttempt"("practicePaperId", "studentId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_status_idx" ON "PracticeAttempt"("status");

-- CreateIndex
CREATE INDEX "PracticeAttemptAnswer_attemptId_idx" ON "PracticeAttemptAnswer"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeResult_attemptId_key" ON "PracticeResult"("attemptId");

-- CreateIndex
CREATE INDEX "PracticeResult_studentId_idx" ON "PracticeResult"("studentId");

-- CreateIndex
CREATE INDEX "PracticeResult_practicePaperId_idx" ON "PracticeResult"("practicePaperId");

-- AddForeignKey
ALTER TABLE "SubjectiveSubmission" ADD CONSTRAINT "SubjectiveSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectiveSubmission" ADD CONSTRAINT "SubjectiveSubmission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectiveSubmission" ADD CONSTRAINT "SubjectiveSubmission_examQuestionId_fkey" FOREIGN KEY ("examQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionDocument" ADD CONSTRAINT "SubmissionDocument_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SubjectiveSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationJob" ADD CONSTRAINT "EvaluationJob_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SubjectiveSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEvaluation" ADD CONSTRAINT "AIEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SubjectiveSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEvaluation" ADD CONSTRAINT "AIEvaluation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "EvaluationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEvaluationReview" ADD CONSTRAINT "TeacherEvaluationReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SubjectiveSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEvaluationReview" ADD CONSTRAINT "TeacherEvaluationReview_aiEvaluationId_fkey" FOREIGN KEY ("aiEvaluationId") REFERENCES "AIEvaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEvaluationReview" ADD CONSTRAINT "TeacherEvaluationReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticePaper" ADD CONSTRAINT "PracticePaper_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticePaper" ADD CONSTRAINT "PracticePaper_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticePaper" ADD CONSTRAINT "PracticePaper_ownerStudentId_fkey" FOREIGN KEY ("ownerStudentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticePaper" ADD CONSTRAINT "PracticePaper_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticePaperQuestion" ADD CONSTRAINT "PracticePaperQuestion_practicePaperId_fkey" FOREIGN KEY ("practicePaperId") REFERENCES "PracticePaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_practicePaperId_fkey" FOREIGN KEY ("practicePaperId") REFERENCES "PracticePaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttemptAnswer" ADD CONSTRAINT "PracticeAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeResult" ADD CONSTRAINT "PracticeResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeResult" ADD CONSTRAINT "PracticeResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeResult" ADD CONSTRAINT "PracticeResult_practicePaperId_fkey" FOREIGN KEY ("practicePaperId") REFERENCES "PracticePaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
