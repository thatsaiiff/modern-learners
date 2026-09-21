import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/session";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const examId = searchParams.get("examId") || undefined;
    const classNumber = searchParams.get("classNumber")
      ? parseInt(searchParams.get("classNumber")!, 10)
      : undefined;
    const subjectCode = searchParams.get("subjectCode") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    const passed = searchParams.get("passed")
      ? searchParams.get("passed") === "true"
      : undefined;
    const isOfficial = searchParams.get("isOfficial")
      ? searchParams.get("isOfficial") === "true"
      : undefined;
    const search = searchParams.get("search") || undefined;

    const whereCondition: Prisma.ResultWhereInput = {
      ...(examId ? { examId } : {}),
      ...(studentId ? { studentId } : {}),
      ...(passed !== undefined ? { passed } : {}),
      ...(isOfficial !== undefined ? { isOfficial } : {}),
      ...(classNumber ? { exam: { class: { classNumber } } } : {}),
      ...(subjectCode ? { exam: { subject: { code: subjectCode.toUpperCase() } } } : {}),
      ...(search
        ? {
            student: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { studentCode: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [total, results] = await Promise.all([
      prisma.result.count({ where: whereCondition }),
      prisma.result.findMany({
        where: whereCondition,
        include: {
          student: {
            include: {
              enrollments: {
                where: { status: "ACTIVE" },
                include: { class: true },
              },
            },
          },
          exam: {
            include: { class: true, subject: true },
          },
          attempt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formattedResults = results.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.name,
      studentCode: r.student.studentCode,
      rollNumber: r.student.enrollments[0]?.rollNumber || "N/A",
      className: r.exam.class.name,
      subjectName: r.exam.subject.name,
      examId: r.examId,
      examTitle: r.exam.title,
      rawMarks: r.rawMarks,
      maximumMarks: r.maximumMarks,
      percentage: r.percentage,
      grade: r.grade,
      performanceLabel: r.performanceLabel,
      passed: r.passed,
      attemptNumber: r.attempt.attemptNumber,
      isOfficial: r.isOfficial,
      submittedAt: r.attempt.submittedAt,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      success: true,
      results: formattedResults,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/results error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch results" },
      { status: 500 }
    );
  }
}
