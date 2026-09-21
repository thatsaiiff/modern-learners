import prisma from "@/lib/prisma";
import { AttemptStatus, AssignmentStatus, StudentStatus, Prisma } from "@prisma/client";
import { logAudit } from "./audit.service";
import { evaluateAndCreateResult } from "./grading.service";

export interface SaveAnswerInput {
  attemptId: string;
  questionId: string;
  selectedOptions?: string[];
  answerText?: string;
  numericAnswer?: number;
}

interface RawOption {
  id: string;
  text: string;
}

interface RawSnapshot {
  customId?: string;
  type?: string;
  topic?: string;
  difficulty?: string;
  question?: { text: string; image?: { src: string; alt?: string; width?: number } };
  options?: RawOption[];
}

/**
 * Deterministically shuffles an array using Fisher-Yates
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Validates eligibility, initializes a server-authoritative timer, and starts/resumes an exam attempt
 */
export async function startExamAttempt(
  examId: string,
  studentId: string,
  ipAddress?: string | null
) {
  const now = new Date();

  // 1. Verify Student is Active
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student || student.status !== StudentStatus.ACTIVE) {
    throw new Error("Student account is inactive or not found.");
  }

  // 2. Fetch Exam & Assignment
  const assignment = await prisma.examAssignment.findUnique({
    where: {
      examId_studentId: {
        examId,
        studentId,
      },
    },
    include: {
      exam: {
        include: {
          examQuestions: {
            orderBy: { orderNumber: "asc" },
          },
          class: true,
          subject: true,
        },
      },
      attempts: {
        orderBy: { attemptNumber: "desc" },
      },
    },
  });

  if (!assignment) {
    throw new Error("This examination has not been assigned to you.");
  }

  const exam = assignment.exam;

  if (exam.examQuestions.length === 0) {
    throw new Error("This examination has no questions configured.");
  }

  // 3. Timing Validation (Server-Authoritative)
  if (now < new Date(exam.startAt)) {
    throw new Error(
      `This exam is scheduled to open at ${new Date(exam.startAt).toLocaleString()}.`
    );
  }

  if (now > new Date(exam.loginDeadline)) {
    throw new Error(
      `The exam entry window closed at ${new Date(exam.loginDeadline).toLocaleString()}.`
    );
  }

  // 4. Check for active In-Progress attempt
  const inProgressAttempt = assignment.attempts.find((a) => a.status === "IN_PROGRESS");

  if (inProgressAttempt) {
    if (now <= inProgressAttempt.serverDeadline) {
      // Resume existing active attempt
      return await getAttemptDeliveryPayload(inProgressAttempt.id, studentId);
    } else {
      // Auto-submit expired attempt
      await submitAttempt(inProgressAttempt.id, studentId, true);
    }
  }

  // 5. Check Attempt Limit
  const completedAttemptsCount = assignment.attempts.filter(
    (a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED"
  ).length;

  if (completedAttemptsCount >= assignment.allowedAttempts) {
    throw new Error("You have reached the maximum allowed attempts for this exam.");
  }

  // 6. Create New Attempt in Transaction
  return await prisma.$transaction(async (tx) => {
    const attemptNumber = assignment.attempts.length + 1;
    const startedAt = new Date();
    // Default PRD Rule: Full duration granted upon valid start within availability window
    const serverDeadline = new Date(startedAt.getTime() + exam.durationMinutes * 60 * 1000);

    const attempt = await tx.examAttempt.create({
      data: {
        examId: exam.id,
        studentId,
        assignmentId: assignment.id,
        attemptNumber,
        startedAt,
        serverDeadline,
        status: AttemptStatus.IN_PROGRESS,
        autoSubmitted: false,
      },
    });

    // Prepare Questions for Student
    let questionsToPrepare = [...exam.examQuestions];
    if (exam.randomizeQuestions) {
      questionsToPrepare = shuffleArray(questionsToPrepare);
    }

    for (let i = 0; i < questionsToPrepare.length; i++) {
      const eq = questionsToPrepare[i];
      const snap = eq.questionSnapshot as unknown as RawSnapshot;

      let optionOrder: string[] | null = null;
      if (snap?.options && Array.isArray(snap.options)) {
        if (exam.randomizeOptions) {
          const shuffledOptions = shuffleArray(snap.options);
          optionOrder = shuffledOptions.map((o) => o.id);
        } else {
          optionOrder = snap.options.map((o) => o.id);
        }
      }

      // Strip correct answers from delivery snapshot
      const sanitizedStudentSnapshot = {
        customId: snap?.customId || "Q-" + eq.id.slice(0, 8),
        type: snap?.type,
        topic: snap?.topic,
        difficulty: snap?.difficulty,
        marks: eq.marks,
        question: snap?.question,
        options: snap?.options?.map((opt) => ({
          id: opt.id,
          text: opt.text,
          // Never disclose correct: true/false before submission!
        })),
      };

      await tx.attemptQuestion.create({
        data: {
          attemptId: attempt.id,
          examQuestionId: eq.id,
          questionId: eq.questionId || null,
          displayOrder: i + 1,
          optionOrder: optionOrder ? (optionOrder as unknown as Prisma.InputJsonValue) : undefined,
          questionSnapshot: sanitizedStudentSnapshot as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await tx.examAssignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.STARTED },
    });

    await logAudit(
      {
        actorId: student.id,
        actorRole: "STUDENT",
        action: "EXAM_STARTED",
        entityType: "ExamAttempt",
        entityId: attempt.id,
        newValue: {
          examTitle: exam.title,
          attemptNumber,
          startedAt,
          serverDeadline,
        },
        ipAddress,
      },
      tx
    );

    return await getAttemptDeliveryPayload(attempt.id, studentId, tx);
  });
}

/**
 * Returns the student-safe exam payload with saved answers and server-authoritative timer countdown
 */
export async function getAttemptDeliveryPayload(
  attemptId: string,
  studentId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  const now = new Date();

  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          class: true,
          subject: true,
        },
      },
      attemptQuestions: {
        orderBy: { displayOrder: "asc" },
      },
      attemptAnswers: true,
    },
  });

  if (!attempt) {
    throw new Error("Exam attempt not found.");
  }

  // Authorization: Student ownership check
  if (attempt.studentId !== studentId) {
    throw new Error("Unauthorized access to this examination attempt.");
  }

  // Check if deadline has passed
  if (attempt.status === AttemptStatus.IN_PROGRESS && now > attempt.serverDeadline) {
    // Auto-submit expired attempt
    await submitAttempt(attemptId, studentId, true);
    attempt.status = AttemptStatus.AUTO_SUBMITTED;
  }

  const remainingSeconds =
    attempt.status === AttemptStatus.IN_PROGRESS
      ? Math.max(0, Math.floor((new Date(attempt.serverDeadline).getTime() - Date.now()) / 1000))
      : 0;

  // Build answer lookup map
  const answersMap: Record<
    string,
    { selectedOptions?: string[]; answerText?: string; numericAnswer?: number }
  > = {};

  for (const ans of attempt.attemptAnswers) {
    const key = ans.questionId || ans.id;
    answersMap[key] = {
      selectedOptions: (ans.selectedOptions as string[]) || undefined,
      answerText: ans.answerText || undefined,
      numericAnswer: ans.numericAnswer !== null ? ans.numericAnswer : undefined,
    };
  }

  // Build clean delivery questions
  const questions = attempt.attemptQuestions.map((aq) => {
    const snap = aq.questionSnapshot as unknown as RawSnapshot;
    const optionOrder = aq.optionOrder as string[] | null;

    let orderedOptions: RawOption[] = snap?.options || [];
    if (optionOrder && Array.isArray(optionOrder)) {
      const optMap = new Map(orderedOptions.map((o) => [o.id, o]));
      orderedOptions = optionOrder.map((id) => optMap.get(id)).filter(Boolean) as RawOption[];
    }

    const questionKey = aq.questionId || snap?.customId || aq.id;

    return {
      id: aq.id,
      questionKey,
      displayOrder: aq.displayOrder,
      customId: snap?.customId,
      type: snap?.type || "mcq",
      topic: snap?.topic,
      difficulty: snap?.difficulty,
      marks: 1,
      question: snap?.question || { text: "" },
      options: orderedOptions.map((o) => ({
        id: o.id,
        text: o.text,
      })),
      currentAnswer: answersMap[questionKey] || null,
    };
  });

  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    examTitle: attempt.exam.title,
    className: attempt.exam.class.name,
    subjectName: attempt.exam.subject.name,
    instructions: attempt.exam.instructions,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    startedAt: attempt.startedAt,
    serverDeadline: attempt.serverDeadline,
    durationMinutes: attempt.exam.durationMinutes,
    remainingSeconds,
    totalQuestions: questions.length,
    questions,
  };
}

