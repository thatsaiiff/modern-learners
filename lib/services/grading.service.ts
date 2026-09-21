import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logAudit } from "./audit.service";
import { updateOfficialAttemptSelection } from "./retake.service";

export interface QuestionEvaluationResult {
  isCorrect: boolean;
  marksAwarded: number;
  status: "CORRECT" | "WRONG" | "UNANSWERED";
}

interface RawSnapshotData {
  customId?: string;
  type?: string;
  topic?: string;
  chapter?: string;
  difficulty?: string;
  marks?: number;
  question?: { text: string; image?: { src: string; alt?: string } };
  options?: Array<{ id: string; text: string; correct?: boolean }>;
  correctAnswer?: string | boolean | number | string[] | { value?: number; tolerance?: number; unit?: string };
  explanation?: string;
}

export interface ResultDetailsData {
  result: {
    id: string;
    attemptId: string;
    attemptNumber: number;
    rawMarks: number;
    maximumMarks: number;
    percentage: number;
    grade: string;
    performanceLabel: string;
    passed: boolean;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    isOfficial: boolean;
    submittedAt: Date | string | null;
    durationSeconds: number;
    createdAt: Date | string;
  };
  student: {
    id: string;
    name: string;
    studentCode: string;
    rollNumber: string;
    className: string;
    sessionName: string;
  };
  exam: {
    id: string;
    title: string;
    subjectName: string;
    className: string;
    chapterName: string | null;
    passingPercentage: number;
    multiAttemptRule: string;
  };
  analysis: {
    topicStats: Array<{ topic: string; total: number; correct: number; accuracy: number }>;
    difficultyStats: Array<{ difficulty: string; total: number; correct: number; accuracy: number }>;
    weakTopics: Array<{ topic: string; total: number; correct: number; accuracy: number }>;
  };
  questions: Array<{
    index: number;
    customId?: string;
    type?: string;
    topic?: string;
    difficulty?: string;
    maxMarks: number;
    marksAwarded: number;
    isCorrect: boolean;
    questionText: string;
    options?: Array<{ id: string; text: string }>;
    selectedAnswer?: unknown;
    correctAnswer?: unknown;
    explanation?: string | null;
  }>;
}

/**
 * Evaluates a single student answer against the immutable question snapshot
 */
