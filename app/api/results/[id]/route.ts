import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStudentSession } from "@/lib/auth/session";
import { getResultDetails } from "@/lib/services/grading.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    const student = await getStudentSession();

    if (!admin && !student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const data = await getResultDetails(id, {
      studentId: student?.studentId,
      isAdmin: !!admin,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/results/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch result details" },
      { status: 400 }
    );
  }
}
