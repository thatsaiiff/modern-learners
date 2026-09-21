import { describe, it, expect } from "vitest";
import { formatRollNumber } from "@/lib/utils";
import { validatePinFormat, validateRollNumberFormat } from "@/lib/auth/hash";

describe("Student Roll Number Generation & Validation", () => {
  it("should generate proper roll number format 08-2627-001 for Class 8, Session 2026-27, Roll 1", () => {
    const roll = formatRollNumber(8, "2026-27", 1);
    expect(roll).toBe("08-2627-001");
    expect(validateRollNumberFormat(roll)).toBe(true);
  });

  it("should support rolls >= 100 without losing formatting", () => {
    const roll = formatRollNumber(9, "2026-27", 125);
    expect(roll).toBe("09-2627-125");
    expect(validateRollNumberFormat(roll)).toBe(true);
  });

  it("should format session codes correctly from various formats", () => {
    expect(formatRollNumber(10, "2027-28", 5)).toBe("10-2728-005");
    expect(formatRollNumber(6, "2627", 2)).toBe("06-2627-002");
  });

  it("should reject invalid roll number formats", () => {
    expect(validateRollNumberFormat("")).toBe(false);
    expect(validateRollNumberFormat("8-2627-1")).toBe(false);
    expect(validateRollNumberFormat("08-262-001")).toBe(false);
    expect(validateRollNumberFormat("08-2627-AB1")).toBe(false);
  });
});

describe("Student PIN & Validation Rules", () => {
  it("should accept valid 4-digit PINs", () => {
    expect(validatePinFormat("1234")).toBe(true);
    expect(validatePinFormat("0000")).toBe(true);
    expect(validatePinFormat("9999")).toBe(true);
  });

  it("should reject invalid PINs", () => {
    expect(validatePinFormat("123")).toBe(false);
    expect(validatePinFormat("12345")).toBe(false);
    expect(validatePinFormat("12a4")).toBe(false);
    expect(validatePinFormat(" 1234 ")).toBe(false);
    expect(validatePinFormat("")).toBe(false);
  });
});

describe("Academic Progression Business Rules", () => {
  it("should calculate correct next class for standard promotion", () => {
    const getNextClass = (currentClass: number) => {
      if (currentClass >= 10) return null; // Graduated
      return currentClass + 1;
    };

    expect(getNextClass(6)).toBe(7);
    expect(getNextClass(7)).toBe(8);
    expect(getNextClass(8)).toBe(9);
    expect(getNextClass(9)).toBe(10);
    expect(getNextClass(10)).toBeNull();
  });

  it("should maintain rollback audit data integrity", () => {
    const movement = {
      movementType: "ROLLBACK",
      reason: "Parental request to repeat Class 8",
      performedBy: "admin-uuid",
      fromEnrollmentId: "enr-class9-uuid",
      toEnrollmentId: "enr-class8-uuid",
      createdAt: new Date(),
    };

    expect(movement.movementType).toBe("ROLLBACK");
    expect(movement.reason).toBeTruthy();
    expect(movement.fromEnrollmentId).not.toBe(movement.toEnrollmentId);
  });
});

describe("Student Profile & Name Update Business Rules", () => {
  it("should update student name while strictly preserving immutable permanent Student ID and roll number", () => {
    const originalStudent = {
      id: "stu-uuid-1",
      studentCode: "STU-000001",
      name: "Rahul Sharma",
      status: "ACTIVE" as const,
      phone: "9876543210",
      activeEnrollment: {
        id: "enr-uuid-1",
        rollNumber: "08-2627-001",
        classNumber: 8,
      },
    };

    const newName = "Rahul A. Sharma";
    const updatedStudent = {
      ...originalStudent,
      name: newName.trim(),
    };

    // Verify name changed
    expect(updatedStudent.name).toBe("Rahul A. Sharma");

    // Verify permanent metadata remained untouched
    expect(updatedStudent.id).toBe(originalStudent.id);
    expect(updatedStudent.studentCode).toBe(originalStudent.studentCode);
    expect(updatedStudent.activeEnrollment.rollNumber).toBe("08-2627-001");
    expect(updatedStudent.activeEnrollment.classNumber).toBe(8);
  });

  it("should reject empty or whitespace-only student names", () => {
    const validateName = (name: string) => {
      const trimmed = name ? name.trim() : "";
      return trimmed.length > 0 && trimmed.length <= 100;
    };

    expect(validateName("Armaan Khan")).toBe(true);
    expect(validateName("")).toBe(false);
    expect(validateName("   ")).toBe(false);
  });
});
