import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { createQuestion, getQuestions } from "@/lib/services/question.service";
import { QuestionType, QuestionDifficulty } from "@prisma/client";

const createQuestionSchema = z.object({
  customId: z.string().optional(),
  classNumber: z.number().int().min(1).max(12),
  subjectCode: z.string().min(1),
  chapterId: z.string().optional(),
  topicId: z.string().optional(),
  questionType: z.nativeEnum(QuestionType),
  difficulty: z.nativeEnum(QuestionDifficulty).default(QuestionDifficulty.MEDIUM),
  questionText: z.string().min(1, "Question text is required"),
  explanation: z.string().optional().nullable(),
  defaultMarks: z.number().positive().default(1.0),
  imageSrc: z.string().optional().nullable(),
  imageAlt: z.string().optional().nullable(),
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

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const classNumber = searchParams.get("classNumber")
      ? parseInt(searchParams.get("classNumber")!, 10)
      : undefined;
    const subjectCode = searchParams.get("subjectCode") || undefined;
    const chapterId = searchParams.get("chapterId") || undefined;
    const topicId = searchParams.get("topicId") || undefined;
    const questionType = (searchParams.get("questionType") as QuestionType) || undefined;
    const difficulty = (searchParams.get("difficulty") as QuestionDifficulty) || undefined;

    const data = await getQuestions({
      page,
      limit,
      search,
      classNumber,
      subjectCode,
      chapterId,
      topicId,
      questionType,
      difficulty,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/questions error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch questions" },
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
    const parsed = createQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const question = await createQuestion(
      parsed.data,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Question created successfully.",
      question,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/questions error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create question" },
      { status: 400 }
    );
  }
}
