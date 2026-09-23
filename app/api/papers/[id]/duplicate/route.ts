import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { duplicateQuestionPaper } from "@/lib/services/question-paper.service";

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

    const duplicated = await duplicateQuestionPaper(
      id,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Question Paper duplicated successfully as ${duplicated.paperCode}.`,
      paper: duplicated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/papers/:id/duplicate error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to duplicate question paper" },
      { status: 400 }
    );
  }
}
