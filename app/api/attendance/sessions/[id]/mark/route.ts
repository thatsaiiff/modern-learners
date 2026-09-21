import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { markRosterAttendance } from "@/lib/services/attendance.service";
import { AttendanceStatus } from "@prisma/client";

const markSchema = z.object({
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.nativeEnum(AttendanceStatus),
      remarks: z.string().optional(),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await req.json();
    const parsed = markSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await markRosterAttendance(
      sessionId,
      parsed.data.records,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Successfully marked attendance for ${result.markedCount} students.`,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/attendance/sessions/:id/mark error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to mark attendance" },
      { status: 400 }
    );
  }
}
