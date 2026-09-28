import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, getStudentSession } from "@/lib/auth/session";
import {
  getResultDetails,
  correctResultMarks,
  voidResult,
  restoreResult,
} from "@/lib/services/grading.service";

const resultActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CORRECT"),
    rawMarks: z.number().min(0, "Marks must be non-negative"),
    reason: z.string().min(3, "A justification reason of at least 3 characters is required"),
  }),
  z.object({
    action: z.literal("VOID"),
    reason: z.string().min(3, "A justification reason of at least 3 characters is required"),
  }),
  z.object({
    action: z.literal("RESTORE"),
    reason: z.string().min(3, "A justification reason of at least 3 characters is required"),
  }),
]);

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = resultActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    let result;

    if (parsed.data.action === "CORRECT") {
      result = await correctResultMarks(
        {
          resultId: id,
          rawMarks: parsed.data.rawMarks,
          reason: parsed.data.reason,
        },
        { userId: admin.userId, role: admin.role },
        ipAddress
      );
    } else if (parsed.data.action === "VOID") {
      result = await voidResult(
        {
          resultId: id,
          reason: parsed.data.reason,
        },
        { userId: admin.userId, role: admin.role },
        ipAddress
      );
    } else {
      result = await restoreResult(
        {
          resultId: id,
          reason: parsed.data.reason,
        },
        { userId: admin.userId, role: admin.role },
        ipAddress
      );
    }

    return NextResponse.json({
      success: true,
      message:
        parsed.data.action === "CORRECT"
          ? "Exam marks corrected successfully."
          : parsed.data.action === "VOID"
          ? "Exam result voided successfully."
          : "Exam result restored successfully.",
      result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("PATCH /api/results/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update result" },
      { status: 400 }
    );
  }
}
