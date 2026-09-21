import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { getChapters } from "@/lib/services/question.service";

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

    const chapters = await getChapters(classNumber, subjectCode);

    return NextResponse.json({ success: true, chapters });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/academic/chapters error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}
