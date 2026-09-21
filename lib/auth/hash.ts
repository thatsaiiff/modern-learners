import * as bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export async function hashPin(pin: string): Promise<string> {
  if (!validatePinFormat(pin)) {
    throw new Error("Invalid PIN format. PIN must be exactly 4 digits.");
  }
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function comparePin(pin: string, hash: string): Promise<boolean> {
  if (!validatePinFormat(pin) || !hash) return false;
  return bcrypt.compare(pin, hash);
}

export function validatePinFormat(pin: string): boolean {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

export function validateRollNumberFormat(rollNumber: string): boolean {
  // Format: Class(2 digits) - Session(4 digits) - Roll(3+ digits), e.g. "08-2627-001"
  return typeof rollNumber === "string" && /^\d{2}-\d{4}-\d{3,}$/.test(rollNumber);
}
