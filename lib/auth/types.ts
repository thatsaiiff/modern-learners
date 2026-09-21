export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export interface AdminSessionPayload {
  type: "admin" | "teacher";
  userId: string;
  role: "ADMIN" | "TEACHER";
  username: string | null;
  email: string | null;
  name: string;
  exp?: number;
  iat?: number;
}

export interface StudentSessionPayload {
  type: "student";
  studentId: string;
  studentCode: string;
  rollNumber: string;
  classId: string;
  classNumber: number;
  name: string;
  role: "STUDENT";
  exp?: number;
  iat?: number;
}

export type AuthSession = AdminSessionPayload | StudentSessionPayload;

export interface AuthResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
