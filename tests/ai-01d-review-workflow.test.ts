import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeacherReviewAction } from "@prisma/client";

const mockSubmission = {
  id: "subm-1",
  attemptId: "att-1",
  aiEvaluations: [{ id: "aieval-1", proposedMarks: 5.0 }],
  teacherReviews: [],
  examQuestion: { marks: 10.0 },
  question: null,
};

    const txClient = {
      teacherEvaluationReview: {
        create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: "rev-1", ...args.data })),
        findFirst: vi.fn().mockResolvedValue(null),
      },

  auditLog: {
    create: vi.fn().mockResolvedValue({ id: "audit-1" }),
  },
  subjectiveSubmission: {
    findUnique: vi.fn().mockResolvedValue(mockSubmission)
  },
  examAttempt: {
      findUnique: vi.fn().mockResolvedValue({ examId: "exam-1" })
  },
  result: {
      upsert: vi.fn().mockResolvedValue({ id: "res-1" })
  },
  attemptAnswer: {
      update: vi.fn().mockResolvedValue({ id: "aa-1" }),
      findMany: vi.fn().mockResolvedValue([])
  },
  exam: {
      findUnique: vi.fn().mockResolvedValue({ negativeMarkingEnabled: false, negativeMarkValue: 0, gradingRules: [] })
  }
};

vi.mock("@/lib/prisma", () => ({
    default: {
        subjectiveSubmission: {
          findUnique: vi.fn().mockImplementation(() => Promise.resolve(mockSubmission)),
        },
        $transaction: vi.fn((cb: any) => cb(txClient)),
    }
}));

vi.mock("@/lib/services/grading.service", () => ({
    evaluateAndCreateResult: vi.fn().mockResolvedValue({ id: "res-1" })
}));

import { submitTeacherReview } from "@/lib/services/teacher-review.service";

describe("AI-01D — Human Review Workflow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should prevent concurrent/duplicate review attempts", async () => {
    // Mimic two concurrent requests for the same submissionId
    // Prisma transaction check should catch this
    
    // First request initiates transaction
    const reviewRequest = {
        submissionId: "subm-1",
        action: TeacherReviewAction.APPROVED,
        officialMarks: 5.0,
        maxMarks: 10.0,
    };
    
    // mock first succeeds
    await submitTeacherReview(reviewRequest, { userId: "teacher-1", role: "TEACHER" });
    
    // update mock to simulate already existing record
    txClient.teacherEvaluationReview.findFirst = vi.fn().mockResolvedValue({id: "rev-1"});
    
    // second request fails
    await expect(submitTeacherReview(reviewRequest, { userId: "teacher-1", role: "TEACHER" }))
        .rejects.toThrow("Submission already reviewed.");
  });
});
