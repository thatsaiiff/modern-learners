import prisma from "@/lib/prisma";
import { Prisma, RetakeStatus, MultiAttemptRule, AssignmentStatus } from "@prisma/client";
import { logAudit } from "./audit.service";

export interface RequestRetakeInput {
  examId: string;
  reason: string;
}

export interface ReviewRetakeInput {
  approved: boolean;
  reviewComment?: string;
  additionalAttempts?: number;
}

/**
 * Deterministically calculates and marks the official result for analytics based on Exam.multiAttemptRule
 */
export async function updateOfficialAttemptSelection(
  studentId: string,
  examId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  const [exam, results] = await Promise.all([
    db.exam.findUnique({
      where: { id: examId },
    }),
    db.result.findMany({
      where: { studentId, examId },
      include: { attempt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!exam || results.length === 0) {
    return;
  }

  if (results.length === 1) {
    await db.result.update({
      where: { id: results[0].id },
      data: { isOfficial: true },
    });
    return;
  }

  let officialResultId = results[0].id;
  const rule = exam.multiAttemptRule || MultiAttemptRule.BEST;

  if (rule === MultiAttemptRule.FIRST) {
    // Earliest created attempt
    officialResultId = results[0].id;
  } else if (rule === MultiAttemptRule.LATEST) {
    // Most recent attempt
    officialResultId = results[results.length - 1].id;
  } else if (rule === MultiAttemptRule.BEST) {
    // Highest percentage (tie-break on latest)
    let bestScore = -1;
    for (const r of results) {
      if (r.percentage >= bestScore) {
        bestScore = r.percentage;
        officialResultId = r.id;
      }
    }
  } else if (rule === MultiAttemptRule.TEACHER_SELECTED) {
    const explicitlyOfficial = results.find((r) => r.isOfficial);
    officialResultId = explicitlyOfficial ? explicitlyOfficial.id : results[results.length - 1].id;
  }

  // Update all results for this student and exam
  for (const r of results) {
    await db.result.update({
      where: { id: r.id },
      data: { isOfficial: r.id === officialResultId },
    });
  }
}

/**
 * Student requests a retake for a completed exam
 */
export async function requestRetake(
  input: RequestRetakeInput,
  studentId: string,
  ipAddress?: string | null
) {
  const { examId, reason } = input;

  if (!reason || reason.trim().length === 0) {
    throw new Error("A reason must be provided for requesting a retake.");
  }

  // Verify student has completed at least one attempt
  const assignment = await prisma.examAssignment.findUnique({
    where: {
      examId_studentId: {
        examId,
        studentId,
      },
    },
    include: {
      attempts: true,
      exam: true,
    },
  });

  if (!assignment || assignment.attempts.length === 0) {
    throw new Error("You can only request a retake after completing your first exam attempt.");
  }

  // Check for existing pending request
  const existingPending = await prisma.retakeRequest.findFirst({
    where: {
      examId,
      studentId,
      status: RetakeStatus.PENDING,
    },
  });

  if (existingPending) {
    throw new Error("You already have a pending retake request for this examination.");
  }

  const latestAttempt = assignment.attempts[assignment.attempts.length - 1];

  const retake = await prisma.retakeRequest.create({
    data: {
      examId,
      studentId,
      attemptId: latestAttempt?.id || null,
      reason: reason.trim(),
      status: RetakeStatus.PENDING,
    },
  });

  await logAudit({
    actorId: studentId,
    actorRole: "STUDENT",
    action: "RETAKE_REQUESTED",
    entityType: "RetakeRequest",
    entityId: retake.id,
    newValue: {
      examTitle: assignment.exam.title,
      reason,
    },
    ipAddress,
  });

  return retake;
}

/**
 * Admin reviews and approves/rejects a retake request
 */
export async function reviewRetakeRequest(
  requestId: string,
  input: ReviewRetakeInput,
  adminId: string,
  ipAddress?: string | null
) {
  const { approved, reviewComment, additionalAttempts = 1 } = input;

  const request = await prisma.retakeRequest.findUnique({
    where: { id: requestId },
    include: {
      student: true,
      exam: true,
    },
  });

  if (!request) {
    throw new Error("Retake request not found.");
  }

  if (request.status !== RetakeStatus.PENDING) {
    throw new Error(`This request has already been ${request.status.toLowerCase()}.`);
  }

  return await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.retakeRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? RetakeStatus.APPROVED : RetakeStatus.REJECTED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewComment: reviewComment?.trim() || null,
      },
    });

    if (approved) {
      // Find assignment and increment allowedAttempts
      const assignment = await tx.examAssignment.findUnique({
        where: {
          examId_studentId: {
            examId: request.examId,
            studentId: request.studentId,
          },
        },
      });

      if (assignment) {
        await tx.examAssignment.update({
          where: { id: assignment.id },
          data: {
            allowedAttempts: assignment.allowedAttempts + Math.max(1, additionalAttempts),
            status: AssignmentStatus.ASSIGNED,
          },
        });
      }
    }

    await logAudit(
      {
        actorId: adminId,
        actorRole: "ADMIN",
        action: approved ? "RETAKE_APPROVED" : "RETAKE_REJECTED",
        entityType: "RetakeRequest",
        entityId: request.id,
        newValue: {
          approved,
          studentName: request.student.name,
          examTitle: request.exam.title,
          additionalAttempts: approved ? additionalAttempts : 0,
        },
        ipAddress,
      },
      tx
    );

    return updatedRequest;
  });
}

/**
 * Get all retake requests for Admin
 */
export async function getRetakeRequests(query?: {
  status?: RetakeStatus;
  examId?: string;
  classNumber?: number;
}) {
  return prisma.retakeRequest.findMany({
    where: {
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.examId ? { examId: query.examId } : {}),
      ...(query?.classNumber ? { exam: { class: { classNumber: query.classNumber } } } : {}),
    },
    include: {
      student: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { class: true },
          },
        },
      },
      exam: {
        include: { class: true, subject: true },
      },
      reviewer: {
        select: { name: true, role: true },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
}
