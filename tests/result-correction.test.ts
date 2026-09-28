import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResultStatus, MultiAttemptRule } from "@prisma/client";

const { mockExam, getInitialResult, getSharedState } = vi.hoisted(() => {
  const exam = {
    id: "exam-uuid-101",
    title: "Class 8 Physics — Work, Energy & Power",
    passingPercentage: 80.0,
    multiAttemptRule: "BEST" as const,
    gradingRules: [
      { minPercentage: 100, maxPercentage: 100, label: "OP — Outstandingly Perfect", displayOrder: 1 },
      { minPercentage: 95, maxPercentage: 99.99, label: "Outstanding", displayOrder: 2 },
      { minPercentage: 90, maxPercentage: 94.99, label: "Excellent", displayOrder: 3 },
      { minPercentage: 80, maxPercentage: 89.99, label: "Pass", displayOrder: 4 },
      { minPercentage: 0, maxPercentage: 79.99, label: "Fail — Needs Improvement", displayOrder: 5 },
    ],
    class: { name: "Class 8", classNumber: 8 },
    subject: { name: "Physics", code: "PHY" },
    chapter: { name: "Work & Energy" },
  };

  const initialResult = {
    id: "res-uuid-001",
    attemptId: "att-uuid-001",
    studentId: "stu-uuid-001",
    examId: "exam-uuid-101",
    rawMarks: 0.0,
    maximumMarks: 30.0,
    percentage: 0.0,
    grade: "Fail",
    performanceLabel: "Fail — Needs Improvement",
    passed: false,
    correctCount: 0,
    wrongCount: 0,
    unansweredCount: 30,
    isOfficial: true,
    status: "ACTIVE" as any,
    correctionReason: null as string | null,
    correctedAt: null as Date | null,
    correctedBy: null as string | null,
    createdAt: new Date("2026-09-25T10:00:00Z"),
    updatedAt: new Date("2026-09-25T10:00:00Z"),
    exam,
  };

  const shared = {
    currentState: { ...initialResult },
    capturedAudit: null as any,
  };

  return {
    mockExam: exam,
    getInitialResult: () => ({ ...initialResult }),
    getSharedState: () => shared,
  };
});

vi.mock("@/lib/prisma", () => {
  const shared = getSharedState();
  const txClient = {
    result: {
      update: vi.fn().mockImplementation((args: any) => {
        shared.currentState = { ...shared.currentState, ...args.data };
        return Promise.resolve(shared.currentState);
      }),
      findMany: vi.fn().mockImplementation(() => Promise.resolve([shared.currentState])),
    },
    exam: {
      findUnique: vi.fn().mockResolvedValue(mockExam),
    },
    auditLog: {
      create: vi.fn().mockImplementation((args: any) => {
        shared.capturedAudit = args.data;
        return Promise.resolve({ id: "audit-1", ...args.data });
      }),
    },
  };

  return {
    default: {
      result: {
        findUnique: vi.fn().mockImplementation(() => Promise.resolve(shared.currentState)),
        update: vi.fn().mockImplementation((args: any) => {
          shared.currentState = { ...shared.currentState, ...args.data };
          return Promise.resolve(shared.currentState);
        }),
        findMany: vi.fn().mockImplementation(() => Promise.resolve([shared.currentState])),
      },
      exam: {
        findUnique: vi.fn().mockResolvedValue(mockExam),
      },
      auditLog: {
        create: vi.fn().mockImplementation((args: any) => {
          shared.capturedAudit = args.data;
          return Promise.resolve({ id: "audit-1", ...args.data });
        }),
      },
      $transaction: vi.fn(async (cb: (tx: typeof txClient) => Promise<unknown>) => cb(txClient)),
    },
  };
});

import {
  correctResultMarks,
  voidResult,
  restoreResult,
  getResultDetails,
} from "@/lib/services/grading.service";
import {
  getEligibleResultWhereClause,
  isResultEligibleForMetrics,
} from "@/lib/services/result-eligibility.service";

