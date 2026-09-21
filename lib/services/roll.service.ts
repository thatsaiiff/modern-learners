import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Generates the next permanent Student ID (e.g. STU-000001, STU-000002)
 */
export async function generateStudentCode(
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx || prisma;
  const count = await db.student.count();
  const nextSeq = count + 1;
  const padded = String(nextSeq).padStart(6, "0");
  const code = `STU-${padded}`;

  // Verify uniqueness (in case of past deletions or custom insertions)
  const existing = await db.student.findUnique({
    where: { studentCode: code },
  });

  if (existing) {
    // Generate a fallback unique code based on timestamp sequence
    const uniqueSeq = count + 1000 + Math.floor(Math.random() * 900);
    return `STU-${String(uniqueSeq).padStart(6, "0")}`;
  }

  return code;
}

/**
 * Generates an academic roll number: CLASS-SESSION-ROLL (e.g. 08-2627-001)
 */
export async function generateRollNumber(
  classNumber: number,
  academicSessionId: string,
  academicSessionName: string,
  classId: string,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx || prisma;

  // Format session name e.g. "2026-27" -> "2627"
  const cleanSessionName = academicSessionName.replace("-", "").trim();
  const sessionCode =
    cleanSessionName.length === 6 ? cleanSessionName.substring(2) : cleanSessionName; // "2627"

  const classCode = String(classNumber).padStart(2, "0"); // "08"

  // Count existing enrollments in this class and session
  const existingEnrollments = await db.studentEnrollment.findMany({
    where: {
      academicSessionId,
      classId,
    },
    select: {
      rollNumber: true,
    },
  });

  // Extract numeric suffixes to find the next available sequential roll
  let maxSeq = 0;
  const prefix = `${classCode}-${sessionCode}-`;

  for (const enr of existingEnrollments) {
    if (enr.rollNumber.startsWith(prefix)) {
      const seqStr = enr.rollNumber.substring(prefix.length);
      const parsedSeq = parseInt(seqStr, 10);
      if (!isNaN(parsedSeq) && parsedSeq > maxSeq) {
        maxSeq = parsedSeq;
      }
    }
  }

  const nextRollSeq = maxSeq + 1;
  const paddedRollSeq = String(nextRollSeq).padStart(3, "0");

  return `${prefix}${paddedRollSeq}`;
}
