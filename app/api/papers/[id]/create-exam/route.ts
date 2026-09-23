import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { createExamFromPaper } from "@/lib/services/question-paper.service";
import { MultiAttemptRule } from "@prisma/client";

const createExamSchema = z.object({
  title: z.string().optional(),
  classNumber: z.number().int().min(1).max(12).optional(),
  durationMinutes: z.number().int().positive().optional(),
  passingPercentage: z.number().min(0).max(100).optional(),
  negativeMarkingEnabled: z.boolean().optional(),
  negativeMarkValue: z.number().min(0).optional(),
  randomizeQuestions: z.boolean().optional(),
  randomizeOptions: z.boolean().optional(),
  allowedAttempts: z.number().int().positive().default(1),
  startAt: z.string().optional(),
  loginDeadline: z.string().optional(),
  multiAttemptRule: z.nativeEnum(MultiAttemptRule).optional(),
  studentEligibility: z
    .array(
      z.object({
        studentId: z.string(),
        isEligible: z.boolean(),
        ineligibilityReason: z.string().optional().nullable(),
      })
    )
    .optional(),
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

    const { id: questionPaperId } = await params;
    const body = await req.json();
    const parsed = createExamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const exam = await createExamFromPaper(
      {
        questionPaperId,
        ...parsed.data,
      },
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Exam "${exam.title}" created successfully from Question Paper.`,
      exam,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/papers/:id/create-exam error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create exam from paper" },
      { status: 400 }
    );
  }
}
