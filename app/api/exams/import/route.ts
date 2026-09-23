import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { confirmAndPersistQuestionPaper } from "@/lib/services/exam-importer.service";

const confirmImportSchema = z.object({
  htmlContent: z.string().min(1, "HTML content is required"),
  classNumberOverride: z.number().int().optional(),
  subjectCodeOverride: z.string().optional(),
  chapterIdOverride: z.string().optional(),
  durationMinutesOverride: z.number().int().positive().optional(),
  passingPercentageOverride: z.number().min(0).max(100).optional(),
  addToQuestionBank: z.boolean().default(true),
  startAt: z.string().optional(),
  loginDeadline: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = confirmImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await confirmAndPersistQuestionPaper(
      parsed.data,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Question Paper "${result.questionPaper.title}" (${result.paperCode}) imported successfully with ${result.questionsCount} questions.`,
      paperId: result.paperId,
      paperCode: result.paperCode,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/exams/import error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Exam import failed" },
      { status: 400 }
    );
  }
}
