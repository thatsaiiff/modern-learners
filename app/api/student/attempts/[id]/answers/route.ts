import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStudentSession } from "@/lib/auth/session";
import { saveAttemptAnswer } from "@/lib/services/exam-attempt.service";

const saveAnswerSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  selectedOptions: z.array(z.string()).optional(),
  answerText: z.string().optional(),
  numericAnswer: z.number().optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await getStudentSession();
    if (!student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: attemptId } = await params;
    const body = await req.json();
    const parsed = saveAnswerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await saveAttemptAnswer(
      {
        attemptId,
        questionId: parsed.data.questionId,
        selectedOptions: parsed.data.selectedOptions,
        answerText: parsed.data.answerText,
        numericAnswer: parsed.data.numericAnswer ?? undefined,
      },
      student.studentId
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("PUT /api/student/attempts/:id/answers error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save answer" },
      { status: 400 }
    );
  }
}
