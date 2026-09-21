import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/session";
import { ExamStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classNumber = searchParams.get("classNumber")
      ? parseInt(searchParams.get("classNumber")!, 10)
      : undefined;
    const subjectCode = searchParams.get("subjectCode") || undefined;
    const status = searchParams.get("status") as ExamStatus | undefined;

    const exams = await prisma.exam.findMany({
      where: {
        ...(classNumber ? { class: { classNumber } } : {}),
        ...(subjectCode ? { subject: { code: subjectCode.toUpperCase() } } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        class: true,
        subject: true,
        chapter: true,
        _count: {
          select: {
            examQuestions: true,
            assignments: true,
            attempts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      exams,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/exams error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch exams" },
      { status: 500 }
    );
  }
}
