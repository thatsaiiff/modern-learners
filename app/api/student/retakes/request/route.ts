import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStudentSession } from "@/lib/auth/session";
import { requestRetake } from "@/lib/services/retake.service";

const retakeReqSchema = z.object({
  examId: z.string().min(1, "Exam ID is required"),
  reason: z.string().min(1, "Reason for retake is required"),
});

export async function POST(req: NextRequest) {
  try {
    const student = await getStudentSession();
    if (!student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = retakeReqSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const retake = await requestRetake(
      parsed.data,
      student.studentId,
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Retake request submitted to teacher for approval.",
      data: retake,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/student/retakes/request error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit retake request" },
      { status: 400 }
    );
  }
}
