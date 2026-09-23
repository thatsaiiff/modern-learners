import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/session";
import { getQuestionPaperById } from "@/lib/services/question-paper.service";
import { PaperStatus } from "@prisma/client";

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
    const paper = await getQuestionPaperById(id);

    if (!paper) {
      return NextResponse.json({ success: false, error: "Question Paper not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, paper });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/papers/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch question paper" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const paper = await prisma.questionPaper.update({
      where: { id },
      data: { status: PaperStatus.ARCHIVED },
    });

    return NextResponse.json({
      success: true,
      message: `Question Paper ${paper.paperCode} archived successfully.`,
      paper,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("DELETE /api/papers/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to archive question paper" },
      { status: 400 }
    );
  }
}
