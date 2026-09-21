import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { getRetakeRequests } from "@/lib/services/retake.service";
import { RetakeStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") as RetakeStatus) || undefined;
    const examId = searchParams.get("examId") || undefined;
    const classNumber = searchParams.get("classNumber")
      ? parseInt(searchParams.get("classNumber")!, 10)
      : undefined;

    const requests = await getRetakeRequests({
      status,
      examId,
      classNumber,
    });

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/admin/retakes error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch retake requests" },
      { status: 500 }
    );
  }
}