describe("Admin Result Correction & Voiding Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const shared = getSharedState();
    shared.currentState = getInitialResult();
    shared.capturedAudit = null;
  });

  it("1. Corrects a 0% result to a verified score (25.5 / 30) with percentage & grade recalculation", async () => {
    const result = await correctResultMarks(
      {
        resultId: "res-uuid-001",
        rawMarks: 25.5,
        reason: "Administrative correction: Student submitted on paper and verified manually",
      },
      { userId: "admin-user-01", role: "ADMIN" },
      "127.0.0.1"
    );

    expect(result.rawMarks).toBe(25.5);
    expect(result.percentage).toBe(85.0);
    expect(result.grade).toBe("Pass");
    expect(result.passed).toBe(true);
    expect(result.status).toBe("ACTIVE");
    expect(result.correctionReason).toBe(
      "Administrative correction: Student submitted on paper and verified manually"
    );
    expect(result.correctedBy).toBe("admin-user-01");
  });

  it("2. Records complete audit log with previous score and new score upon correction", async () => {
    await correctResultMarks(
      {
        resultId: "res-uuid-001",
        rawMarks: 28,
        reason: "Missing answer recovery",
      },
      { userId: "admin-user-01", role: "ADMIN" }
    );

    const shared = getSharedState();
    expect(shared.capturedAudit).toBeDefined();
    expect(shared.capturedAudit.action).toBe("RESULT_CORRECTED");
    expect(shared.capturedAudit.entityType).toBe("Result");
    expect(shared.capturedAudit.entityId).toBe("res-uuid-001");
    expect(shared.capturedAudit.actorId).toBe("admin-user-01");
    expect(shared.capturedAudit.oldValue.rawMarks).toBe(0);
    expect(shared.capturedAudit.oldValue.percentage).toBe(0);
    expect(shared.capturedAudit.newValue.rawMarks).toBe(28);
    expect(shared.capturedAudit.newValue.percentage).toBe(93.33);
    expect(shared.capturedAudit.newValue.reason).toBe("Missing answer recovery");
  });

  it("3. Voids an incorrect result without physical deletion", async () => {
    const voided = await voidResult(
      {
        resultId: "res-uuid-001",
        reason: "Voiding attempt due to confirmed technical interruption",
      },
      { userId: "admin-user-01", role: "ADMIN" }
    );

    expect(voided.status).toBe("VOIDED");
    expect(voided.isOfficial).toBe(false);
    expect(voided.correctionReason).toBe("Voiding attempt due to confirmed technical interruption");

    const shared = getSharedState();
    expect(shared.capturedAudit).toBeDefined();
    expect(shared.capturedAudit.action).toBe("RESULT_VOIDED");
    expect(shared.capturedAudit.newValue.status).toBe("VOIDED");
  });

  it("4. Centralized metric eligibility excludes VOIDED results from Leaderboard", () => {
    const activeOfficialResult = {
      id: "res-1",
      isOfficial: true,
      status: ResultStatus.ACTIVE,
      rawMarks: 25,
      percentage: 83.33,
    };

    const voidedResult = {
      id: "res-2",
      isOfficial: false,
      status: ResultStatus.VOIDED,
      rawMarks: 0,
      percentage: 0,
    };

    const unofficialPracticeResult = {
      id: "res-3",
      isOfficial: false,
      status: ResultStatus.ACTIVE,
      rawMarks: 30,
      percentage: 100,
    };

    expect(isResultEligibleForMetrics(activeOfficialResult)).toBe(true);
    expect(isResultEligibleForMetrics(voidedResult)).toBe(false);
    expect(isResultEligibleForMetrics(unofficialPracticeResult)).toBe(false);

    const whereClause = getEligibleResultWhereClause({ examId: "exam-101" });
    expect(whereClause).toEqual({
      examId: "exam-101",
      isOfficial: true,
      status: ResultStatus.ACTIVE,
    });
  });

  it("5. Excludes VOIDED results from aggregate pass rate calculations", () => {
    const results = [
      { id: "r1", passed: true, percentage: 90, isOfficial: true, status: ResultStatus.ACTIVE },
      { id: "r2", passed: true, percentage: 85, isOfficial: true, status: ResultStatus.ACTIVE },
      { id: "r3", passed: false, percentage: 0, isOfficial: false, status: ResultStatus.VOIDED },
    ];

    const eligible = results.filter(isResultEligibleForMetrics);
    expect(eligible.length).toBe(2);

    const totalPct = eligible.reduce((sum, r) => sum + r.percentage, 0);
    const avgPct = totalPct / eligible.length;
    const passedCount = eligible.filter((r) => r.passed).length;
    const passRate = (passedCount / eligible.length) * 100;

    expect(avgPct).toBe(87.5);
    expect(passRate).toBe(100.0);
  });

  it("6. Corrected ACTIVE results are included with their updated scores in metrics", () => {
    const results = [
      { id: "r1", passed: true, percentage: 90, isOfficial: true, status: ResultStatus.ACTIVE },
      { id: "r2", passed: true, percentage: 80, isOfficial: true, status: ResultStatus.ACTIVE, correctionReason: "Corrected marks" },
    ];

    const eligible = results.filter(isResultEligibleForMetrics);
    expect(eligible.length).toBe(2);
    expect(eligible.every((r) => r.passed)).toBe(true);

    const avg = eligible.reduce((s, r) => s + r.percentage, 0) / eligible.length;
    expect(avg).toBe(85.0);
  });

  it("7. Student Result Details reflects corrected marks or VOIDED status clearly", async () => {
    const mockStudent = {
      id: "stu-uuid-001",
      name: "Rahul Sharma",
      studentCode: "STU-000001",
      enrollments: [{ class: { name: "Class 8" }, academicSession: { name: "2026-27" } }],
    };

    const mockAttempt = {
      id: "att-uuid-001",
      attemptNumber: 1,
      durationSeconds: 1800,
      submittedAt: new Date(),
      attemptQuestions: [],
      attemptAnswers: [],
    };

    const shared = getSharedState();
    shared.currentState = {
      ...getInitialResult(),
      status: "VOIDED",
      isOfficial: false,
      correctionReason: "Test invalidated due to network disruption",
      student: mockStudent,
      exam: mockExam,
      attempt: mockAttempt,
    } as any;

    const details = await getResultDetails("res-uuid-001", { studentId: "stu-uuid-001" });

    expect(details.result.status).toBe("VOIDED");
    expect(details.result.isOfficial).toBe(false);
    expect(details.result.correctionReason).toBe("Test invalidated due to network disruption");
  });

  it("8. Restores a VOIDED result back to ACTIVE status with audit logging", async () => {
    const shared = getSharedState();
    shared.currentState = {
      ...getInitialResult(),
      status: "VOIDED",
      isOfficial: false,
    };

    const restored = await restoreResult(
      {
        resultId: "res-uuid-001",
        reason: "Reactivating after appeal review",
      },
      { userId: "admin-user-01", role: "ADMIN" }
    );

    expect(restored.status).toBe("ACTIVE");
    expect(restored.correctionReason).toBe("Reactivating after appeal review");

    expect(shared.capturedAudit).toBeDefined();
    expect(shared.capturedAudit.action).toBe("RESULT_RESTORED");
    expect(shared.capturedAudit.newValue.status).toBe("ACTIVE");
  });
});