export function evaluateQuestionAnswer(
  snapshot: RawSnapshotData,
  studentAnswer?: { selectedOptions?: string[]; answerText?: string; numericAnswer?: number | null },
  negativeMarkingEnabled = false,
  negativeMarkValue = 0
): QuestionEvaluationResult {
  const maxMarks = snapshot.marks || 1.0;
  const questionType = snapshot.type?.toLowerCase() || "mcq";

  // Check unanswered
  if (!studentAnswer) {
    return { isCorrect: false, marksAwarded: 0, status: "UNANSWERED" };
  }

  // 1. MCQ
  if (questionType === "mcq") {
    const selected = studentAnswer.selectedOptions?.[0];
    if (!selected) {
      return { isCorrect: false, marksAwarded: 0, status: "UNANSWERED" };
    }

    // Determine correct option ID from snapshot
    let correctOptionId: string | null = null;
    if (typeof snapshot.correctAnswer === "string") {
      correctOptionId = snapshot.correctAnswer;
    } else if (snapshot.options) {
      const found = snapshot.options.find((o) => o.correct === true);
      if (found) correctOptionId = found.id;
    }

    if (selected === correctOptionId) {
      return { isCorrect: true, marksAwarded: maxMarks, status: "CORRECT" };
    } else {
      const deduction = negativeMarkingEnabled ? -Math.abs(negativeMarkValue) : 0;
      return { isCorrect: false, marksAwarded: deduction, status: "WRONG" };
    }
  }

  // 2. True / False
  if (questionType === "true_false") {
    const selected = studentAnswer.selectedOptions?.[0]?.toLowerCase();
    if (!selected) {
      return { isCorrect: false, marksAwarded: 0, status: "UNANSWERED" };
    }

    let expectedBool: boolean | null = null;
    if (snapshot.correctAnswer === true || snapshot.correctAnswer === "true") {
      expectedBool = true;
    } else if (snapshot.correctAnswer === false || snapshot.correctAnswer === "false") {
      expectedBool = false;
    }

    const studentBool = selected === "true";
    if (studentBool === expectedBool) {
      return { isCorrect: true, marksAwarded: maxMarks, status: "CORRECT" };
    } else {
      const deduction = negativeMarkingEnabled ? -Math.abs(negativeMarkValue) : 0;
      return { isCorrect: false, marksAwarded: deduction, status: "WRONG" };
    }
  }

  // 3. Multiple Correct (V1 = All-or-Nothing exact set match)
  if (questionType === "multiple_correct") {
    const selected = studentAnswer.selectedOptions || [];
    if (selected.length === 0) {
      return { isCorrect: false, marksAwarded: 0, status: "UNANSWERED" };
    }

    // Determine expected option IDs
    let expectedIds: string[] = [];
    if (Array.isArray(snapshot.correctAnswer)) {
      expectedIds = snapshot.correctAnswer.map(String);
    } else if (snapshot.options) {
      expectedIds = snapshot.options.filter((o) => o.correct === true).map((o) => o.id);
    }

    // Exact set comparison
    const sortedSelected = [...selected].sort();
    const sortedExpected = [...expectedIds].sort();

    const isMatch =
      sortedSelected.length === sortedExpected.length &&
      sortedSelected.every((val, idx) => val === sortedExpected[idx]);

    if (isMatch) {
      return { isCorrect: true, marksAwarded: maxMarks, status: "CORRECT" };
    } else {
      const deduction = negativeMarkingEnabled ? -Math.abs(negativeMarkValue) : 0;
      return { isCorrect: false, marksAwarded: deduction, status: "WRONG" };
    }
  }

  // 4. Numerical
  if (questionType === "numerical") {
    const studentVal = studentAnswer.numericAnswer;
    if (studentVal === undefined || studentVal === null || isNaN(studentVal)) {
      return { isCorrect: false, marksAwarded: 0, status: "UNANSWERED" };
    }

    let targetVal = 0;
    let tolerance = 0;

    if (typeof snapshot.correctAnswer === "number") {
      targetVal = snapshot.correctAnswer;
    } else if (typeof snapshot.correctAnswer === "object" && snapshot.correctAnswer !== null) {
      const ansObj = snapshot.correctAnswer as { value?: number; tolerance?: number };
      targetVal = ansObj.value ?? 0;
      tolerance = ansObj.tolerance ?? 0;
    }

    const isWithinTolerance = Math.abs(studentVal - targetVal) <= tolerance;

    if (isWithinTolerance) {
      return { isCorrect: true, marksAwarded: maxMarks, status: "CORRECT" };
    } else {
      const deduction = negativeMarkingEnabled ? -Math.abs(negativeMarkValue) : 0;
      return { isCorrect: false, marksAwarded: deduction, status: "WRONG" };
    }
  }

  return { isCorrect: false, marksAwarded: 0, status: "UNANSWERED" };
}

/**
 * Determines grade label and tier from percentage and snapshotted grading rules
 */
export function determineGrade(
  percentage: number,
  gradingRules: Array<{ minPercentage: number; maxPercentage: number; label: string }>
) {
  // Check snapshotted rules first
  if (gradingRules && gradingRules.length > 0) {
    const sortedRules = [...gradingRules].sort((a, b) => b.minPercentage - a.minPercentage);
    for (const rule of sortedRules) {
      // Allow exact upper boundary comparison
      if (percentage >= rule.minPercentage && percentage <= rule.maxPercentage + 0.001) {
        return {
          grade: rule.label.includes("—") ? rule.label.split("—")[0].trim() : rule.label,
          performanceLabel: rule.label,
        };
      }
    }
  }

  // Default PRD Grading System fallback
  if (percentage >= 100) {
    return { grade: "OP", performanceLabel: "OP — Outstandingly Perfect" };
  } else if (percentage >= 95) {
    return { grade: "Outstanding", performanceLabel: "Outstanding" };
  } else if (percentage >= 90) {
    return { grade: "Excellent", performanceLabel: "Excellent" };
  } else if (percentage >= 80) {
    return { grade: "Pass", performanceLabel: "Pass" };
  } else {
    return { grade: "Fail", performanceLabel: "Fail — Needs Improvement" };
  }
}

/**
 * Automatically evaluates a finalized exam attempt, calculates marks & grading, and creates the Result
 */
