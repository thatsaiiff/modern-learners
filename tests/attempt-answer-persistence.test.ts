import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudentStatus } from "@prisma/client";

describe("Bug Fix Regression — AttemptAnswer Persistence & Evaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully save, evaluate, and retrieve an answer utilizing customId without FK violations", async () => {
    // 1. Mock the Attempt containing custom snapshotted questions
    const mockAttemptId = "att-uuid-123";
    const studentId = "stu-1";

    const mockAttemptQuestion = {
      id: "aq-1",
      attemptId: mockAttemptId,
      examQuestionId: "eq-1",
      questionId: null, // Null because it's imported without a Question Bank link
      displayOrder: 1,
      questionSnapshot: {
        customId: "HTML-MCQ-Q1", // This becomes questionKey
        type: "mcq",
        marks: 2.0,
        options: [
          { id: "A", text: "Wrong" },
          { id: "B", text: "Correct", correct: true },
        ],
        correctAnswer: "B",
      },
    };

    const mockAttemptAnswer = {
      id: "aa-1",
      attemptId: mockAttemptId,
      questionId: "HTML-MCQ-Q1", // The customId used as questionKey
      selectedOptions: ["B"],
      isCorrect: true, // Will be set by grading
      marksAwarded: 2.0,
    };

    const mockExam = {
      id: "exam-1",
      title: "Test Exam",
      negativeMarkingEnabled: false,
      negativeMarkValue: 0,
      gradingRules: [],
      class: { classNumber: 8, name: "Class 8" },
      subject: { name: "Physics" },
      examQuestions: [
        {
          id: "eq-1",
          examId: "exam-1",
          questionId: null,
          marks: 2.0,
          questionSnapshot: mockAttemptQuestion.questionSnapshot,
        },
      ],
    };

    const mockAttempt = {
      id: mockAttemptId,
      studentId,
      examId: "exam-1",
      status: "IN_PROGRESS",
      serverDeadline: new Date(Date.now() + 3600000),
      startedAt: new Date(Date.now() - 3600),
      durationSeconds: 0,
      attemptQuestions: [mockAttemptQuestion],
      attemptAnswers: [mockAttemptAnswer], // Pre-seeded safely thanks to decoupled FK
      exam: mockExam,
      assignmentId: "asgn-1",
      assignment: { id: "asgn-1", status: "ASSIGNED" },
    };

    // 2. Mock Prisma
    const mockTx = {
      exam: {
        findUnique: vi.fn().mockResolvedValue(mockExam),
      },
      examAttempt: {
        findUnique: vi.fn().mockResolvedValue(mockAttempt),
        update: vi.fn().mockResolvedValue({ ...mockAttempt, status: "SUBMITTED" }),
      },
      attemptAnswer: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(mockAttemptAnswer),
        update: vi.fn().mockResolvedValue(mockAttemptAnswer),
      },
      result: {
        upsert: vi.fn().mockImplementation((args: any) => ({
          id: "res-1",
          ...args.create,
        })),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue({
          id: "res-1",
          studentId,
          attemptId: mockAttemptId,
          examId: "exam-1",
          rawMarks: 2.0,
          percentage: 100,
          attempt: mockAttempt,
          student: {
            id: studentId,
            enrollments: [{ class: { name: "Class 8" }, academicSession: { name: "2026-27" } }],
          },
          exam: mockExam,
        }),
      },
      examAssignment: {
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      retakeRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      student: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    vi.doMock("@/lib/prisma", () => ({
      default: {
        examAttempt: mockTx.examAttempt,
        attemptAnswer: mockTx.attemptAnswer,
        result: mockTx.result,
        $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
      },
    }));

    // 3. Ensure Attempt delivery payload extracts correctly
    const { getAttemptDeliveryPayload, saveAttemptAnswer, submitAttempt } = await import("@/lib/services/exam-attempt.service");
    
    // A. Payload generation uses customId correctly as questionKey
    const payload = await getAttemptDeliveryPayload(mockAttemptId, studentId, mockTx as any);
    expect(payload.questions[0].questionKey).toBe("HTML-MCQ-Q1");

    // B. Save attempts to insert with the same custom string
    const saveRes = await saveAttemptAnswer({
      attemptId: mockAttemptId,
      questionId: "HTML-MCQ-Q1",
      selectedOptions: ["B"],
    }, studentId);
    expect(saveRes.success).toBe(true);

    // C. Grading completes and recognizes the answer using multi-key resolution
    const submitRes = await submitAttempt(mockAttemptId, studentId, false, "127.0.0.1");
    if ("score" in submitRes) {
      // Verify result has rawMarks: 2.0 and passed status true
      expect(submitRes.score).toBe(2.0);
      expect(submitRes.percentage).toBe(100.0);
    } else {
      expect.unreachable("Submit attempt returned unexpected alreadySubmitted status");
    }

    // 4. Admin extraction mapping
    const { getResultDetails } = await import("@/lib/services/grading.service");
    const resultDetails = await getResultDetails("res-1", { isAdmin: true });
    
    expect(resultDetails.questions[0].customId).toBe("HTML-MCQ-Q1");
    expect(resultDetails.questions[0].isCorrect).toBe(true);
    expect(resultDetails.questions[0].marksAwarded).toBe(2.0);
    // Unanswered would be displayed if it was null, but here we see the selectedOption
    expect(resultDetails.questions[0].selectedAnswer).toEqual(["B"]);

    vi.doUnmock("@/lib/prisma");
  });
});
