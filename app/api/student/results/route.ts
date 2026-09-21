import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const student = await getStudentSession();
    if (!student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const results = await prisma.result.findMany({
      where: { studentId: student.studentId },
      include: {
        exam: {
          include: { subject: true, class: true, chapter: true },
        },
        attempt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = results.map((r) => ({
      id: r.id,
      examId: r.examId,
      examTitle: r.exam.title,
      subjectName: r.exam.subject.name,
      className: r.exam.class.name,
      chapterName: r.exam.chapter?.name || null,
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
      results: formatted,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/student/results error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch student results" },
      { status: 500 }
    );
  }
}
