import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStudentSession } from "@/lib/auth/session";
import { getLeaderboard, LeaderboardType } from "@/lib/services/leaderboard.service";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    const student = await getStudentSession();

    if (!admin && !student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") as LeaderboardType) || "AVERAGE_PERCENTAGE";
    const classNumber = searchParams.get("classNumber")
      ? parseInt(searchParams.get("classNumber")!, 10)
      : undefined;
    const subjectCode = searchParams.get("subjectCode") || undefined;
    const academicSessionId = searchParams.get("academicSessionId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await getLeaderboard(
      {
        type,
        classNumber,
        subjectCode,
        academicSessionId,
        startDate,
        endDate,
      },
      {
        studentId: student?.studentId,
        isAdmin: !!admin,
      }
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/leaderboards error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
