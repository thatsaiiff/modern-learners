import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { getAttendanceSessionWithRoster } from "@/lib/services/attendance.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await getAttendanceSessionWithRoster(id);

    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/attendance/sessions/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch attendance session roster" },
      { status: 500 }
    );
  }
}
