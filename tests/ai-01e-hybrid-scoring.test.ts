import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeacherReviewAction, ResultStatus, AttemptStatus, AssignmentStatus } from "@prisma/client";
import { evaluateAndCreateResult } from "@/lib/services/grading.service";

const { getSharedState } = vi.hoisted(() => {
  const shared = {
    prismaInstance: null as any,
  };
  return { getSharedState: () => shared };
});

vi.mock("@/lib/prisma", () => ({
  default: {
    examAttempt: { findUnique: vi.fn().mockImplementation((...args: any[]) => getSharedState().prismaInstance.examAttempt.findUnique(...args)) },
    subjectiveSubmission: { 
        findMany: vi.fn().mockImplementation((...args: any[]) => getSharedState().prismaInstance.subjectiveSubmission.findMany(...args)),
    },
    attemptAnswer: { update: vi.fn().mockImplementation((...args: any[]) => getSharedState().prismaInstance.attemptAnswer.update(...args)) },
    auditLog: { create: vi.fn().mockImplementation((...args: any[]) => getSharedState().prismaInstance.auditLog.create(...args)) },
    examAssignment: { update: vi.fn().mockImplementation((...args: any[]) => getSharedState().prismaInstance.examAssignment.update(...args)) },
    result: { 
        upsert: vi.fn().mockImplementation((...args: any[]) => getSharedState().prismaInstance.result.upsert(...args)),
        findMany: vi.fn().mockImplementation((...args: any[]) => getSharedState().prismaInstance.result.findMany(...args))
    },
    exam: { findUnique: vi.fn().mockImplementation((...args: any[]) => getSharedState().prismaInstance.exam.findUnique(...args)) }
  }
}));

describe("AI-01E — Hybrid Scoring Tests", () => {
  const mockExam = {
    id: "exam-1",
    examQuestions: [
        { id: "eq-obj", marks: 2, subjectiveSubmissions: [] },
        { id: "eq-sub", marks: 5, subjectiveSubmissions: [{ id: "sub-1" }] }
    ]
  };

  const mockAttempt = {
    id: "att-1",
    examId: "exam-1",
    studentId: "stu-1",
    status: AttemptStatus.SUBMITTED,
    attemptQuestions: [
      { id: "aq-1", examQuestionId: "eq-obj", questionId: "q-obj", displayOrder: 1, questionSnapshot: { type: "mcq", marks: 2, correctAnswer: "B", options: [{id: "B", text: "ok", correct: true}] } },
      { id: "aq-2", examQuestionId: "eq-sub", questionId: "q-sub", displayOrder: 2, questionSnapshot: { type: "long_answer", marks: 5 } }
    ],
    attemptAnswers: [
      { id: "aa-1", questionId: "q-obj", selectedOptions: ["B"], isCorrect: null, marksAwarded: 0 },
      { id: "aa-2", questionId: "q-sub", selectedOptions: [], isCorrect: null, marksAwarded: 0 }
    ],
    exam: mockExam
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getSharedState().prismaInstance = {
        examAttempt: { findUnique: vi.fn().mockResolvedValue(mockAttempt) },
        subjectiveSubmission: { findMany: vi.fn() },
        attemptAnswer: { update: vi.fn().mockResolvedValue({}) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
        examAssignment: { update: vi.fn().mockResolvedValue({}) },
        result: { 
            upsert: vi.fn().mockImplementation((args: any) => ({ ...args.create })),
            findMany: vi.fn().mockResolvedValue([]) 
        },
        exam: { findUnique: vi.fn().mockResolvedValue(mockExam) }
    };
  });

  it("should NOT mark result official when subjective review is pending", async () => {
    getSharedState().prismaInstance.subjectiveSubmission.findMany.mockResolvedValue([{ examQuestionId: "eq-sub", teacherReviews: [] }]);
    
    // @ts-ignore
    const result = await evaluateAndCreateResult("att-1", getSharedState().prismaInstance);
    
    expect(result.isOfficial).toBe(false);
    expect(result.rawMarks).toBe(2); // Only objective marks
  });

  it("should mark result official and include teacher-approved marks", async () => {
    getSharedState().prismaInstance.subjectiveSubmission.findMany.mockResolvedValue([{ 
        examQuestionId: "eq-sub", 
        teacherReviews: [{ action: TeacherReviewAction.APPROVED, officialMarks: 5 }] 
    }]);
    
    // @ts-ignore
    const result = await evaluateAndCreateResult("att-1", getSharedState().prismaInstance);
    
    expect(result.isOfficial).toBe(true);
    expect(result.rawMarks).toBe(7); // 2 (objective) + 5 (approved subjective)
  });
});