export async function evaluateAndCreateResult(
  attemptId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          gradingRules: { orderBy: { displayOrder: "asc" } },
          examQuestions: { orderBy: { orderNumber: "asc" } },
        },
      },
      attemptQuestions: {
        orderBy: { displayOrder: "asc" },
      },
      attemptAnswers: true,
      result: true,
    },
  });

  if (!attempt) {
    throw new Error("Attempt not found.");
  }

  const exam = attempt.exam;

  // Build Answer Map
  const answerMap = new Map(attempt.attemptAnswers.map((a) => [a.questionId, a]));

  let rawMarks = 0;
  let maximumMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  // Create Question Map from ExamQuestions for snapshots
  const examQuestionMap = new Map(exam.examQuestions.map((eq) => [eq.id, eq]));

  for (const aq of attempt.attemptQuestions) {
    const examQ = examQuestionMap.get(aq.examQuestionId);
    const snap = (examQ?.questionSnapshot || aq.questionSnapshot) as unknown as RawSnapshotData;

    const maxQMarks = examQ?.marks || snap?.marks || 1.0;
    maximumMarks += maxQMarks;

    const questionKey = aq.questionId || snap?.customId || aq.id;
    const ans = answerMap.get(questionKey) || answerMap.get(aq.id);

    const studentAnswerPayload = ans
      ? {
          selectedOptions: (ans.selectedOptions as string[]) || undefined,
          answerText: ans.answerText || undefined,
          numericAnswer: ans.numericAnswer,
        }
      : undefined;

    const evaluation = evaluateQuestionAnswer(
      snap,
      studentAnswerPayload,
      exam.negativeMarkingEnabled,
      exam.negativeMarkValue
    );

    if (evaluation.status === "CORRECT") {
      correctCount++;
      rawMarks += evaluation.marksAwarded;
    } else if (evaluation.status === "WRONG") {
      wrongCount++;
      rawMarks += evaluation.marksAwarded;
    } else {
      unansweredCount++;
    }

    // Update AttemptAnswer with evaluation result
    if (ans) {
      await db.attemptAnswer.update({
        where: { id: ans.id },
        data: {
          isCorrect: evaluation.isCorrect,
          marksAwarded: evaluation.marksAwarded,
        },
      });
    }
  }

  // Floor raw marks at 0 unless negative marks are allowed to go below 0
  const finalRawMarks = Math.max(0, parseFloat(rawMarks.toFixed(2)));
  const finalMaxMarks = Math.max(1, parseFloat(maximumMarks.toFixed(2)));
  const percentage = parseFloat(((finalRawMarks / finalMaxMarks) * 100).toFixed(2));

  const { grade, performanceLabel } = determineGrade(percentage, exam.gradingRules);
  const passed = percentage >= (exam.passingPercentage || 80.0);

  // Upsert Result record (Idempotent)
  const result = await db.result.upsert({
    where: { attemptId: attempt.id },
    update: {
      rawMarks: finalRawMarks,
      maximumMarks: finalMaxMarks,
      percentage,
      grade,
      performanceLabel,
      passed,
      correctCount,
      wrongCount,
      unansweredCount,
    },
    create: {
      attemptId: attempt.id,
      studentId: attempt.studentId,
      examId: attempt.examId,
      rawMarks: finalRawMarks,
      maximumMarks: finalMaxMarks,
      percentage,
      grade,
      performanceLabel,
      passed,
      correctCount,
      wrongCount,
      unansweredCount,
      isOfficial: true,
    },
  });

  // Determine official attempt based on exam's multiAttemptRule
  await updateOfficialAttemptSelection(attempt.studentId, attempt.examId, db);

  await logAudit(
    {
      actorId: attempt.studentId,
      actorRole: "SYSTEM",
      action: "RESULT_GENERATED",
      entityType: "Result",
      entityId: result.id,
      newValue: {
        rawMarks: finalRawMarks,
        maximumMarks: finalMaxMarks,
        percentage,
        grade,
        passed,
      },
    },
    db
  );

  return result;
}

/**
 * Returns complete result analysis including topic breakdown and question-by-question review
 */
