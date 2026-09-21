import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { saveTeacherRemark } from "@/lib/services/report.service";

const remarkSchema = z.object({
  sessionId: z.string().min(1, "Academic Session is required"),
  remark: z.string().min(1, "Remark cannot be empty").max(1000),
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

    const { id: studentId } = await params;
    const body = await req.json();
    const parsed = remarkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await saveTeacherRemark(
      studentId,
      parsed.data.sessionId,
      parsed.data.remark,
      admin.userId,
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Teacher remarks updated successfully.",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/reports/student/:id/remark error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save remarks" },
      { status: 400 }
    );
  }
}
