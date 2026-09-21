import prisma from "@/lib/prisma";
import { StudentStatus, Prisma } from "@prisma/client";
import { hashPin, validatePinFormat } from "@/lib/auth/hash";
import { generateStudentCode, generateRollNumber } from "./roll.service";
import { logAudit } from "./audit.service";

export interface CreateStudentInput {
  name: string;
  classNumber: number;
  pin: string;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  academicSessionId?: string;
}

export interface UpdateStudentInput {
  name?: string;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  status?: StudentStatus;
}

export interface GetStudentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  classNumber?: number;
  academicSessionId?: string;
  status?: StudentStatus;
}

export async function createStudent(
  input: CreateStudentInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error("Student name is required.");
  }

  if (!validatePinFormat(input.pin)) {
    throw new Error("Invalid PIN. PIN must be exactly 4 numeric digits.");
  }

  // 1. Fetch Class
  const targetClass = await prisma.class.findUnique({
    where: { classNumber: input.classNumber },
  });
  if (!targetClass) {
    throw new Error(`Class ${input.classNumber} not found.`);
  }

  // 2. Fetch Academic Session (specified or active)
  let session = null;
  if (input.academicSessionId) {
    session = await prisma.academicSession.findUnique({
      where: { id: input.academicSessionId },
    });
  } else {
    session = await prisma.academicSession.findFirst({
      where: { isActive: true },
    });
  }

  if (!session) {
    throw new Error("No active academic session found.");
  }

  const pinHash = await hashPin(input.pin.trim());

  // 3. Execute in database transaction
  return await prisma.$transaction(async (tx) => {
    const studentCode = await generateStudentCode(tx);
    const rollNumber = await generateRollNumber(
      targetClass.classNumber,
      session.id,
      session.name,
      targetClass.id,
      tx
    );

    const student = await tx.student.create({
      data: {
        studentCode,
        name: input.name.trim(),
        pinHash,
        phone: input.phone?.trim() || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        status: StudentStatus.ACTIVE,
      },
    });

    const enrollment = await tx.studentEnrollment.create({
      data: {
        studentId: student.id,
        academicSessionId: session.id,
        classId: targetClass.id,
        rollNumber,
        status: "ACTIVE",
      },
      include: {
        class: true,
        academicSession: true,
      },
    });

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role,
        action: "STUDENT_CREATED",
        entityType: "Student",
        entityId: student.id,
        newValue: {
          studentCode,
          name: student.name,
          rollNumber,
          class: targetClass.classNumber,
          session: session.name,
        },
        ipAddress,
      },
      tx
    );

    return {
      student,
      enrollment,
    };
  });
}

export async function getStudents(query: GetStudentsQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  // Active session
  let sessionId = query.academicSessionId;
  if (!sessionId) {
    const activeSession = await prisma.academicSession.findFirst({
      where: { isActive: true },
    });
    sessionId = activeSession?.id;
  }

  const whereCondition: Prisma.StudentWhereInput = {};

  if (query.status) {
    whereCondition.status = query.status;
  }

  if (query.search && query.search.trim().length > 0) {
    const s = query.search.trim();
    whereCondition.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { studentCode: { contains: s, mode: "insensitive" } },
      {
        enrollments: {
          some: {
            rollNumber: { contains: s, mode: "insensitive" },
          },
        },
      },
    ];
  }

  if (query.classNumber || sessionId) {
    whereCondition.enrollments = {
      some: {
        ...(query.classNumber
          ? { class: { classNumber: query.classNumber } }
          : {}),
        ...(sessionId ? { academicSessionId: sessionId } : {}),
      },
    };
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where: whereCondition }),
    prisma.student.findMany({
      where: whereCondition,
      include: {
        enrollments: {
          where: sessionId ? { academicSessionId: sessionId } : undefined,
          include: {
            class: true,
            academicSession: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const formattedStudents = students.map((stu) => {
    const activeEnrollment =
      stu.enrollments.find((e) => e.status === "ACTIVE") || stu.enrollments[0];
    return {
      id: stu.id,
      studentCode: stu.studentCode,
      name: stu.name,
      status: stu.status,
      phone: stu.phone,
      dateOfBirth: stu.dateOfBirth,
      joinedAt: stu.joinedAt,
      rollNumber: activeEnrollment?.rollNumber || "N/A",
      className: activeEnrollment?.class?.name || "Unassigned",
      classNumber: activeEnrollment?.class?.classNumber || null,
      sessionName: activeEnrollment?.academicSession?.name || "N/A",
      enrollmentId: activeEnrollment?.id || null,
    };
  });

  return {
    students: formattedStudents,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getStudentById(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          class: true,
          academicSession: true,
        },
        orderBy: { createdAt: "desc" },
      },
      academicMovements: {
        include: {
          fromEnrollment: {
            include: { class: true, academicSession: true },
          },
          toEnrollment: {
            include: { class: true, academicSession: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      results: {
        where: { isOfficial: true },
        include: {
          exam: {
            include: { subject: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!student) {
    return null;
  }

  const activeEnrollment =
    student.enrollments.find((e) => e.status === "ACTIVE") ||
    student.enrollments[0];

  return {
    ...student,
    activeEnrollment,
  };
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const existing = await prisma.student.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Student not found.");
  }

  const dataToUpdate: Prisma.StudentUpdateInput = {};

  if (input.name !== undefined) {
    dataToUpdate.name = input.name.trim();
  }
  if (input.phone !== undefined) {
    dataToUpdate.phone = input.phone ? input.phone.trim() : null;
  }
  if (input.dateOfBirth !== undefined) {
    dataToUpdate.dateOfBirth = input.dateOfBirth
      ? new Date(input.dateOfBirth)
      : null;
  }
  if (input.status !== undefined) {
    dataToUpdate.status = input.status;
  }

  const updated = await prisma.student.update({
    where: { id },
    data: dataToUpdate,
  });

  await logAudit({
    actorId: actor?.userId,
    actorRole: actor?.role,
    action: "STUDENT_UPDATED",
    entityType: "Student",
    entityId: id,
    oldValue: {
      name: existing.name,
      phone: existing.phone,
      status: existing.status,
    },
    newValue: {
      name: updated.name,
      phone: updated.phone,
      status: updated.status,
    },
    ipAddress,
  });

  return updated;
}

export async function resetStudentPin(
  id: string,
  newPin: string,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  if (!validatePinFormat(newPin)) {
    throw new Error("Invalid PIN format. PIN must be exactly 4 numeric digits.");
  }

  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  const pinHash = await hashPin(newPin.trim());

  await prisma.student.update({
    where: { id },
    data: { pinHash },
  });

  await logAudit({
    actorId: actor?.userId,
    actorRole: actor?.role,
    action: "STUDENT_PIN_RESET",
    entityType: "Student",
    entityId: id,
    newValue: { studentCode: student.studentCode, name: student.name },
    ipAddress,
  });

  return { success: true, message: "PIN reset successfully." };
}
