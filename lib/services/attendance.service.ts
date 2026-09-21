import prisma from "@/lib/prisma";
import { AttendanceStatus, AttendanceMethod, StudentStatus, Prisma } from "@prisma/client";
import { logAudit } from "./audit.service";
import { ANALYTICS_THRESHOLDS } from "@/lib/analytics/constants";

export interface CreateAttendanceSessionInput {
  classNumber: number;
  date: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  studentCheckInEnabled?: boolean;
  title?: string;
  academicSessionId?: string;
}

export interface MarkRosterRecordInput {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export async function createAttendanceSession(
  input: CreateAttendanceSessionInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const targetClass = await prisma.class.findUnique({
    where: { classNumber: input.classNumber },
  });

  if (!targetClass) {
    throw new Error(`Class ${input.classNumber} not found.`);
  }

  let sessionId = input.academicSessionId;
  if (!sessionId) {
    const active = await prisma.academicSession.findFirst({ where: { isActive: true } });
    sessionId = active?.id;
  }

  if (!sessionId) {
    throw new Error("No active academic session found.");
  }

  const sessionDate = new Date(input.date);
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);

  if (endTime <= startTime) {
    throw new Error("Session end time must be after start time.");
  }

  return await prisma.$transaction(async (tx) => {
    const session = await tx.attendanceSession.create({
      data: {
        classId: targetClass.id,
        academicSessionId: sessionId!,
        date: sessionDate,
        startTime,
        endTime,
        studentCheckInEnabled: input.studentCheckInEnabled ?? false,
        title: input.title?.trim() || `${targetClass.name} Attendance`,
        createdBy: actor?.userId || null,
      },
    });

    // Pre-populate roster for active students
    const activeEnrollments = await tx.studentEnrollment.findMany({
      where: {
        classId: targetClass.id,
        academicSessionId: sessionId,
        status: "ACTIVE",
        student: { status: StudentStatus.ACTIVE },
      },
      include: { student: true },
    });

    for (const enr of activeEnrollments) {
      await tx.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: enr.studentId,
          status: AttendanceStatus.ABSENT, // Default absent until marked
          method: AttendanceMethod.TEACHER,
          markedBy: actor?.userId || null,
        },
      });
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role,
        action: "ATTENDANCE_SESSION_CREATED",
        entityType: "AttendanceSession",
        entityId: session.id,
        newValue: {
          class: targetClass.classNumber,
          date: sessionDate,
          rosterCount: activeEnrollments.length,
          studentCheckInEnabled: session.studentCheckInEnabled,
        },
        ipAddress,
      },
      tx
    );

    return session;
  });
}

export async function markRosterAttendance(
  sessionId: string,
  records: MarkRosterRecordInput[],
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });

  if (!session) {
    throw new Error("Attendance session not found.");
  }

  return await prisma.$transaction(async (tx) => {
    let markedCount = 0;

    for (const rec of records) {
      await tx.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId: rec.studentId,
          },
        },
        update: {
          status: rec.status,
          method: AttendanceMethod.TEACHER,
          markedBy: actor?.userId || null,
          remarks: rec.remarks?.trim() || null,
          markedAt: new Date(),
        },
        create: {
          sessionId,
          studentId: rec.studentId,
          status: rec.status,
          method: AttendanceMethod.TEACHER,
          markedBy: actor?.userId || null,
          remarks: rec.remarks?.trim() || null,
          markedAt: new Date(),
        },
      });
      markedCount++;
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role,
        action: "ATTENDANCE_ROSTER_MARKED",
        entityType: "AttendanceSession",
        entityId: session.id,
        newValue: {
          class: session.class.classNumber,
          recordsUpdated: markedCount,
        },
        ipAddress,
      },
      tx
    );

    return {
      success: true,
      markedCount,
    };
  });
}

/**
 * Server-authoritative student self check-in
 */
export async function studentSelfCheckIn(
  studentId: string,
  ipAddress?: string | null
) {
  const now = new Date();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
      },
    },
  });

  if (!student || student.status !== StudentStatus.ACTIVE) {
    throw new Error("Student account is inactive or not found.");
  }

  const activeEnr = student.enrollments[0];
  if (!activeEnr) {
    throw new Error("No active enrollment found for this student.");
  }

  // Find active check-in window
  const activeSession = await prisma.attendanceSession.findFirst({
    where: {
      classId: activeEnr.classId,
      academicSessionId: activeEnr.academicSessionId,
      studentCheckInEnabled: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: { class: true },
  });

  if (!activeSession) {
    throw new Error(
      "No active attendance check-in window is open for your class right now."
    );
  }

  // Idempotently mark attendance
  const record = await prisma.attendanceRecord.upsert({
    where: {
      sessionId_studentId: {
        sessionId: activeSession.id,
        studentId: student.id,
      },
    },
    update: {
      status: AttendanceStatus.PRESENT,
      method: AttendanceMethod.STUDENT_CHECKIN,
      markedAt: now,
      markedBy: student.id,
    },
    create: {
      sessionId: activeSession.id,
      studentId: student.id,
      status: AttendanceStatus.PRESENT,
      method: AttendanceMethod.STUDENT_CHECKIN,
      markedAt: now,
      markedBy: student.id,
    },
  });

  await logAudit({
    actorId: student.id,
    actorRole: "STUDENT",
    action: "ATTENDANCE_STUDENT_CHECKIN",
    entityType: "AttendanceRecord",
    entityId: record.id,
    newValue: {
      sessionTitle: activeSession.title,
      checkedInAt: now,
    },
    ipAddress,
  });

  return {
    success: true,
    message: `Checked in successfully for ${activeSession.title}!`,
    record,
    session: activeSession,
  };
}

