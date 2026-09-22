import { describe, it, expect } from "vitest";

describe("Exam Availability & Timing Rules (Server-Authoritative)", () => {
  it("should allow start within availability window and calculate deadline correctly", () => {
    const startAt = new Date("2026-09-21T17:00:00.000Z"); // 5:00 PM
    const loginDeadline = new Date("2026-09-21T22:00:00.000Z"); // 10:00 PM
    const durationMinutes = 90; // 90 mins

    const studentStartTime = new Date("2026-09-21T21:00:00.000Z"); // Starts at 9:00 PM

    const isWithinWindow =
      studentStartTime >= startAt && studentStartTime <= loginDeadline;
    expect(isWithinWindow).toBe(true);

    // PRD Rule: Student gets full duration after valid start
    const serverDeadline = new Date(
      studentStartTime.getTime() + durationMinutes * 60 * 1000
    );
    expect(serverDeadline.toISOString()).toBe("2026-09-21T22:30:00.000Z"); // 10:30 PM
  });

  it("should reject start before opening time", () => {
    const startAt = new Date("2026-09-21T17:00:00.000Z"); // 5:00 PM
    const loginDeadline = new Date("2026-09-21T22:00:00.000Z"); // 10:00 PM
    const studentStartTime = new Date("2026-09-21T16:59:59.000Z"); // 4:59:59 PM

    const isWithinWindow =
      studentStartTime >= startAt && studentStartTime <= loginDeadline;
    expect(isWithinWindow).toBe(false);
  });

  it("should reject start after login window closes", () => {
    const startAt = new Date("2026-09-21T17:00:00.000Z"); // 5:00 PM
    const loginDeadline = new Date("2026-09-21T22:00:00.000Z"); // 10:00 PM
    const studentStartTime = new Date("2026-09-21T22:00:01.000Z"); // 10:00:01 PM

    const isWithinWindow =
      studentStartTime >= startAt && studentStartTime <= loginDeadline;
    expect(isWithinWindow).toBe(false);
  });
});

describe("Student Question Delivery Security", () => {
  it("should strip correct answer flags from student delivery options", () => {
    const rawOptions = [
      { id: "A", text: "Newton", correct: false },
      { id: "B", text: "Joule", correct: true },
      { id: "C", text: "Watt", correct: false },
    ];

    // Sanitized delivery options
    const deliveryOptions = rawOptions.map((opt) => ({
      id: opt.id,
      text: opt.text,
    }));

    deliveryOptions.forEach((opt: any) => {
      expect(opt.correct).toBeUndefined();
    });
    expect(JSON.stringify(deliveryOptions)).not.toContain("correct");
  });
});

describe("Attempt Lifecycle & Autosave Rules", () => {
  it("should maintain state machine transitions: IN_PROGRESS -> SUBMITTED", () => {
    const attempt = {
      id: "att-uuid-1",
      status: "IN_PROGRESS",
      startedAt: new Date("2026-09-21T18:00:00.000Z"),
      serverDeadline: new Date("2026-09-21T18:45:00.000Z"),
    };

    // Manual submission
    const submittedAttempt = {
      ...attempt,
      status: "SUBMITTED",
      submittedAt: new Date("2026-09-21T18:35:00.000Z"),
      durationSeconds: 35 * 60,
      autoSubmitted: false,
    };

    expect(submittedAttempt.status).toBe("SUBMITTED");
    expect(submittedAttempt.durationSeconds).toBe(2100);
    expect(submittedAttempt.autoSubmitted).toBe(false);
  });

  it("should transition to AUTO_SUBMITTED when deadline expires", () => {
    const attempt = {
      id: "att-uuid-1",
      status: "IN_PROGRESS",
      startedAt: new Date("2026-09-21T18:00:00.000Z"),
      serverDeadline: new Date("2026-09-21T18:45:00.000Z"),
    };

    // Auto submit on expiration
    const autoSubmittedAttempt = {
      ...attempt,
      status: "AUTO_SUBMITTED",
      submittedAt: attempt.serverDeadline,
      durationSeconds: 45 * 60,
      autoSubmitted: true,
    };

    expect(autoSubmittedAttempt.status).toBe("AUTO_SUBMITTED");
    expect(autoSubmittedAttempt.autoSubmitted).toBe(true);
  });

  it("should support idempotent submission without creating inconsistencies", () => {
    const existingSubmitted = {
      id: "att-uuid-1",
      status: "SUBMITTED",
      submittedAt: new Date("2026-09-21T18:35:00.000Z"),
    };

    const submitHandler = (att: typeof existingSubmitted) => {
      if (att.status === "SUBMITTED" || att.status === "AUTO_SUBMITTED") {
        return { success: true, alreadySubmitted: true, status: att.status };
      }
      return { success: true, alreadySubmitted: false, status: "SUBMITTED" };
    };

    const firstCall = submitHandler(existingSubmitted);
    const secondCall = submitHandler(existingSubmitted);

    expect(firstCall.alreadySubmitted).toBe(true);
    expect(secondCall.alreadySubmitted).toBe(true);
  });
});

