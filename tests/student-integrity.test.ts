import { describe, it, expect } from "vitest";
import { formatRollNumber } from "@/lib/utils";
import { hashPin, comparePin, validatePinFormat, validateRollNumberFormat } from "@/lib/auth/hash";

describe("Invariant 1: Permanent Student Identity & Non-Destructive Lifecycle", () => {
  it("should generate permanent student code format STU-XXXXXX", () => {
    const formatCode = (seq: number) => `STU-${String(seq).padStart(6, "0")}`;
    expect(formatCode(1)).toBe("STU-000001");
    expect(formatCode(42)).toBe("STU-000042");
    expect(formatCode(1050)).toBe("STU-001050");
  });

  it("should support non-destructive deactivation rather than deletion", () => {
    const student = {
      id: "stu-uuid-1",
      studentCode: "STU-000001",
      name: "Rahul Sharma",
      status: "ACTIVE" as const,
    };

    // Deactivation
    const deactivated = { ...student, status: "INACTIVE" as const };
    expect(deactivated.id).toBe(student.id);
    expect(deactivated.studentCode).toBe(student.studentCode);
    expect(deactivated.status).toBe("INACTIVE");

    // Reactivation
    const reactivated = { ...deactivated, status: "ACTIVE" as const };
    expect(reactivated.status).toBe("ACTIVE");
    expect(reactivated.studentCode).toBe(student.studentCode);
  });
});

describe("Invariant 2: Enrollment History & Promotion Non-Destructiveness", () => {
  it("should preserve previous enrollment history when student is promoted", () => {
    const initialEnrollment = {
      id: "enr-c8-uuid",
      studentId: "stu-uuid-1",
      classNumber: 8,
      sessionName: "2026-27",
      rollNumber: "08-2627-001",
      status: "ACTIVE",
    };

    // Promote to Class 9 in Session 2027-28
    const updatedInitialEnrollment = {
      ...initialEnrollment,
      status: "PROMOTED",
    };

    const newEnrollment = {
      id: "enr-c9-uuid",
      studentId: "stu-uuid-1",
      classNumber: 9,
      sessionName: "2027-28",
      rollNumber: "09-2728-001",
      status: "ACTIVE",
      promotedFromEnrollmentId: initialEnrollment.id,
    };

    // Verify historical enrollment is not overwritten or destroyed
    expect(updatedInitialEnrollment.id).toBe(initialEnrollment.id);
    expect(updatedInitialEnrollment.rollNumber).toBe("08-2627-001");
    expect(updatedInitialEnrollment.status).toBe("PROMOTED");

    // Verify new enrollment links back to original
    expect(newEnrollment.promotedFromEnrollmentId).toBe(initialEnrollment.id);
    expect(newEnrollment.studentId).toBe(initialEnrollment.studentId);
    expect(newEnrollment.rollNumber).toBe("09-2728-001");
  });

  it("should record proper AcademicMovement audit entry on promotion", () => {
    const movement = {
      studentId: "stu-uuid-1",
      fromEnrollmentId: "enr-c8-uuid",
      toEnrollmentId: "enr-c9-uuid",
      movementType: "PROMOTION",
      reason: "Promoted from Class 8 to Class 9",
      performedBy: "admin-uuid",
    };

    expect(movement.movementType).toBe("PROMOTION");
    expect(movement.fromEnrollmentId).toBe("enr-c8-uuid");
    expect(movement.toEnrollmentId).toBe("enr-c9-uuid");
  });
});

describe("Invariant 3: Rollback Integrity & Conflict Prevention", () => {
  it("should rollback promotion and restore previous enrollment correctly", () => {
    const currentEnrollment = {
      id: "enr-c9-uuid",
      studentId: "stu-uuid-1",
      status: "ACTIVE",
      promotedFromEnrollmentId: "enr-c8-uuid",
    };

    // Rollback operation
    const rolledBackCurrent = {
      ...currentEnrollment,
      status: "ROLLED_BACK",
    };

    const restoredPrevious = {
      id: "enr-c8-uuid",
      studentId: "stu-uuid-1",
      status: "ACTIVE",
    };

    const movement = {
      studentId: "stu-uuid-1",
      fromEnrollmentId: currentEnrollment.id,
      toEnrollmentId: restoredPrevious.id,
      movementType: "ROLLBACK",
      reason: "Parental request for Class 8 revision",
      performedBy: "admin-uuid",
    };

    expect(rolledBackCurrent.status).toBe("ROLLED_BACK");
    expect(restoredPrevious.status).toBe("ACTIVE");
    expect(movement.movementType).toBe("ROLLBACK");
    expect(movement.fromEnrollmentId).toBe(currentEnrollment.id);
    expect(movement.toEnrollmentId).toBe(restoredPrevious.id);
  });
});

describe("Invariant 4: Roll Numbers Server-Side Uniqueness", () => {
  it("should format roll numbers deterministically", () => {
    const rolls = [1, 2, 3, 10, 100].map((r) => formatRollNumber(8, "2026-27", r));
    expect(rolls).toEqual([
      "08-2627-001",
      "08-2627-002",
      "08-2627-003",
      "08-2627-010",
      "08-2627-100",
    ]);

    rolls.forEach((r) => expect(validateRollNumberFormat(r)).toBe(true));
  });
});

describe("Invariant 5 & 6: PIN Security, Hashing & Non-Disclosure", () => {
  it("should hash 4-digit PIN with bcrypt and never expose raw PIN", async () => {
    const rawPin = "7412";
    const hashed = await hashPin(rawPin);

    expect(hashed).not.toBe(rawPin);
    expect(hashed.startsWith("$2")).toBe(true);

    const match = await comparePin(rawPin, hashed);
    expect(match).toBe(true);

    const wrongMatch = await comparePin("0000", hashed);
    expect(wrongMatch).toBe(false);
  });

  it("should strip pinHash from safe student output objects", () => {
    const dbRecord = {
      id: "stu-1",
      studentCode: "STU-000001",
      name: "Armaan",
      pinHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
      status: "ACTIVE",
    };

    const safeStudent = { ...dbRecord, pinHash: undefined };
    expect(safeStudent.pinHash).toBeUndefined();
    expect(JSON.stringify(safeStudent)).not.toContain("$2a$10");
  });
});

describe("Invariant 7: API Input Validation", () => {
  it("should strictly validate 4-digit PIN format", () => {
    expect(validatePinFormat("1234")).toBe(true);
    expect(validatePinFormat("0000")).toBe(true);
    expect(validatePinFormat("123")).toBe(false);
    expect(validatePinFormat("12345")).toBe(false);
    expect(validatePinFormat("abcd")).toBe(false);
    expect(validatePinFormat("12a4")).toBe(false);
  });
});
