import prisma from "@/lib/prisma";
import { MovementType, EnrollmentStatus } from "@prisma/client";
import { generateRollNumber } from "./roll.service";
import { logAudit } from "./audit.service";

export interface PromoteClassInput {
  fromClassNumber: number;
  fromSessionId: string;
  toSessionId: string;
  studentIds?: string[]; // Optional subset of students, otherwise all active students in class
  reason?: string;
}

export interface RollbackPromotionInput {
  enrollmentId: string;
  reason: string;
}

export async function promoteClass(
  input: PromoteClassInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const { fromClassNumber, fromSessionId, toSessionId, studentIds, reason } = input;

  // 1. Fetch Target Session
  const targetSession = await prisma.academicSession.findUnique({
    where: { id: toSessionId },
  });
  if (!targetSession) {
    throw new Error("Target academic session not found.");
  }

  // 2. Fetch From Class and To Class
  const fromClass = await prisma.class.findUnique({
    where: { classNumber: fromClassNumber },
  });
  if (!fromClass) {
    throw new Error(`Class ${fromClassNumber} not found.`);
  }

  const isGraduating = fromClassNumber >= 10;
  let targetClass = null;

  if (!isGraduating) {
    const toClassNumber = fromClassNumber + 1;
    targetClass = await prisma.class.findUnique({
      where: { classNumber: toClassNumber },
    });
    if (!targetClass) {
      throw new Error(`Target Class ${toClassNumber} not found.`);
    }
  }

  // 3. Find Active Enrollments to promote
  const enrollmentsToPromote = await prisma.studentEnrollment.findMany({
    where: {
      classId: fromClass.id,
      academicSessionId: fromSessionId,
      status: EnrollmentStatus.ACTIVE,
      student: {
        status: "ACTIVE",
        ...(studentIds && studentIds.length > 0
          ? { id: { in: studentIds } }
          : {}),
      },
    },
    include: {
      student: true,
      class: true,
    },
    orderBy: { rollNumber: "asc" },
  });

  if (enrollmentsToPromote.length === 0) {
    throw new Error("No eligible active students found to promote.");
  }

  // 4. Perform atomic promotion batch
  return await prisma.$transaction(async (tx) => {
    const results = [];

    for (const enr of enrollmentsToPromote) {
      if (isGraduating) {
        // Class 10 Graduation
        await tx.studentEnrollment.update({
          where: { id: enr.id },
          data: { status: EnrollmentStatus.INACTIVE },
        });

        const movement = await tx.academicMovement.create({
          data: {
            studentId: enr.studentId,
            fromEnrollmentId: enr.id,
            toEnrollmentId: enr.id,
            movementType: MovementType.TRANSFER,
            reason: reason || "Completed Class 10 (Graduated)",
            performedBy: actor?.userId || null,
          },
        });

        results.push({ studentId: enr.studentId, status: "GRADUATED", movement });
      } else if (targetClass) {
        // Normal Promotion (e.g. Class 6 -> 7)
        // Mark old enrollment as PROMOTED
        await tx.studentEnrollment.update({
          where: { id: enr.id },
          data: { status: EnrollmentStatus.PROMOTED },
        });

        // Generate new sequential roll number in target class and session
        const newRollNumber = await generateRollNumber(
          targetClass.classNumber,
          targetSession.id,
          targetSession.name,
          targetClass.id,
          tx
        );

        // Create new enrollment
        const newEnrollment = await tx.studentEnrollment.create({
          data: {
            studentId: enr.studentId,
            academicSessionId: targetSession.id,
            classId: targetClass.id,
            rollNumber: newRollNumber,
            status: EnrollmentStatus.ACTIVE,
            promotedFromEnrollmentId: enr.id,
          },
        });

        // Record movement history
        const movement = await tx.academicMovement.create({
          data: {
            studentId: enr.studentId,
            fromEnrollmentId: enr.id,
            toEnrollmentId: newEnrollment.id,
            movementType: MovementType.PROMOTION,
            reason: reason || `Promoted from Class ${fromClassNumber} to Class ${targetClass.classNumber}`,
            performedBy: actor?.userId || null,
          },
        });

        results.push({
          studentId: enr.studentId,
          studentName: enr.student.name,
          previousRoll: enr.rollNumber,
          newRoll: newRollNumber,
          newClass: targetClass.classNumber,
          newEnrollmentId: newEnrollment.id,
          movementId: movement.id,
        });
      }
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role,
        action: "ACADEMIC_PROMOTION_BATCH",
        entityType: "Class",
        entityId: fromClass.id,
        newValue: {
          fromClass: fromClass.classNumber,
          targetClass: targetClass?.classNumber || "Graduated",
          studentsPromotedCount: results.length,
          targetSession: targetSession.name,
        },
        ipAddress,
      },
      tx
    );

    return {
      promotedCount: results.length,
      promotions: results,
    };
  });
}

export async function rollbackPromotion(
  input: RollbackPromotionInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const { enrollmentId, reason } = input;

  if (!reason || reason.trim().length === 0) {
    throw new Error("A reason must be provided for rollback.");
  }

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: true,
      class: true,
      academicSession: true,
      promotedFrom: {
        include: { class: true, academicSession: true },
      },
    },
  });

  if (!enrollment) {
    throw new Error("Enrollment record not found.");
  }

  if (!enrollment.promotedFrom) {
    throw new Error("Cannot rollback: No previous enrollment found for this student.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Mark current enrollment as ROLLED_BACK
    await tx.studentEnrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.ROLLED_BACK },
    });

    // 2. Reactivate the previous enrollment
    const reactivatedEnrollment = await tx.studentEnrollment.update({
      where: { id: enrollment.promotedFrom!.id },
      data: { status: EnrollmentStatus.ACTIVE },
    });

    // 3. Create AcademicMovement entry
    const movement = await tx.academicMovement.create({
      data: {
        studentId: enrollment.studentId,
        fromEnrollmentId: enrollment.id,
        toEnrollmentId: reactivatedEnrollment.id,
        movementType: MovementType.ROLLBACK,
        reason: reason.trim(),
        performedBy: actor?.userId || null,
      },
    });

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role,
        action: "STUDENT_ROLLED_BACK",
        entityType: "Student",
        entityId: enrollment.studentId,
        oldValue: {
          class: enrollment.class.name,
          rollNumber: enrollment.rollNumber,
        },
        newValue: {
          rolledBackToClass: reactivatedEnrollment.classId,
          reason,
        },
        ipAddress,
      },
      tx
    );

    return {
      success: true,
      movement,
      studentId: enrollment.studentId,
      studentName: enrollment.student.name,
      previousRoll: enrollment.rollNumber,
      restoredRoll: reactivatedEnrollment.rollNumber,
    };
  });
}

export async function getRollbackHistory(sessionId?: string) {
  return prisma.academicMovement.findMany({
    where: {
      movementType: MovementType.ROLLBACK,
      ...(sessionId
        ? {
            toEnrollment: {
              academicSessionId: sessionId,
            },
          }
        : {}),
    },
    include: {
      student: true,
      fromEnrollment: {
        include: { class: true, academicSession: true },
      },
      toEnrollment: {
        include: { class: true, academicSession: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRollbackCount(sessionId?: string): Promise<number> {
  return prisma.academicMovement.count({
    where: {
      movementType: MovementType.ROLLBACK,
      ...(sessionId
        ? {
            toEnrollment: {
              academicSessionId: sessionId,
            },
          }
        : {}),
    },
  });
}