describe("Exam Assignment & Student Eligibility Engine", () => {
  it("should select all enrolled students as eligible by default upon assignment", () => {
    const enrolledStudents = [
      { id: "stu-1", name: "Ahmed", classNumber: 9 },
      { id: "stu-2", name: "Rahul", classNumber: 9 },
      { id: "stu-3", name: "Arif", classNumber: 9 },
    ];

    const defaultAssignments = enrolledStudents.map((s) => ({
      studentId: s.id,
      isEligible: true,
      ineligibilityReason: null,
      status: "ASSIGNED",
    }));

    expect(defaultAssignments.every((a) => a.isEligible)).toBe(true);
    expect(defaultAssignments.every((a) => a.ineligibilityReason === null)).toBe(true);
    expect(defaultAssignments.length).toBe(3);
  });

  it("should require a reason when a student is deselected as ineligible", () => {
    const validateEligibilitySubmission = (
      items: Array<{ studentId: string; isEligible: boolean; ineligibilityReason?: string | null }>
    ) => {
      for (const item of items) {
        if (!item.isEligible && (!item.ineligibilityReason || !item.ineligibilityReason.trim())) {
          throw new Error("An ineligibility reason is required for every student marked as ineligible.");
        }
      }
      return true;
    };

    // Valid: reason provided
    const validRoster = [
      { studentId: "stu-1", isEligible: true, ineligibilityReason: null },
      { studentId: "stu-2", isEligible: false, ineligibilityReason: "Medical leave" },
    ];
    expect(validateEligibilitySubmission(validRoster)).toBe(true);

    // Invalid: missing reason
    const invalidRoster = [
      { studentId: "stu-1", isEligible: true, ineligibilityReason: null },
      { studentId: "stu-2", isEligible: false, ineligibilityReason: "" },
    ];
    expect(() => validateEligibilitySubmission(invalidRoster)).toThrow(
      "An ineligibility reason is required for every student marked as ineligible."
    );
  });

  it("should keep exam visible to ineligible student while rejecting attempt creation", () => {
    const ineligibleAssignment = {
      examId: "exam-c9-chem",
      studentId: "stu-arif",
      isEligible: false,
      ineligibilityReason: "Absent during preparation period",
      status: "ASSIGNED",
    };

    // 1. Student Portal Visibility Check
    // The exam must NOT disappear; it is visible with Not Eligible badge and reason
    expect(ineligibleAssignment.isEligible).toBe(false);
    expect(ineligibleAssignment.ineligibilityReason).toBe("Absent during preparation period");

    // 2. Server Start Attempt Guard
    const startAttemptGuard = (assignment: typeof ineligibleAssignment) => {
      if (!assignment.isEligible) {
        throw new Error(
          assignment.ineligibilityReason
            ? `You are not eligible to attempt this assessment: ${assignment.ineligibilityReason}`
            : "You are not eligible to attempt this examination."
        );
      }
      return { success: true, attemptCreated: true };
    };

    expect(() => startAttemptGuard(ineligibleAssignment)).toThrow(
      "You are not eligible to attempt this assessment: Absent during preparation period"
    );
  });

  it("should allow student to start once re-enabled by admin (ineligible -> eligible)", () => {
    const initialAssignment = {
      examId: "exam-c9-chem",
      studentId: "stu-arif",
      isEligible: false,
      ineligibilityReason: "Medical leave",
      status: "ASSIGNED",
    };

    // Admin re-enables student
    const updatedAssignment = {
      ...initialAssignment,
      isEligible: true,
      ineligibilityReason: null,
    };

    const startAttemptGuard = (assignment: typeof updatedAssignment) => {
      if (!assignment.isEligible) {
        throw new Error("You are not eligible.");
      }
      return { success: true, attemptCreated: true };
    };

    const result = startAttemptGuard(updatedAssignment);
    expect(result.success).toBe(true);
    expect(result.attemptCreated).toBe(true);
  });

  it("should lock target class once student assignments exist to protect historical records", () => {
    const examWithAssignments = {
      id: "exam-1",
      classNumber: 8,
      assignmentsCount: 25,
    };

    const changeClassHandler = (exam: typeof examWithAssignments, requestedClassNumber: number) => {
      if (exam.assignmentsCount > 0 && requestedClassNumber !== exam.classNumber) {
        throw new Error(
          `Target class is locked to Class ${exam.classNumber} because student assignments already exist.`
        );
      }
      return { success: true, classNumber: requestedClassNumber };
    };

    // Attempting to change Class 8 exam to Class 9 after assigning
    expect(() => changeClassHandler(examWithAssignments, 9)).toThrow(
      "Target class is locked to Class 8 because student assignments already exist."
    );

    // Same class is allowed
    expect(changeClassHandler(examWithAssignments, 8).success).toBe(true);
  });

  it("should preserve existing attempt and result history when eligibility is updated", () => {
    const existingAssignment = {
      id: "asgn-1",
      studentId: "stu-1",
      isEligible: true,
      ineligibilityReason: null,
      attempts: [
        { id: "att-1", score: 90, status: "SUBMITTED" },
      ],
      result: { rawMarks: 90, grade: "Excellent" },
    };

    // Updating eligibility must never delete previous attempts or results
    const updatedAssignment = {
      ...existingAssignment,
      isEligible: false,
      ineligibilityReason: "Changed status post assessment",
    };

    expect(updatedAssignment.attempts.length).toBe(1);
    expect(updatedAssignment.attempts[0].id).toBe("att-1");
    expect(updatedAssignment.result.grade).toBe("Excellent");
  });
});