export async function getStudentAttendanceSummary(studentId: string) {
  const [student, records] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: { class: true },
        },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: { studentId },
      include: {
        session: {
          include: { class: true },
        },
      },
      orderBy: { markedAt: "desc" },
    }),
  ]);

  if (!student) {
    throw new Error("Student not found.");
  }

  const activeEnr = student.enrollments[0];
  const now = new Date();

  // Check if there is an active check-in session for student right now
  let activeCheckInSession = null;
  if (activeEnr) {
    activeCheckInSession = await prisma.attendanceSession.findFirst({
      where: {
        classId: activeEnr.classId,
        academicSessionId: activeEnr.academicSessionId,
        studentCheckInEnabled: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    });
  }

  const totalSessions = records.length;
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;

  for (const r of records) {
    if (r.status === AttendanceStatus.PRESENT) presentCount++;
    else if (r.status === AttendanceStatus.LATE) lateCount++;
    else if (r.status === AttendanceStatus.ABSENT) absentCount++;
  }

  const attendancePercentage =
    totalSessions > 0
      ? parseFloat((((presentCount + lateCount) / totalSessions) * 100).toFixed(1))
      : 100.0; // Default 100% before sessions occur

  return {
    studentInfo: {
      id: student.id,
      name: student.name,
      studentCode: student.studentCode,
      rollNumber: activeEnr?.rollNumber || "N/A",
      className: activeEnr?.class?.name || "N/A",
    },
    summary: {
      attendancePercentage,
      totalSessions,
      presentCount,
      lateCount,
      absentCount,
      isLowAttendance: attendancePercentage < ANALYTICS_THRESHOLDS.LOW_ATTENDANCE_THRESHOLD,
    },
    activeCheckInSession: activeCheckInSession
      ? {
          id: activeCheckInSession.id,
          title: activeCheckInSession.title,
          endTime: activeCheckInSession.endTime,
        }
      : null,
    recentRecords: records.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      sessionTitle: r.session.title,
      className: r.session.class.name,
      date: r.session.date,
      status: r.status,
      method: r.method,
      markedAt: r.markedAt,
      remarks: r.remarks,
    })),
  };
}

export async function getAttendanceSessions(filters?: {
  classNumber?: number;
  sessionId?: string;
  date?: string | Date;
}) {
  const where: Prisma.AttendanceSessionWhereInput = {};

  if (filters?.classNumber) {
    where.class = { classNumber: filters.classNumber };
  }
  if (filters?.sessionId) {
    where.academicSessionId = filters.sessionId;
  }
  if (filters?.date) {
    const d = new Date(filters.date);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    where.date = { gte: startOfDay, lte: endOfDay };
  }

  const sessions = await prisma.attendanceSession.findMany({
    where,
    include: {
      class: true,
      records: true,
    },
    orderBy: { date: "desc" },
  });

  return sessions.map((s) => {
    const total = s.records.length;
    const present = s.records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const late = s.records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const absent = s.records.filter((r) => r.status === AttendanceStatus.ABSENT).length;

    return {
      id: s.id,
      title: s.title,
      classNumber: s.class.classNumber,
      className: s.class.name,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      studentCheckInEnabled: s.studentCheckInEnabled,
      totalStudents: total,
      presentCount: present,
      lateCount: late,
      absentCount: absent,
      attendanceRate: total > 0 ? parseFloat((((present + late) / total) * 100).toFixed(1)) : 0,
    };
  });
}

export async function getAttendanceSessionWithRoster(sessionId: string) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      class: true,
      records: {
        include: {
          student: {
            include: {
              enrollments: {
                where: { status: "ACTIVE" },
              },
            },
          },
        },
        orderBy: { student: { name: "asc" } },
      },
    },
  });

  if (!session) {
    throw new Error("Attendance session not found.");
  }

  return {
    session: {
      id: session.id,
      title: session.title,
      className: session.class.name,
      classNumber: session.class.classNumber,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      studentCheckInEnabled: session.studentCheckInEnabled,
    },
    roster: session.records.map((r) => ({
      recordId: r.id,
      studentId: r.studentId,
      studentName: r.student.name,
      studentCode: r.student.studentCode,
      rollNumber: r.student.enrollments[0]?.rollNumber || "N/A",
      status: r.status,
      method: r.method,
      markedAt: r.markedAt,
      remarks: r.remarks,
    })),
  };
}
