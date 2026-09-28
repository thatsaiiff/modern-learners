import prisma from "@/lib/prisma";
import { TeacherReviewAction, EvaluationJobStatus, ResultStatus, Prisma } from "@prisma/client";
import { logAudit } from "./audit.service";
import { evaluateAndCreateResult } from "./grading.service";

export interface SubmitTeacherReviewInput {
  submissionId: string;
  action: TeacherReviewAction;
  officialMarks: number;
  maxMarks: number;
  reason?: string;
  feedback?: string;
  rubricAdjustments?: Prisma.InputJsonValue;
}

export async function submitTeacherReview(
  input: SubmitTeacherReviewInput,
  actor: { userId: string; role: string },
  ipAddress?: string | null
) {
  const { submissionId, action, officialMarks, reason, feedback, rubricAdjustments } = input;

  const submission = await prisma.subjectiveSubmission.findUnique({
    where: { id: submissionId },
    include: {
      aiEvaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      teacherReviews: true,
      attempt: {
        include: {
           exam: { include: { examQuestions: true } }
        }
      },
      examQuestion: true,
      question: true,
    },
  });

  if (!submission) throw new Error("Submission not found.");

  // Canonical max marks resolution
  const authoritativeMaxMarks = submission.examQuestion?.marks ?? submission.question?.defaultMarks ?? 0;
  if (!authoritativeMaxMarks) throw new Error("Could not determine authoritative maximum marks.");
    
  if (action !== TeacherReviewAction.REJECTED) {
      if (officialMarks < 0 || officialMarks > authoritativeMaxMarks) {
          throw new Error(`Invalid marks: Must be between 0 and ${authoritativeMaxMarks}.`);
      }
  }

  if (action === TeacherReviewAction.REJECTED && (!reason || reason.trim().length < 3)) {
    throw new Error("A rejection reason is required.");
  }

  if (submission.teacherReviews.length > 0) throw new Error("Submission already reviewed.");

  const aiEvaluation = submission.aiEvaluations[0];
  
  // SEMANTICS:
  // APPROVE: Official = AI proposed.
  // MODIFY: Official = Teacher provided.
  // REJECT: Official evaluated by grading service differently (subjective marks excluded).
  let finalMarks = officialMarks;
  
  if (action === TeacherReviewAction.APPROVED) {
      finalMarks = aiEvaluation?.proposedMarks ?? 0;
  } else if (action === TeacherReviewAction.REJECTED) {
      finalMarks = 0; // The actual marks will not be used in Result calculation because subjectivity is excluded on rejection.
  }

  const marksModified = action === TeacherReviewAction.MODIFIED || (aiEvaluation && finalMarks !== aiEvaluation.proposedMarks);

  return await prisma.$transaction(async (tx) => {
    // Re-check for concurrent reviews inside the transaction
    const existingReview = await tx.teacherEvaluationReview.findFirst({
        where: { submissionId }
    });
    if (existingReview) throw new Error("Submission already reviewed.");

    const review = await tx.teacherEvaluationReview.create({
      data: {
        submissionId,
        aiEvaluationId: aiEvaluation?.id,
        reviewerId: actor.userId,
        action,
        officialMarks: finalMarks,
        maxMarks: authoritativeMaxMarks,
        marksModified,
        scoreDelta: action === TeacherReviewAction.REJECTED ? 0 : finalMarks - (aiEvaluation?.proposedMarks || 0),
        rubricAdjustments,
        teacherNotes: reason,
        feedbackToStudent: feedback,
      },
    });


    await logAudit(
      {
        actorId: actor.userId,
        actorRole: actor.role,
        action: `TEACHER_REVIEW_${action}`,
        entityType: "TeacherEvaluationReview",
        entityId: review.id,
        newValue: {
          submissionId,
          action,
          officialMarks: finalMarks,
        },
        ipAddress,
      },
      tx
    );

    // After review, update evaluation and result
    await evaluateAndCreateResult(submission.attemptId, tx);

    return review;
  });
}
