import { cookies } from "next/headers";
import { verifyJWT } from "./jwt";
import { AdminSessionPayload, StudentSessionPayload, AuthSession } from "./types";

export const ADMIN_COOKIE_NAME = "ml_admin_session";
export const STUDENT_COOKIE_NAME = "ml_student_session";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, COOKIE_OPTIONS);
}

export async function setStudentSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(STUDENT_COOKIE_NAME, token, COOKIE_OPTIONS);
}

export async function clearAllSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  cookieStore.delete(STUDENT_COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyJWT<AdminSessionPayload>(token);
  if (!payload || (payload.role !== "ADMIN" && payload.role !== "TEACHER")) {
    return null;
  }
  return payload;
}

export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyJWT<StudentSessionPayload>(token);
  if (!payload || payload.role !== "STUDENT") {
    return null;
  }
  return payload;
}

export async function getAnySession(): Promise<AuthSession | null> {
  const admin = await getAdminSession();
  if (admin) return admin;
  const student = await getStudentSession();
  if (student) return student;
  return null;
}
