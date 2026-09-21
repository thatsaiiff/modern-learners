import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { getQuestionById, updateQuestion } from "@/lib/services/question.service";
import { QuestionDifficulty } from "@prisma/client";

const updateQuestionSchema = z.object({
  questionText: z.string().min(1).optional(),
  explanation: z.string().optional().nullable(),
  difficulty: z.nativeEnum(QuestionDifficulty).optional(),
  defaultMarks: z.number().positive().optional(),
  imageSrc: z.string().optional().nullable(),
  imageAlt: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  options: z
    .array(
      z.object({
        optionKey: z.string().min(1),
        optionText: z.string().min(1),
        isCorrect: z.boolean(),
      })
    )
    .optional(),
});

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
    const question = await getQuestionById(id);

    if (!question) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, question });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/questions/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch question" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const parsed = updateQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await updateQuestion(
      id,
      parsed.data,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Question updated successfully.",
      question: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("PUT /api/questions/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update question" },
      { status: 400 }
    );
  }
}
