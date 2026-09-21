import prisma from "@/lib/prisma";
import { AssignmentStatus, ExamStatus, StudentStatus } from "@prisma/client";
import { logAudit } from "./audit.service";

export interface AssignExamInput {
  examId: string;
  studentIds: string[];
  allowedAttempts?: number;
  startAt?: string | Date;
  loginDeadline?: string | Date;
  durationMinutes?: number;
}

export async function getEligibleStudentsForExam(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { class: true },
  });

  if (!exam) {
    throw new Error("Exam not found.");
  }

  // Find active academic session
  const activeSession = await prisma.academicSession.findFirst({
    where: { isActive: true },
  });

  if (!activeSession) {
    throw new Error("No active academic session found.");
  }

  // Query active students in this class for the active session
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId: exam.classId,
      academicSessionId: activeSession.id,
      status: "ACTIVE",
      student: {
        status: StudentStatus.ACTIVE,
      },
    },
    include: {
      student: true,
      class: true,
    },
    orderBy: { rollNumber: "asc" },
  });

  // Check existing assignments
  const existingAssignments = await prisma.examAssignment.findMany({
    where: { examId },
  });

  const assignmentMap = new Map(existingAssignments.map((a) => [a.studentId, a]));

  return {
    exam,
    students: enrollments.map((enr) => {
      const existing = assignmentMap.get(enr.studentId);
      return {
        studentId: enr.student.id,
        studentCode: enr.student.studentCode,
        name: enr.student.name,
        rollNumber: enr.rollNumber,
        className: enr.class.name,
        isAssigned: !!existing,
        assignmentStatus: existing?.status || null,
        assignmentId: existing?.id || null,
      };
    }),
  };
}

export async function assignExamToStudents(
  input: AssignExamInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const { examId, studentIds, allowedAttempts = 1, startAt, loginDeadline, durationMinutes } = input;

  if (!studentIds || studentIds.length === 0) {
    throw new Error("At least one student must be selected for assignment.");
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      class: true,
      examQuestions: true,
    },
  });

  if (!exam) {
    throw new Error("Exam not found.");
  }

  if (exam.examQuestions.length === 0) {
    throw new Error("Cannot assign an exam with 0 questions.");
  }

  // Verify all target students are active
  const activeStudents = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      status: StudentStatus.ACTIVE,
    },
  });

  if (activeStudents.length === 0) {
    throw new Error("None of the selected students are currently active.");
  }

  const validStudentIds = activeStudents.map((s) => s.id);

  return await prisma.$transaction(async (tx) => {
    // 1. Optionally update exam timing or status if provided
    const updateExamData: Record<string, unknown> = {};
    if (exam.status === ExamStatus.DRAFT) {
      updateExamData.status = ExamStatus.ACTIVE;
    }
    if (startAt) updateExamData.startAt = new Date(startAt);
    if (loginDeadline) updateExamData.loginDeadline = new Date(loginDeadline);
    if (durationMinutes) updateExamData.durationMinutes = durationMinutes;

    if (Object.keys(updateExamData).length > 0) {
      await tx.exam.update({
        where: { id: examId },
        data: updateExamData,
      });
    }

    // 2. Persist assignments for valid students
    const assignments = [];

    for (const studentId of validStudentIds) {
      const assignment = await tx.examAssignment.upsert({
        where: {
          examId_studentId: {
            examId,
            studentId,
          },
        },
        update: {
          allowedAttempts,
          status: AssignmentStatus.ASSIGNED,
          assignedAt: new Date(),
        },
        create: {
          examId,
          studentId,
          allowedAttempts,
          status: AssignmentStatus.ASSIGNED,
          assignedAt: new Date(),
        },
      });

      assignments.push(assignment);
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role,
        action: "EXAM_ASSIGNED",
        entityType: "Exam",
        entityId: exam.id,
        newValue: {
          examTitle: exam.title,
          assignedCount: assignments.length,
          allowedAttempts,
        },
        ipAddress,
      },
      tx
    );

    return {
      success: true,
      assignedCount: assignments.length,
      assignments,
    };
  });
}

export async function getExamAssignments(examId: string) {
  return prisma.examAssignment.findMany({
    where: { examId },
    include: {
      student: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { class: true },
          },
        },
      },
      attempts: {
        orderBy: { attemptNumber: "desc" },
      },
    },
    orderBy: { assignedAt: "desc" },
  });
}

export async function getStudentAssignedExams(studentId: string) {
  const now = new Date();

  // Find student's active assignments
  const assignments = await prisma.examAssignment.findMany({
    where: {
      studentId,
      student: {
        status: StudentStatus.ACTIVE,
      },
    },
    include: {
      exam: {
        include: {
          subject: true,
          class: true,
          chapter: true,
          _count: {
            select: { examQuestions: true },
          },
        },
      },
      attempts: {
        orderBy: { attemptNumber: "desc" },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const available = [];
  const upcoming = [];
  const completed = [];
  const expired = [];

  for (const asgn of assignments) {
    const exam = asgn.exam;
    const latestAttempt = asgn.attempts[0];

    // Check if there is an active in-progress attempt
    const inProgressAttempt = asgn.attempts.find(
      (att) => att.status === "IN_PROGRESS" && new Date(att.serverDeadline) > now
    );

    const isSubmitted = latestAttempt && (latestAttempt.status === "SUBMITTED" || latestAttempt.status === "AUTO_SUBMITTED");
    const hasReachedMaxAttempts = asgn.attempts.length >= asgn.allowedAttempts && isSubmitted;

    const examItem = {
      assignmentId: asgn.id,
      examId: exam.id,
      title: exam.title,
      subjectName: exam.subject.name,
      subjectCode: exam.subject.code,
      className: exam.class.name,
      classNumber: exam.class.classNumber,
      chapterName: exam.chapter?.name || null,
      description: exam.description,
      instructions: exam.instructions,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      totalQuestions: exam._count.examQuestions,
      passingPercentage: exam.passingPercentage,
      startAt: exam.startAt,
      loginDeadline: exam.loginDeadline,
      allowedAttempts: asgn.allowedAttempts,
      attemptsCount: asgn.attempts.length,
      status: asgn.status,
      activeAttemptId: inProgressAttempt?.id || null,
      latestAttempt: latestAttempt
        ? {
            id: latestAttempt.id,
            attemptNumber: latestAttempt.attemptNumber,
            status: latestAttempt.status,
            startedAt: latestAttempt.startedAt,
            submittedAt: latestAttempt.submittedAt,
            autoSubmitted: latestAttempt.autoSubmitted,
          }
        : null,
    };

    if (hasReachedMaxAttempts || asgn.status === AssignmentStatus.COMPLETED) {
      completed.push(examItem);
    } else if (inProgressAttempt) {
      // In progress always belongs in available/active
      available.push(examItem);
    } else if (now < new Date(exam.startAt)) {
      upcoming.push(examItem);
    } else if (now <= new Date(exam.loginDeadline)) {
      available.push(examItem);
    } else {
      expired.push(examItem);
    }
  }

  return {
    available,
    upcoming,
    completed,
    expired,
  };
}
