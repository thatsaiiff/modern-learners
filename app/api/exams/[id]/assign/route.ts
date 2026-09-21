import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import {
  getEligibleStudentsForExam,
  assignExamToStudents,
  getExamAssignments,
} from "@/lib/services/exam-assignment.service";

const assignSchema = z.object({
  studentIds: z.array(z.string()).min(1, "At least one student must be selected"),
  allowedAttempts: z.number().int().positive().default(1),
  startAt: z.string().optional(),
  loginDeadline: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    if (mode === "roster") {
      const data = await getEligibleStudentsForExam(id);
      return NextResponse.json({ success: true, ...data });
    }

    const assignments = await getExamAssignments(id);
    return NextResponse.json({ success: true, assignments });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/exams/:id/assign error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await assignExamToStudents(
      {
        examId: id,
        ...parsed.data,
      },
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Successfully assigned exam to ${result.assignedCount} student(s).`,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/exams/:id/assign error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Exam assignment failed" },
      { status: 400 }
    );
  }
}
