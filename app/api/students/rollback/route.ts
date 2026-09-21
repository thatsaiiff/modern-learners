import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import {
  rollbackPromotion,
  getRollbackHistory,
  getRollbackCount,
} from "@/lib/services/promotion.service";

const rollbackSchema = z.object({
  enrollmentId: z.string().min(1, "Enrollment ID is required"),
  reason: z.string().min(1, "Reason for rollback is required"),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || undefined;

    const [history, count] = await Promise.all([
      getRollbackHistory(sessionId),
      getRollbackCount(sessionId),
    ]);

    return NextResponse.json({
      success: true,
      history,
      rollbackCount: count,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/students/rollback error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch rollback history" },
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
    const parsed = rollbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await rollbackPromotion(
      parsed.data,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Successfully rolled back ${result.studentName}.`,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/students/rollback error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Rollback failed" },
      { status: 400 }
    );
  }
}
