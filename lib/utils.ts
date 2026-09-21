import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRollNumber(classNum: number, sessionName: string, roll: number): string {
  const classStr = String(classNum).padStart(2, "0");
  const sessionStr = sessionName.replace("-", ""); // e.g. "2026-27" -> "202627" or "2627"
  const cleanSession = sessionStr.length === 6 ? sessionStr.substring(2) : sessionStr; // "2627"
  const rollStr = String(roll).padStart(3, "0");
  return `${classStr}-${cleanSession}-${rollStr}`;
}
