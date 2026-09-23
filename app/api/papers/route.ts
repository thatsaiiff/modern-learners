import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import {
  getQuestionPapers,
  createQuestionPaper,
} from "@/lib/services/question-paper.service";
import { PaperStatus } from "@prisma/client";

const createPaperSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  classNumber: z.number().int().min(1).max(12),
  subjectCode: z.string().min(1),
  chapter: z.string().optional().nullable(),
  topic: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive().optional(),
  totalMarks: z.number().positive().optional(),
  questions: z.array(
    z.object({
      customId: z.string().optional(),
      type: z.string(),
      topic: z.string().optional(),
      difficulty: z.string().optional(),
      marks: z.number().positive(),
      question: z.object({
        text: z.string().min(1),
        image: z
          .object({
            src: z.string(),
            alt: z.string().optional(),
            width: z.number().optional(),
          })
          .optional(),
      }),
      options: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            correct: z.boolean().optional(),
          })
        )
        .optional(),
      answer: z.any().optional(),
      explanation: z.string().optional().nullable(),
    })
  ).min(1, "Must contain at least one question"),
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
    const status = (searchParams.get("status") as PaperStatus) || undefined;

    const data = await getQuestionPapers({
      page,
      limit,
      search,
      classNumber,
      subjectCode,
      status,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/papers error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch question papers" },
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
    const parsed = createPaperSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const paper = await createQuestionPaper(
      parsed.data,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Question Paper ${paper.paperCode} created successfully.`,
      paper,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/papers error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create question paper" },
      { status: 400 }
    );
  }
}
