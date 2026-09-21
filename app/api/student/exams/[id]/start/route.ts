import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/session";
import { startExamAttempt } from "@/lib/services/exam-attempt.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await getStudentSession();
    if (!student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: examId } = await params;

    const deliveryPayload = await startExamAttempt(
      examId,
      student.studentId,
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Exam attempt started successfully.",
      data: deliveryPayload,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/student/exams/:id/start error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to start exam" },
      { status: 400 }
    );
  }
}
