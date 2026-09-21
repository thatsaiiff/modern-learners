import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/session";
import { submitAttempt } from "@/lib/services/exam-attempt.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await getStudentSession();
    if (!student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: attemptId } = await params;
    const body = await req.json().catch(() => ({}));
    const autoSubmitted = !!body.autoSubmitted;

    const result = await submitAttempt(
      attemptId,
      student.studentId,
      autoSubmitted,
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: autoSubmitted
        ? "Exam automatically submitted as time limit expired."
        : "Exam successfully submitted.",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/student/attempts/:id/submit error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit exam" },
      { status: 400 }
    );
  }
}
