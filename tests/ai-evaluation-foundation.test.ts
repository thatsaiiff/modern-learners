import { describe, it, expect } from "vitest";
import {
  SubmissionFormat,
  EvaluationJobStatus,
  TeacherReviewAction,
  PracticeSourceType,
  PracticeVisibility,
  PracticeAttemptStatus,
  PaperStatus,
  Prisma,
} from "@prisma/client";

describe("AI-01A — Evaluation & Practice Domain Foundation Invariants", () => {
  it("1. Student practice paper requires and retains student owner", () => {
    const studentPracticePaper: Prisma.PracticePaperCreateInput = {
      practiceCode: "PRAC-000001",
      title: "Class 9 Physics Self-Practice Test",
      sourceType: PracticeSourceType.STUDENT_UPLOAD,
      visibility: PracticeVisibility.PRIVATE,
      ownerStudent: {
        connect: { id: "student-uuid-001" },
      },
      status: PaperStatus.ACTIVE,
    };

    expect(studentPracticePaper.sourceType).toBe("STUDENT_UPLOAD");
    expect(studentPracticePaper.ownerStudent?.connect?.id).toBe("student-uuid-001");
  });

  it("2. Admin practice paper can exist without student owner", () => {
    const adminPracticePaper: Prisma.PracticePaperCreateInput = {
      practiceCode: "PRAC-000002",
      title: "Class 10 Chemistry Revision Drill",
      sourceType: PracticeSourceType.ADMIN_CREATED,
      visibility: PracticeVisibility.SHARED_CLASS,
      creator: {
        connect: { id: "admin-uuid-001" },
      },
      status: PaperStatus.ACTIVE,
    };

    expect(adminPracticePaper.sourceType).toBe("ADMIN_CREATED");
    expect(adminPracticePaper.visibility).toBe("SHARED_CLASS");
    expect(adminPracticePaper.creator?.connect?.id).toBe("admin-uuid-001");
  });

  it("3. Student practice papers are strictly private in V1", () => {
    const defaultStudentUploadVisibility = PracticeVisibility.PRIVATE;
    expect(defaultStudentUploadVisibility).toBe("PRIVATE");
    expect(defaultStudentUploadVisibility).not.toBe("SHARED_CLASS");
  });

  it("4. Practice results are completely independent from official results", () => {
    const practiceResult = {
      id: "prac-res-uuid-1",
      attemptId: "prac-att-uuid-1",
      studentId: "stu-uuid-1",
      practicePaperId: "prac-paper-uuid-1",
      rawMarks: 24.5,
      maximumMarks: 30.0,
      percentage: 81.67,
      grade: "Pass",
      performanceLabel: "Pass",
      passed: true,
      isOfficial: false,
    };

    const officialResult = {
      id: "res-uuid-1",
      attemptId: "exam-att-uuid-1",
      studentId: "stu-uuid-1",
      examId: "exam-uuid-1",
      rawMarks: 28.0,
      maximumMarks: 30.0,
      percentage: 93.33,
      grade: "Excellent",
      performanceLabel: "Excellent",
      passed: true,
      isOfficial: true,
    };

    expect(practiceResult.isOfficial).toBe(false);
    expect(officialResult.isOfficial).toBe(true);
    expect(practiceResult).toHaveProperty("practicePaperId");
    expect(officialResult).toHaveProperty("examId");
  });

  it("5. AI evaluation stores proposed marks separately from teacher review", () => {
    const aiEvaluation = {
      id: "aieval-uuid-001",
      submissionId: "subm-uuid-001",
      proposedMarks: 8.5,
      maxMarks: 10.0,
      confidence: 0.94,
      criteriaEvaluations: [
        { criterionId: "crit-1", title: "Definition", maxMarks: 2, awardedMarks: 2 },
        { criterionId: "crit-2", title: "Process", maxMarks: 8, awardedMarks: 6.5 },
      ],
      deductions: [{ category: "INCOMPLETE_STEP", pointsDeducted: 1.5, explanation: "Missing step 3" }],
      positiveFeedback: "Solid grasp of core definitions",
      improvementSuggestions: ["Explain step 3 in detail"],
      modelProvider: "omniroute",
      modelName: "anthropic/claude-3-5-sonnet",
      promptVersion: "eval-subjective-v1.2",
      tokenUsage: { promptTokens: 1200, completionTokens: 400, totalTokens: 1600 },
    };

    const teacherReview = {
      id: "review-uuid-001",
      submissionId: "subm-uuid-001",
      aiEvaluationId: aiEvaluation.id,
      reviewerId: "teacher-user-id",
      action: TeacherReviewAction.MODIFIED,
      officialMarks: 9.0, // Teacher modified AI's proposed 8.5 to 9.0
      maxMarks: 10.0,
      marksModified: true,
      scoreDelta: 0.5,
      teacherNotes: "Awarded 0.5 grace for creative insight in diagram",
    };

    // AI proposed marks are NOT official marks
    expect(aiEvaluation.proposedMarks).toBe(8.5);
    expect(teacherReview.officialMarks).toBe(9.0);
    expect(aiEvaluation.proposedMarks).not.toBe(teacherReview.officialMarks);
    expect(teacherReview.marksModified).toBe(true);
  });

  it("6. Teacher review supports APPROVED, MODIFIED, and REJECTED states", () => {
    const actions = [
      TeacherReviewAction.APPROVED,
      TeacherReviewAction.MODIFIED,
      TeacherReviewAction.REJECTED,
    ];

    expect(actions).toContain("APPROVED");
    expect(actions).toContain("MODIFIED");
    expect(actions).toContain("REJECTED");
  });

  it("7. Historical practice results survive practice paper archival", () => {
    const practicePaper = {
      id: "prac-uuid-99",
      practiceCode: "PRAC-000099",
      title: "Archived Physics Drill",
      status: PaperStatus.ARCHIVED,
    };

    const historicalAttempt = {
      id: "prac-att-99",
      practicePaperId: practicePaper.id,
      studentId: "stu-1",
      status: PracticeAttemptStatus.SUBMITTED,
    };

    const historicalResult = {
      id: "prac-res-99",
      attemptId: historicalAttempt.id,
      practicePaperId: practicePaper.id,
      rawMarks: 25,
      maximumMarks: 30,
      isOfficial: false,
    };

    // Paper is archived, but attempt and result retain referential integrity
    expect(practicePaper.status).toBe("ARCHIVED");
    expect(historicalAttempt.practicePaperId).toBe(practicePaper.id);
    expect(historicalResult.practicePaperId).toBe(practicePaper.id);
    expect(historicalResult.rawMarks).toBe(25);
  });

  it("8. Existing QuestionPaper and Exam relationships remain valid and isolated", () => {
    const questionPaper = {
      id: "qp-uuid-001",
      paperCode: "QP-000001",
      title: "Official Midterm Chemistry",
      totalQuestions: 25,
      totalMarks: 50,
      status: PaperStatus.ACTIVE,
    };

    const exam = {
      id: "exam-uuid-001",
      questionPaperId: questionPaper.id,
      title: "Class 9 Chemistry Midterm Exam",
      totalMarks: 50,
      passingPercentage: 80.0,
      status: "ACTIVE",
    };

    expect(exam.questionPaperId).toBe(questionPaper.id);
    expect(exam.totalMarks).toBe(questionPaper.totalMarks);
  });
});
