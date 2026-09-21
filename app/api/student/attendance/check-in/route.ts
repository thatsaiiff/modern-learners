import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/session";
import { studentSelfCheckIn } from "@/lib/services/attendance.service";

export async function POST(req: NextRequest) {
  try {
    const student = await getStudentSession();
    if (!student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await studentSelfCheckIn(
      student.studentId,
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/student/attendance/check-in error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to check in" },
      { status: 400 }
    );
  }
}