/**
 * Autosaves student answers. Validates that server deadline has not passed.
 */
export async function saveAttemptAnswer(
  input: SaveAnswerInput,
  studentId: string
) {
  const { attemptId, questionId, selectedOptions, answerText, numericAnswer } = input;

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt) {
    throw new Error("Exam attempt not found.");
  }

  // Authorization check
  if (attempt.studentId !== studentId) {
    throw new Error("Unauthorized to modify this attempt.");
  }

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new Error("Cannot save answer: This exam attempt has already been finalized.");
  }

  // Authoritative Server Deadline Check (with 15s network latency grace period)
  const deadlineWithGrace = new Date(attempt.serverDeadline.getTime() + 15000);
  if (new Date() > deadlineWithGrace) {
    await submitAttempt(attemptId, studentId, true);
    throw new Error(
      "Your exam time limit has expired. Your attempt has been automatically submitted."
    );
  }

  // Find existing answer or create
  const existingAnswer = await prisma.attemptAnswer.findFirst({
    where: {
      attemptId,
      questionId,
    },
  });

  if (existingAnswer) {
    await prisma.attemptAnswer.update({
      where: { id: existingAnswer.id },
      data: {
        selectedOptions: selectedOptions ? (selectedOptions as unknown as Prisma.InputJsonValue) : undefined,
        answerText: answerText !== undefined ? answerText : existingAnswer.answerText,
        numericAnswer: numericAnswer !== undefined ? numericAnswer : existingAnswer.numericAnswer,
        answeredAt: new Date(),
      },
    });
  } else {
    await prisma.attemptAnswer.create({
      data: {
        attemptId,
        questionId,
        selectedOptions: selectedOptions ? (selectedOptions as unknown as Prisma.InputJsonValue) : undefined,
        answerText: answerText || null,
        numericAnswer: numericAnswer !== undefined ? numericAnswer : null,
        answeredAt: new Date(),
      },
    });
  }

  return {
    success: true,
    savedAt: new Date(),
  };
}

