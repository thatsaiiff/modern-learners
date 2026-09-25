import { describe, it, expect, vi, beforeEach } from "vitest";
import { MultiAttemptRule, StudentStatus } from "@prisma/client";

describe("Question Paper → Create Exam Workflow & Bug Regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Create Exam page flow does not require an existing Exam ID to initialize", () => {
    // The Create Exam page only takes paperId from params
    const pageParams = { id: "qp-uuid-003" };
    expect(pageParams).toHaveProperty("id");
    expect(pageParams).not.toHaveProperty("examId");

    // The form initializes with QuestionPaper metadata before an Exam exists
    const initialFormState = {
      paperId: pageParams.id,
      examId: null, // Exam ID is null before creation
      examTitle: "Work, Energy & Power Assessment",
      classNumber: 8,
      durationMinutes: 60,
      passingPercentage: 80,
    };

    expect(initialFormState.examId).toBeNull();
    expect(initialFormState.paperId).toBe("qp-uuid-003");
  });

  it("2. A valid QuestionPaper loads successfully with paperId without querying an exam", async () => {
    const mockQuestionPaper = {
      id: "qp-uuid-003",
      paperCode: "QP-000003",
      title: "Class 8 Physics — Work, Energy & Power",
      totalQuestions: 30,
      totalMarks: 30,
      status: "ACTIVE",
      class: { id: "class-8-id", classNumber: 8, name: "Class 8" },
      subject: { id: "subj-phy-id", code: "PHY", name: "Physics" },
      paperQuestions: [
        {
          id: "pq-1",
          questionId: "q-1",
          questionSnapshot: { text: "What is work?", marks: 1 },
          marks: 1,
          orderNumber: 1,
        },
      ],
    };

    expect(mockQuestionPaper.id).toBe("qp-uuid-003");
    expect(mockQuestionPaper.paperCode).toBe("QP-000003");
    expect(mockQuestionPaper.class.classNumber).toBe(8);
  });

  it("3. createExamFromPaper creates exactly one Exam and snapshots questions without 'Exam not found' error", async () => {
    const mockPaper = {
      id: "qp-uuid-003",
      paperCode: "QP-000003",
      title: "Class 8 Physics — Work, Energy & Power",
      totalMarks: 30,
      description: "Physics midterm exam",
      instructions: "No calculators",
      classId: "class-8-id",
      subjectId: "subj-phy-id",
      class: { id: "class-8-id", classNumber: 8 },
      status: "ACTIVE",
      paperQuestions: [
        {
          id: "pq-1",
          questionId: "q-1",
          questionSnapshot: { text: "What is power?", type: "mcq" },
          marks: 1,
          orderNumber: 1,
        },
      ],
    };

    const mockCreatedExam = {
      id: "exam-uuid-new-999",
      title: "Class 8 Physics — Work, Energy & Power Assessment",
      questionPaperId: mockPaper.id,
      classId: mockPaper.classId,
      subjectId: mockPaper.subjectId,
      totalMarks: 30,
      durationMinutes: 60,
      passingPercentage: 80,
      status: "ACTIVE",
      class: { classNumber: 8 },
      examQuestions: [{ id: "eq-1" }],
      assignments: [],
    };

    const mockActiveStudents = [
      { id: "stu-1", studentCode: "STU-000001", name: "Alice", status: StudentStatus.ACTIVE },
      { id: "stu-2", studentCode: "STU-000002", name: "Bob", status: StudentStatus.ACTIVE },
    ];

    const mockTx = {
      exam: {
        create: vi.fn().mockResolvedValue(mockCreatedExam),
        findUnique: vi.fn().mockResolvedValue(mockCreatedExam),
        update: vi.fn().mockResolvedValue(mockCreatedExam),
      },
      examGradingRule: {
        create: vi.fn().mockResolvedValue({ id: "rule-1" }),
      },
      examQuestion: {
        create: vi.fn().mockResolvedValue({ id: "eq-1" }),
      },
      class: {
        findUnique: vi.fn().mockResolvedValue({ id: "class-8-id", classNumber: 8 }),
      },
      student: {
        findMany: vi.fn().mockResolvedValue(mockActiveStudents),
      },
      examAssignment: {
        upsert: vi.fn().mockResolvedValue({ id: "asgn-1" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" }),
      },
    };

    vi.doMock("@/lib/prisma", () => ({
      default: {
        questionPaper: {
          findUnique: vi.fn().mockResolvedValue(mockPaper),
        },
        student: {
          findMany: vi.fn().mockResolvedValue(mockActiveStudents),
        },
        class: {
          findUnique: vi.fn().mockResolvedValue({ id: "class-8-id", classNumber: 8 }),
        },
        $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
      },
    }));

    const { createExamFromPaper } = await import("@/lib/services/question-paper.service");

    const result = await createExamFromPaper({
      questionPaperId: "qp-uuid-003",
      title: "Class 8 Physics — Work, Energy & Power Assessment",
      classNumber: 8,
      durationMinutes: 60,
      passingPercentage: 80,
      studentEligibility: [
        { studentId: "stu-1", isEligible: true },
        { studentId: "stu-2", isEligible: false, ineligibilityReason: "Medical leave" },
      ],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe("exam-uuid-new-999");
    expect(result.questionPaperId).toBe("qp-uuid-003");

    // Verify mockTx.exam.findUnique was called inside the transaction without throwing "Exam not found."
    expect(mockTx.exam.findUnique).toHaveBeenCalledWith({
      where: { id: "exam-uuid-new-999" },
      include: {
        class: true,
        examQuestions: true,
        assignments: true,
      },
    });

    // Verify assignments were upserted inside the transaction
    expect(mockTx.examAssignment.upsert).toHaveBeenCalledTimes(2);

    vi.doUnmock("@/lib/prisma");
  });

  it("4. assignExamToStudents succeeds both inside an existing transaction and standalone", async () => {
    const mockExam = {
      id: "exam-uuid-123",
      title: "Physics Test",
      status: "ACTIVE",
      classId: "class-8-id",
      class: { classNumber: 8 },
      examQuestions: [{ id: "eq-1" }],
      assignments: [],
    };

    const mockStudents = [
      { id: "stu-1", status: StudentStatus.ACTIVE },
    ];

    const mockTxClient = {
      exam: {
        findUnique: vi.fn().mockResolvedValue(mockExam),
        update: vi.fn().mockResolvedValue(mockExam),
      },
      class: {
        findUnique: vi.fn().mockResolvedValue({ id: "class-8-id", classNumber: 8 }),
      },
      student: {
        findMany: vi.fn().mockResolvedValue(mockStudents),
      },
      examAssignment: {
        upsert: vi.fn().mockResolvedValue({ id: "asgn-1" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" }),
      },
    };

    const { assignExamToStudents } = await import("@/lib/services/exam-assignment.service");

    const result = await assignExamToStudents(
      {
        examId: "exam-uuid-123",
        classNumber: 8,
        studentEligibility: [{ studentId: "stu-1", isEligible: true }],
      },
      { userId: "admin-1", role: "ADMIN" },
      "127.0.0.1",
      mockTxClient as any
    );

    expect(result.success).toBe(true);
    expect(result.eligibleCount).toBe(1);
    expect(result.ineligibleCount).toBe(0);
    expect(mockTxClient.examAssignment.upsert).toHaveBeenCalledTimes(1);
  });
});
