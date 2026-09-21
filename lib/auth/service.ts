import prisma from "@/lib/prisma";
import { comparePassword, comparePin } from "./hash";
import { AdminSessionPayload, StudentSessionPayload, AuthResult } from "./types";

export async function authenticateAdmin(
  identifier: string,
  password: string
): Promise<AuthResult<AdminSessionPayload>> {
  if (!identifier || !password) {
    return { success: false, error: "Username/Email and password are required." };
  }

  const trimmedIdentifier = identifier.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: trimmedIdentifier },
        { email: trimmedIdentifier },
      ],
      isActive: true,
    },
  });

  if (!user) {
    return { success: false, error: "Invalid credentials." };
  }

  const isValidPassword = await comparePassword(password, user.passwordHash);
  if (!isValidPassword) {
    return { success: false, error: "Invalid credentials." };
  }

  const payload: AdminSessionPayload = {
    type: "admin",
    userId: user.id,
    role: user.role === "ADMIN" ? "ADMIN" : "TEACHER",
    username: user.username,
    email: user.email,
    name: user.name,
  };

  return { success: true, data: payload };
}

export async function authenticateStudent(
  rollNumber: string,
  pin: string
): Promise<AuthResult<StudentSessionPayload>> {
  if (!rollNumber || !pin) {
    return { success: false, error: "Roll number and 4-digit PIN are required." };
  }

  const trimmedRoll = rollNumber.trim();
  const trimmedPin = pin.trim();

  if (!/^\d{4}$/.test(trimmedPin)) {
    return { success: false, error: "PIN must be exactly 4 digits." };
  }

  // Find active enrollment for this roll number
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      rollNumber: trimmedRoll,
      status: "ACTIVE",
      student: {
        status: "ACTIVE",
      },
      academicSession: {
        isActive: true,
      },
    },
    include: {
      student: true,
      class: true,
      academicSession: true,
    },
  });

  if (!enrollment) {
    return {
      success: false,
      error: "Student not found or inactive for current academic session.",
    };
  }

  const isValidPin = await comparePin(trimmedPin, enrollment.student.pinHash);
  if (!isValidPin) {
    return { success: false, error: "Invalid roll number or PIN." };
  }

  const payload: StudentSessionPayload = {
    type: "student",
    studentId: enrollment.student.id,
    studentCode: enrollment.student.studentCode,
    rollNumber: enrollment.rollNumber,
    classId: enrollment.class.id,
    classNumber: enrollment.class.classNumber,
    name: enrollment.student.name,
    role: "STUDENT",
  };

  return { success: true, data: payload };
}
