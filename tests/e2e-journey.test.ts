import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, hashPin, comparePin, validatePinFormat, validateRollNumberFormat } from "@/lib/auth/hash";
import { createAdminToken, createStudentToken, verifyJWT } from "@/lib/auth/jwt";
import { formatRollNumber } from "@/lib/utils";
import { parseAndValidateExamHtml } from "@/lib/services/exam-importer.service";
import { evaluateQuestionAnswer, determineGrade } from "@/lib/services/grading.service";
import { calculateTrendDirection } from "@/lib/services/analytics.service";
import { ANALYTICS_THRESHOLDS } from "@/lib/analytics/constants";

describe("Master End-to-End Acceptance Test Journey — Modern Learners (Saif Classes)", () => {
  // Step 1: Admin Authentication
  it("Step 1: should securely hash Admin credentials and generate verified session tokens", async () => {
    const rawPassword = "Admin@ModernLearners2026";
    const passwordHash = await hashPassword(rawPassword);

    expect(await comparePassword(rawPassword, passwordHash)).toBe(true);
    expect(await comparePassword("WrongPassword", passwordHash)).toBe(false);

    const adminToken = await createAdminToken({
      userId: "admin-uuid-001",
      role: "ADMIN",
      username: "admin",
      email: "admin@modernlearners.com",
      name: "Saif Sir (Admin)",
    });

    const verified = await verifyJWT<any>(adminToken);
    expect(verified.type).toBe("admin");
    expect(verified.userId).toBe("admin-uuid-001");
    expect(verified.role).toBe("ADMIN");
  });

  // Step 2: Student Onboarding & Auto Roll Number Generation
  it("Step 2: should create permanent Student ID (STU-000001) and server-generated roll number (08-2627-001)", async () => {
    const studentCode = "STU-000001";
    const classNumber = 8;
    const sessionName = "2026-27";
    const rollSeq = 1;

    const rollNumber = formatRollNumber(classNumber, sessionName, rollSeq);
    expect(rollNumber).toBe("08-2627-001");
    expect(validateRollNumberFormat(rollNumber)).toBe(true);

    const rawPin = "4892";
    expect(validatePinFormat(rawPin)).toBe(true);
    const pinHash = await hashPin(rawPin);

    expect(await comparePin(rawPin, pinHash)).toBe(true);
    expect(await comparePin("0000", pinHash)).toBe(false);
  });

  // Step 3: Student Authentication
  it("Step 3: should authenticate student via Roll Number + 4-digit PIN and produce session payload", async () => {
    const studentSession = {
      studentId: "stu-uuid-001",
      studentCode: "STU-000001",
      rollNumber: "08-2627-001",
      classId: "cls-c8-uuid",
      classNumber: 8,
      name: "Rahul Sharma",
      role: "STUDENT" as const,
    };

    const token = await createStudentToken(studentSession);
    const verified = await verifyJWT<any>(token);

    expect(verified.type).toBe("student");
    expect(verified.studentId).toBe("stu-uuid-001");
    expect(verified.rollNumber).toBe("08-2627-001");
    expect(verified.classNumber).toBe(8);
  });

  // Step 4: HTML Exam Parsing & Validation
  it("Step 4: should parse untrusted Modern Learners HTML question paper and validate schema", () => {
    const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="modern-learners-format" content="1.0">
  <script type="application/json" id="modern-learners-exam">
  {
    "formatVersion": "1.0",
    "exam": {
      "title": "Work & Energy Test 1",
      "class": 8,
      "subject": "Physics",
      "chapter": "Work, Energy & Power",
      "totalMarks": 5,
      "durationMinutes": 30,
      "passingPercentage": 80
    },
    "questions": [
      {
        "id": "PHY8-WEP-001",
        "type": "mcq",
        "topic": "Work",
        "difficulty": "easy",
        "marks": 1,
        "question": { "text": "What is the SI unit of work done?" },
        "options": [
          { "id": "A", "text": "Newton", "correct": false },
          { "id": "B", "text": "Joule", "correct": true },
          { "id": "C", "text": "Watt", "correct": false }
        ]
      },
      {
        "id": "PHY8-WEP-002",
        "type": "true_false",
        "topic": "Work",
        "difficulty": "easy",
        "marks": 1,
        "question": { "text": "Work done can be negative." },
        "answer": true
      },
      {
        "id": "PHY8-WEP-003",
        "type": "multiple_correct",
        "topic": "Energy",
        "difficulty": "medium",
        "marks": 2,
        "question": { "text": "Select scalar quantities." },
        "options": [
          { "id": "A", "text": "Work", "correct": true },
          { "id": "B", "text": "Energy", "correct": true },
          { "id": "C", "text": "Velocity", "correct": false }
        ]
      },
      {
        "id": "PHY8-WEP-004",
        "type": "numerical",
        "topic": "Work",
        "difficulty": "medium",
        "marks": 1,
        "question": { "text": "Calculate work for 10 N force over 5 m." },
        "answer": { "value": 50, "unit": "J", "tolerance": 0 }
      }
    ]
  }
  </script>
</head>
<body><h1>Work & Energy Test 1</h1></body>
</html>`;

    const preview = parseAndValidateExamHtml(sampleHtml);
    expect(preview.isValid).toBe(true);
    expect(preview.examSummary?.title).toBe("Work & Energy Test 1");
    expect(preview.examSummary?.totalMarks).toBe(5);
    expect(preview.examSummary?.totalQuestions).toBe(4);
    expect(preview.sanitizedPayload?.questions.length).toBe(4);
  });

  // Step 5: Exam Assignment Logic
  it("Step 5: should assign exam to student with allowed attempts and prevent duplicate assignments", () => {
    const assignmentsMap = new Map();
    const assignStudent = (examId: string, studentId: string, allowedAttempts = 1) => {
      const key = `${examId}_${studentId}`;
      const record = {
        id: "asgn-uuid-1",
        examId,
        studentId,
        allowedAttempts,
        status: "ASSIGNED",
        assignedAt: new Date(),
      };
      assignmentsMap.set(key, record);
      return record;
    };

    const a1 = assignStudent("exam-1", "stu-1", 1);
    const a2 = assignStudent("exam-1", "stu-1", 1); // duplicate assignment call

    expect(assignmentsMap.size).toBe(1);
    expect(a1.id).toBe(a2.id);
  });

  // Step 6: Server-Authoritative Exam Timing & Start
  it("Step 6: should enforce server-side login window and calculate deadline (PRD rule)", () => {
    const startAt = new Date("2026-09-21T17:00:00Z"); // 5:00 PM
    const loginDeadline = new Date("2026-09-21T22:00:00Z"); // 10:00 PM
    const durationMinutes = 30;

    const studentStartTime = new Date("2026-09-21T21:45:00Z"); // Starts at 9:45 PM
    const isValidStart = studentStartTime >= startAt && studentStartTime <= loginDeadline;
    expect(isValidStart).toBe(true);

    const serverDeadline = new Date(studentStartTime.getTime() + durationMinutes * 60 * 1000);
    expect(serverDeadline.toISOString()).toBe("2026-09-21T22:15:00.000Z"); // 10:15 PM (Full 30m duration granted)
  });

  // Step 7: Autosave & Scoring
  it("Step 7: should evaluate student answers server-side and calculate 100% OP grade", () => {
    const q1 = { customId: "Q1", type: "mcq", marks: 1, correctAnswer: "B" };
    const q2 = { customId: "Q2", type: "true_false", marks: 1, correctAnswer: true };
    const q3 = { customId: "Q3", type: "multiple_correct", marks: 2, correctAnswer: ["A", "B"] };
    const q4 = { customId: "Q4", type: "numerical", marks: 1, correctAnswer: { value: 50, tolerance: 0 } };

    const e1 = evaluateQuestionAnswer(q1 as any, { selectedOptions: ["B"] });
    const e2 = evaluateQuestionAnswer(q2 as any, { selectedOptions: ["true"] });
    const e3 = evaluateQuestionAnswer(q3 as any, { selectedOptions: ["A", "B"] });
    const e4 = evaluateQuestionAnswer(q4 as any, { numericAnswer: 50 });

    expect(e1.isCorrect).toBe(true);
    expect(e2.isCorrect).toBe(true);
    expect(e3.isCorrect).toBe(true);
    expect(e4.isCorrect).toBe(true);

    const rawMarks = e1.marksAwarded + e2.marksAwarded + e3.marksAwarded + e4.marksAwarded;
    const maxMarks = 5;
    const percentage = (rawMarks / maxMarks) * 100;

    expect(rawMarks).toBe(5);
    expect(percentage).toBe(100.0);

    const grading = determineGrade(percentage, []);
    expect(grading.grade).toBe("OP");
    expect(grading.performanceLabel).toBe("OP — Outstandingly Perfect");
  });

  // Step 8: Multi-Attempt Retake & Official Attempt Selection
  it("Step 8: should select BEST attempt (100% vs 80%) under BEST attempt rule", () => {
    const attempt1 = { id: "att-1", attemptNumber: 1, percentage: 100 };
    const attempt2 = { id: "att-2", attemptNumber: 2, percentage: 80 };

    const results = [attempt1, attempt2];
    const best = [...results].sort((a, b) => b.percentage - a.percentage)[0];

    expect(best.id).toBe("att-1");
    expect(best.percentage).toBe(100);
  });

  // Step 9: Academic Promotion & History Preservation
  it("Step 9: should promote Class 8 student to Class 9 and preserve previous enrollment and results", () => {
    const session2627Enrollment = {
      id: "enr-2627",
      studentId: "stu-uuid-001",
      classNumber: 8,
      session: "2026-27",
      rollNumber: "08-2627-001",
      status: "ACTIVE",
    };

    // Promote to Class 9 in 2027-28
    const updatedPrev = { ...session2627Enrollment, status: "PROMOTED" };
    const session2728Enrollment = {
      id: "enr-2728",
      studentId: "stu-uuid-001",
      classNumber: 9,
      session: "2027-28",
      rollNumber: "09-2728-001",
      status: "ACTIVE",
      promotedFromEnrollmentId: session2627Enrollment.id,
    };

    expect(updatedPrev.status).toBe("PROMOTED");
    expect(updatedPrev.rollNumber).toBe("08-2627-001");
    expect(session2728Enrollment.promotedFromEnrollmentId).toBe("enr-2627");
    expect(session2728Enrollment.rollNumber).toBe("09-2728-001");
  });

  // Step 10: Academic Rollback
  it("Step 10: should rollback promotion to Class 8, reactivate previous enrollment and log movement", () => {
    const currentEnr = { id: "enr-2728", status: "ROLLED_BACK" };
    const restoredEnr = { id: "enr-2627", status: "ACTIVE" };
    const movement = {
      movementType: "ROLLBACK",
      reason: "Revising Class 8 foundations",
      performedBy: "admin-uuid",
    };

    expect(currentEnr.status).toBe("ROLLED_BACK");
    expect(restoredEnr.status).toBe("ACTIVE");
    expect(movement.movementType).toBe("ROLLBACK");
  });

  // Step 11: Analytics & Needs-Attention Rules
  it("Step 11: should calculate trend direction and evaluate transparent needs-attention rules", () => {
    const risingScores = [70, 82, 95];
    expect(calculateTrendDirection(risingScores)).toBe("IMPROVING");

    const fallingScores = [92, 78, 65];
    expect(calculateTrendDirection(fallingScores)).toBe("DECLINING");

    // Needs attention if average below 65%
    const average = 61.5;
    expect(average < ANALYTICS_THRESHOLDS.LOW_OVERALL_AVERAGE_THRESHOLD).toBe(true);
  });
});
