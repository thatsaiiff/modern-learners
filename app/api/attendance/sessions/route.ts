import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import {
  createAttendanceSession,
  getAttendanceSessions,
} from "@/lib/services/attendance.service";

const createSessionSchema = z.object({
  classNumber: z.number().int().min(1).max(12),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  studentCheckInEnabled: z.boolean().default(false),
  title: z.string().optional(),
  academicSessionId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classNumber = searchParams.get("classNumber")
      ? parseInt(searchParams.get("classNumber")!, 10)
      : undefined;
    const sessionId = searchParams.get("sessionId") || undefined;
    const date = searchParams.get("date") || undefined;

    const sessions = await getAttendanceSessions({
      classNumber,
      sessionId,
      date,
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/attendance/sessions error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch attendance sessions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const session = await createAttendanceSession(
      parsed.data,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Attendance session created successfully.",
      session,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/attendance/sessions error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create attendance session" },
      { status: 400 }
    );
  }
}