/**
 * Closes an exam attempt (manual or automatic). Idempotent.
 */
export async function submitAttempt(
  attemptId: string,
  studentId: string,
  autoSubmitted = false,
  ipAddress?: string | null
) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true, assignment: true },
  });

  if (!attempt) {
    throw new Error("Attempt not found.");
  }

  // Authorization check
  if (attempt.studentId !== studentId) {
    throw new Error("Unauthorized.");
  }

  // Idempotency: If already submitted, return cleanly
  if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.AUTO_SUBMITTED) {
    return {
      success: true,
      alreadySubmitted: true,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
    };
  }

  const now = new Date();
  const submittedAt = autoSubmitted ? attempt.serverDeadline : now;
  const durationSeconds = Math.max(
    0,
    Math.floor((submittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000)
  );

  return await prisma.$transaction(async (tx) => {
    const updatedAttempt = await tx.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: autoSubmitted ? AttemptStatus.AUTO_SUBMITTED : AttemptStatus.SUBMITTED,
        submittedAt,
        durationSeconds,
        autoSubmitted,
      },
    });

    await tx.examAssignment.update({
      where: { id: attempt.assignmentId },
      data: { status: AssignmentStatus.COMPLETED },
    });

    await logAudit(
      {
        actorId: studentId,
        actorRole: "STUDENT",
        action: autoSubmitted ? "EXAM_AUTO_SUBMITTED" : "EXAM_SUBMITTED",
        entityType: "ExamAttempt",
        entityId: attempt.id,
        newValue: {
          durationSeconds,
          autoSubmitted,
          submittedAt,
        },
        ipAddress,
      },
      tx
    );

    const result = await evaluateAndCreateResult(attemptId, tx);

    return {
      success: true,
      alreadySubmitted: false,
      status: updatedAttempt.status,
      submittedAt: updatedAttempt.submittedAt,
      durationSeconds,
      resultId: result.id,
      score: result.rawMarks,
      percentage: result.percentage,
      grade: result.grade,
      passed: result.passed,
    };
  });
}