export async function getResultDetails(
  resultId: string,
  actor: { studentId?: string; isAdmin?: boolean }
): Promise<ResultDetailsData> {
  const result = await prisma.result.findUnique({
    where: { id: resultId },
    include: {
      student: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { class: true, academicSession: true },
          },
        },
      },
      exam: {
        include: {
          subject: true,
          class: true,
          chapter: true,
          gradingRules: { orderBy: { displayOrder: "asc" } },
        },
      },
      attempt: {
        include: {
          attemptQuestions: { orderBy: { displayOrder: "asc" } },
          attemptAnswers: true,
        },
      },
    },
  });

  if (!result) {
    throw new Error("Result not found.");
  }

  // Authorization check
  if (!actor.isAdmin && actor.studentId !== result.studentId) {
    throw new Error("Unauthorized access to result.");
  }

  const { attempt, exam, student } = result;
  const answerMap = new Map(attempt.attemptAnswers.map((a) => [a.questionId, a]));

  // Topic & Difficulty breakdown
  const topicStats: Record<string, { total: number; correct: number; marks: number }> = {};
  const difficultyStats: Record<string, { total: number; correct: number }> = {
    easy: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 },
  };

  const questionBreakdown = attempt.attemptQuestions.map((aq, idx) => {
    const snap = aq.questionSnapshot as unknown as RawSnapshotData;
    const questionKey = aq.questionId || snap?.customId || aq.id;
    const ans = answerMap.get(questionKey) || answerMap.get(aq.id);

    const topic = snap?.topic || "General";
    if (!topicStats[topic]) {
      topicStats[topic] = { total: 0, correct: 0, marks: 0 };
    }
    topicStats[topic].total += 1;
    topicStats[topic].marks += snap?.marks || 1;

    const diff = (snap?.difficulty?.toLowerCase() || "medium") as "easy" | "medium" | "hard";
    if (difficultyStats[diff]) {
      difficultyStats[diff].total += 1;
    }

    const isCorrect = !!ans?.isCorrect;
    if (isCorrect) {
      topicStats[topic].correct += 1;
      if (difficultyStats[diff]) difficultyStats[diff].correct += 1;
    }

    return {
      index: idx + 1,
      customId: snap?.customId,
      type: snap?.type,
      topic,
      difficulty: snap?.difficulty,
      maxMarks: snap?.marks || 1,
      marksAwarded: ans?.marksAwarded || 0,
      isCorrect,
      questionText: snap?.question?.text || "",
      options: snap?.options || [],
      selectedAnswer: ans?.selectedOptions || ans?.numericAnswer || ans?.answerText || null,
      correctAnswer: snap?.correctAnswer,
      explanation: snap?.explanation || null,
    };
  });

  // Calculate weak topics (< 80% accuracy)
  const weakTopics = Object.entries(topicStats)
    .map(([tName, stats]) => ({
      topic: tName,
      total: stats.total,
      correct: stats.correct,
      accuracy: parseFloat(((stats.correct / Math.max(1, stats.total)) * 100).toFixed(1)),
    }))
    .filter((t) => t.accuracy < 80);

  const activeEnrollment = student.enrollments[0];

  return {
    result: {
      id: result.id,
      attemptId: result.attemptId,
      attemptNumber: attempt.attemptNumber,
      rawMarks: result.rawMarks,
      maximumMarks: result.maximumMarks,
      percentage: result.percentage,
      grade: result.grade,
      performanceLabel: result.performanceLabel,
      passed: result.passed,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      unansweredCount: result.unansweredCount,
      isOfficial: result.isOfficial,
      submittedAt: attempt.submittedAt,
      durationSeconds: attempt.durationSeconds,
      createdAt: result.createdAt,
    },
    student: {
      id: student.id,
      name: student.name,
      studentCode: student.studentCode,
      rollNumber: activeEnrollment?.rollNumber || "N/A",
      className: activeEnrollment?.class?.name || exam.class.name,
      sessionName: activeEnrollment?.academicSession?.name || "N/A",
    },
    exam: {
      id: exam.id,
      title: exam.title,
      subjectName: exam.subject.name,
      className: exam.class.name,
      chapterName: exam.chapter?.name || null,
      passingPercentage: exam.passingPercentage,
      multiAttemptRule: exam.multiAttemptRule,
    },
    analysis: {
      topicStats: Object.entries(topicStats).map(([name, stats]) => ({
        topic: name,
        total: stats.total,
        correct: stats.correct,
        accuracy: parseFloat(((stats.correct / Math.max(1, stats.total)) * 100).toFixed(1)),
      })),
      difficultyStats: Object.entries(difficultyStats).map(([diff, stats]) => ({
        difficulty: diff.toUpperCase(),
        total: stats.total,
        correct: stats.correct,
        accuracy: parseFloat(((stats.correct / Math.max(1, stats.total)) * 100).toFixed(1)),
      })),
      weakTopics,
    },
    questions: questionBreakdown,
  };
}
