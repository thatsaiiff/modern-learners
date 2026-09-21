import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/session";

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

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        chapter: true,
        gradingRules: {
          orderBy: { displayOrder: "asc" },
        },
        examQuestions: {
          orderBy: { orderNumber: "asc" },
        },
        _count: {
          select: {
            assignments: true,
            attempts: true,
            results: true,
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      exam,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/exams/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch exam" },
      { status: 500 }
    );
  }
}
