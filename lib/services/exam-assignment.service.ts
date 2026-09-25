import prisma from "@/lib/prisma";
import { AssignmentStatus, ExamStatus, StudentStatus, Prisma } from "@prisma/client";
import { logAudit } from "./audit.service";

export interface StudentEligibilityItem {
  studentId: string;
  isEligible: boolean;
  ineligibilityReason?: string | null;
}

export interface AssignExamInput {
  examId: string;
  classNumber?: number;
  studentEligibility?: StudentEligibilityItem[];
  studentIds?: string[]; // Legacy fallback support
  allowedAttempts?: number;
  startAt?: string | Date;
  loginDeadline?: string | Date;
  durationMinutes?: number;
}

export async function getEligibleStudentsForExam(examId: string, requestedClassNumber?: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      class: true,
      subject: true,
      assignments: {
        include: {
          attempts: true,
        },
      },
    },
  });

  if (!exam) {
    throw new Error("Exam not found.");
  }

  // Check if assignments already exist (class locking rule)
  const isClassLocked = exam.assignments.length > 0;
  let targetClassId = exam.classId;
  let targetClassNumber = exam.class.classNumber;

  if (!isClassLocked && requestedClassNumber && requestedClassNumber !== exam.class.classNumber) {
    const requestedClass = await prisma.class.findUnique({
      where: { classNumber: requestedClassNumber },
    });
    if (requestedClass) {
      targetClassId = requestedClass.id;
      targetClassNumber = requestedClass.classNumber;
    }
  }

  // Find active academic session
  const activeSession = await prisma.academicSession.findFirst({
    where: { isActive: true },
  });

  if (!activeSession) {
    throw new Error("No active academic session found.");
  }

  // Query active students in this target class for the active session
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId: targetClassId,
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

  // Map existing assignments
  const assignmentMap = new Map(exam.assignments.map((a) => [a.studentId, a]));

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      subjectName: exam.subject.name,
      classNumber: targetClassNumber,
      className: `Class ${targetClassNumber}`,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      passingPercentage: exam.passingPercentage,
      startAt: exam.startAt,
      loginDeadline: exam.loginDeadline,
      allowedAttempts: exam.maxAttempts || 1,
      isClassLocked,
    },
    targetClassNumber,
    isClassLocked,
    students: enrollments.map((enr) => {
      const existing = assignmentMap.get(enr.studentId);
      return {
        studentId: enr.student.id,
        studentCode: enr.student.studentCode,
        name: enr.student.name,
        rollNumber: enr.rollNumber,
        className: enr.class.name,
        isAssigned: !!existing,
        isEligible: existing ? existing.isEligible : true, // Default: every enrolled student is eligible
        ineligibilityReason: existing ? existing.ineligibilityReason : null,
        assignmentStatus: existing?.status || null,
        assignmentId: existing?.id || null,
        attemptsCount: existing?.attempts?.length || 0,
      };
    }),
  };
}

export async function assignExamToStudents(
  input: AssignExamInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null,
  txClient?: Prisma.TransactionClient
) {
  const {
    examId,
    classNumber,
    studentEligibility,
    studentIds,
    allowedAttempts = 1,
    startAt,
    loginDeadline,
    durationMinutes,
  } = input;

  const db = txClient || prisma;

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      class: true,
      examQuestions: true,
      assignments: true,
    },
  });

  if (!exam) {
    throw new Error("Exam not found.");
  }

  if (exam.examQuestions.length === 0) {
    throw new Error("Cannot assign an exam with 0 questions.");
  }

  // 1. Target Class Resolution & Locking Validation
  const hasExistingAssignments = exam.assignments.length > 0;
  let targetClassId = exam.classId;

  if (classNumber && classNumber !== exam.class.classNumber) {
    if (hasExistingAssignments) {
      throw new Error(
        `Target class is locked to Class ${exam.class.classNumber} because student assignments already exist. Changing the target class of an active/assigned exam is prohibited to protect historical records.`
      );
    }

    const newClass = await db.class.findUnique({
      where: { classNumber },
    });
    if (!newClass) {
      throw new Error(`Class ${classNumber} not found.`);
    }
    targetClassId = newClass.id;
  }

  // 2. Build Eligibility Roster
  let normalizedEligibility: StudentEligibilityItem[] = [];

  if (studentEligibility && Array.isArray(studentEligibility)) {
    normalizedEligibility = studentEligibility;
  } else if (studentIds && Array.isArray(studentIds)) {
    // Legacy fallback: studentIds selected are eligible
    normalizedEligibility = studentIds.map((id) => ({
      studentId: id,
      isEligible: true,
      ineligibilityReason: null,
    }));
  }

  if (normalizedEligibility.length === 0) {
    throw new Error("Student eligibility roster cannot be empty.");
  }

  // 3. Validate that every ineligible student has a reason
  for (const item of normalizedEligibility) {
    if (!item.isEligible) {
      if (!item.ineligibilityReason || !item.ineligibilityReason.trim()) {
        throw new Error(
          "An ineligibility reason is required for every student marked as ineligible."
        );
      }
    }
  }

  // 4. Validate students are active
  const targetStudentIds = normalizedEligibility.map((item) => item.studentId);
  const activeStudents = await db.student.findMany({
    where: {
      id: { in: targetStudentIds },
      status: StudentStatus.ACTIVE,
    },
  });

  const activeStudentIdSet = new Set(activeStudents.map((s) => s.id));
  const validEligibilityList = normalizedEligibility.filter((item) =>
    activeStudentIdSet.has(item.studentId)
  );

  if (validEligibilityList.length === 0) {
    throw new Error("None of the targeted students are currently active.");
  }

  const executeAssignments = async (tx: Prisma.TransactionClient) => {
    // 5. Update Exam timing / status / classId
    const updateExamData: Record<string, unknown> = {};
    if (exam.status === ExamStatus.DRAFT) {
      updateExamData.status = ExamStatus.ACTIVE;
    }
    if (targetClassId !== exam.classId) {
      updateExamData.classId = targetClassId;
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

    // 6. Upsert ExamAssignment for EVERY student in the class (NEVER delete assignments)
    const assignments = [];
    let eligibleCount = 0;
    let ineligibleCount = 0;

    for (const item of validEligibilityList) {
      const isEligible = item.isEligible;
      const reason = isEligible ? null : item.ineligibilityReason!.trim();

      if (isEligible) eligibleCount++;
      else ineligibleCount++;

      const assignment = await tx.examAssignment.upsert({
        where: {
          examId_studentId: {
            examId,
            studentId: item.studentId,
          },
        },
        update: {
          isEligible,
          ineligibilityReason: reason,
          allowedAttempts,
          status: isEligible ? AssignmentStatus.ASSIGNED : AssignmentStatus.ASSIGNED,
          updatedAt: new Date(),
        },
        create: {
          examId,
          studentId: item.studentId,
          allowedAttempts,
          isEligible,
          ineligibilityReason: reason,
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
          totalAssigned: assignments.length,
          eligibleCount,
          ineligibleCount,
          allowedAttempts,
        },
        ipAddress,
      },
      tx
    );

    return {
      success: true,
      totalCount: assignments.length,
      eligibleCount,
      ineligibleCount,
      assignments,
    };
  };

  if (txClient) {
    return await executeAssignments(txClient);
  }

  return await prisma.$transaction(executeAssignments);
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

    const isSubmitted =
      latestAttempt &&
      (latestAttempt.status === "SUBMITTED" || latestAttempt.status === "AUTO_SUBMITTED");
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
      isEligible: asgn.isEligible,
      ineligibilityReason: asgn.ineligibilityReason,
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
