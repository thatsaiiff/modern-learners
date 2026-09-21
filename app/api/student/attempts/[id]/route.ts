import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/session";
import { getAttemptDeliveryPayload } from "@/lib/services/exam-attempt.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await getStudentSession();
    if (!student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: attemptId } = await params;

    const deliveryPayload = await getAttemptDeliveryPayload(attemptId, student.studentId);

    return NextResponse.json({
      success: true,
      data: deliveryPayload,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/student/attempts/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve attempt" },
      { status: 400 }
    );
  }
}
