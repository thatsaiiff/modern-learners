import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { parseAndValidateExamHtml } from "@/lib/services/exam-importer.service";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const htmlContent = body.htmlContent;

    if (!htmlContent || typeof htmlContent !== "string") {
      return NextResponse.json(
        { success: false, error: "HTML content string is required" },
        { status: 400 }
      );
    }

    const preview = parseAndValidateExamHtml(htmlContent);

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/exams/import-preview error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to parse exam HTML" },
      { status: 500 }
    );
  }
}
