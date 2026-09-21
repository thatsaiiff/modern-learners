import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStudentSession } from "@/lib/auth/session";
import { getStudentReportCardData } from "@/lib/services/report.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    const student = await getStudentSession();

    if (!admin && !student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || undefined;

    const reportCard = await getStudentReportCardData(id, sessionId, {
      studentId: student?.studentId,
      isAdmin: !!admin,
    });

    return NextResponse.json({
      success: true,
      reportCard,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/reports/student/:id/card error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate report card" },
      { status: 400 }
    );
  }
}
