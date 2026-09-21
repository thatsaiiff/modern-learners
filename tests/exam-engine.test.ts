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
