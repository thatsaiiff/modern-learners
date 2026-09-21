import prisma from "@/lib/prisma";

export async function getClasses() {
  return prisma.class.findMany({
    where: { isActive: true },
    orderBy: { classNumber: "asc" },
  });
}

export async function getSubjects() {
  return prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getAcademicSessions() {
  return prisma.academicSession.findMany({
    orderBy: { startDate: "desc" },
  });
}

export async function getActiveSession() {
  return prisma.academicSession.findFirst({
    where: { isActive: true },
  });
}
