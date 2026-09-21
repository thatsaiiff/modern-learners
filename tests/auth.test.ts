import { describe, it, expect } from "vitest";
import {
  hashPassword,
  comparePassword,
  hashPin,
  comparePin,
  validatePinFormat,
  validateRollNumberFormat,
} from "@/lib/auth/hash";
import { createAdminToken, createStudentToken, verifyJWT } from "@/lib/auth/jwt";
import { AdminSessionPayload, StudentSessionPayload } from "@/lib/auth/types";

describe("Password and PIN Hashing Security", () => {
  it("should hash and verify password securely", async () => {
    const password = "AdminSecurePassword2026!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2")).toBe(true);

    const isMatch = await comparePassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword("WrongPassword", hash);
    expect(isWrongMatch).toBe(false);
  });

  it("should validate 4-digit PIN format strictly", () => {
    expect(validatePinFormat("1234")).toBe(true);
    expect(validatePinFormat("0000")).toBe(true);
    expect(validatePinFormat("9876")).toBe(true);

    expect(validatePinFormat("123")).toBe(false); // too short
    expect(validatePinFormat("12345")).toBe(false); // too long
    expect(validatePinFormat("abcd")).toBe(false); // non-numeric
    expect(validatePinFormat("12a4")).toBe(false); // mixed
    expect(validatePinFormat("")).toBe(false); // empty
  });

  it("should hash and verify 4-digit PIN correctly", async () => {
    const pin = "4589";
    const hash = await hashPin(pin);

    expect(hash).not.toBe(pin);
    const isMatch = await comparePin(pin, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePin("9999", hash);
    expect(isWrongMatch).toBe(false);
  });

  it("should reject hashing invalid PIN formats", async () => {
    await expect(hashPin("12")).rejects.toThrow();
    await expect(hashPin("abcd")).rejects.toThrow();
  });
});

describe("Roll Number Validation", () => {
  it("should validate academic roll number pattern Class-Session-Roll", () => {
    expect(validateRollNumberFormat("08-2627-001")).toBe(true);
    expect(validateRollNumberFormat("06-2627-015")).toBe(true);
    expect(validateRollNumberFormat("10-2627-105")).toBe(true);

    expect(validateRollNumberFormat("8-2627-1")).toBe(false);
    expect(validateRollNumberFormat("08-262-001")).toBe(false);
    expect(validateRollNumberFormat("invalid-roll")).toBe(false);
  });
});

describe("JWT Session Tokens", () => {
  it("should sign and verify Admin JWT token", async () => {
    const adminData: Omit<AdminSessionPayload, "type"> = {
      userId: "usr-admin-uuid",
      role: "ADMIN",
      username: "admin",
      email: "admin@modernlearners.com",
      name: "Saif Sir",
    };

    const token = await createAdminToken(adminData);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const verified = await verifyJWT<AdminSessionPayload>(token);
    expect(verified).not.toBeNull();
    expect(verified?.type).toBe("admin");
    expect(verified?.userId).toBe("usr-admin-uuid");
    expect(verified?.role).toBe("ADMIN");
    expect(verified?.name).toBe("Saif Sir");
  });

  it("should sign and verify Student JWT token", async () => {
    const studentData: Omit<StudentSessionPayload, "type"> = {
      studentId: "stu-123-uuid",
      studentCode: "STU-000001",
      rollNumber: "08-2627-001",
      classId: "cls-8-uuid",
      classNumber: 8,
      name: "Armaan",
      role: "STUDENT",
    };

    const token = await createStudentToken(studentData);
    expect(typeof token).toBe("string");

    const verified = await verifyJWT<StudentSessionPayload>(token);
    expect(verified).not.toBeNull();
    expect(verified?.type).toBe("student");
    expect(verified?.studentId).toBe("stu-123-uuid");
    expect(verified?.studentCode).toBe("STU-000001");
    expect(verified?.rollNumber).toBe("08-2627-001");
    expect(verified?.classNumber).toBe(8);
    expect(verified?.role).toBe("STUDENT");
  });

  it("should return null for tampered or invalid JWT tokens", async () => {
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature";
    const verified = await verifyJWT(fakeToken);
    expect(verified).toBeNull();
  });
});
