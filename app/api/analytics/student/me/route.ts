import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/session";
import { getStudentAnalytics } from "@/lib/services/analytics.service";

export async function GET() {
  try {
    const student = await getStudentSession();
    if (!student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await getStudentAnalytics(student.studentId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/analytics/student/me error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch student analytics" },
      { status: 500 }
    );
  }
}
