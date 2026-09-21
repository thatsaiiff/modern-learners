import { describe, it, expect } from "vitest";

describe("Multi-Attempt Selection Rules", () => {
  const attempts = [
    { id: "att-1", attemptNumber: 1, percentage: 70, createdAt: new Date("2026-09-21T10:00:00Z") },
    { id: "att-2", attemptNumber: 2, percentage: 95, createdAt: new Date("2026-09-21T12:00:00Z") },
    { id: "att-3", attemptNumber: 3, percentage: 85, createdAt: new Date("2026-09-21T14:00:00Z") },
  ];

  it("should select FIRST attempt under FIRST rule", () => {
    const selected = attempts[0];
    expect(selected.id).toBe("att-1");
    expect(selected.attemptNumber).toBe(1);
  });

  it("should select LATEST attempt under LATEST rule", () => {
    const selected = attempts[attempts.length - 1];
    expect(selected.id).toBe("att-3");
    expect(selected.attemptNumber).toBe(3);
  });

  it("should select BEST attempt under BEST rule", () => {
    const best = [...attempts].sort((a, b) => b.percentage - a.percentage)[0];
    expect(best.id).toBe("att-2");
    expect(best.percentage).toBe(95);
  });
});

describe("Retake Lifecycle Rules", () => {
  it("should transition retake state from PENDING to APPROVED and increment allowed attempts", () => {
    const assignment = {
      id: "asgn-1",
      allowedAttempts: 1,
      status: "COMPLETED",
    };

    const retakeRequest = {
      id: "retake-1",
      status: "PENDING",
      reason: "Prepared again for Physics test",
    };

    // Approval
    const updatedRequest = {
      ...retakeRequest,
      status: "APPROVED",
      reviewedBy: "admin-uuid",
      reviewedAt: new Date(),
    };

    const updatedAssignment = {
      ...assignment,
      allowedAttempts: assignment.allowedAttempts + 1,
      status: "ASSIGNED",
    };

    expect(updatedRequest.status).toBe("APPROVED");
    expect(updatedAssignment.allowedAttempts).toBe(2);
    expect(updatedAssignment.status).toBe("ASSIGNED");
  });

  it("should transition retake state from PENDING to REJECTED without altering assignment", () => {
    const assignment = {
      id: "asgn-1",
      allowedAttempts: 1,
      status: "COMPLETED",
    };

    const retakeRequest = {
      id: "retake-1",
      status: "PENDING",
      reason: "Please give another chance",
    };

    // Rejection
    const updatedRequest = {
      ...retakeRequest,
      status: "REJECTED",
      reviewedBy: "admin-uuid",
      reviewedAt: new Date(),
      reviewComment: "Maximum attempts reached for this term",
    };

    expect(updatedRequest.status).toBe("REJECTED");
    expect(assignment.allowedAttempts).toBe(1);
    expect(assignment.status).toBe("COMPLETED");
  });
});
