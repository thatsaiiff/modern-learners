import { SignJWT, jwtVerify } from "jose";
import { AdminSessionPayload, StudentSessionPayload, AuthSession } from "./types";

const DEFAULT_SECRET = "modern-learners-super-secret-jwt-key-2026-saif-classes-secure";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

export async function signJWT(
  payload: Record<string, unknown>,
  expiresIn = "7d"
): Promise<string> {
  const secret = getSecretKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyJWT<T = AuthSession>(token: string): Promise<T | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export async function createAdminToken(payload: Omit<AdminSessionPayload, "type">): Promise<string> {
  return signJWT({ ...payload, type: "admin" }, "7d");
}

export async function createStudentToken(payload: Omit<StudentSessionPayload, "type">): Promise<string> {
  return signJWT({ ...payload, type: "student" }, "7d");
}
