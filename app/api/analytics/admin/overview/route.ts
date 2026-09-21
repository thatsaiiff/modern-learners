import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { getAdminAnalyticsOverview } from "@/lib/services/analytics.service";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || undefined;

    const data = await getAdminAnalyticsOverview(sessionId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/analytics/admin/overview error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
