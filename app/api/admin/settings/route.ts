import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { getAllSystemSettings, updateSystemConfig } from "@/lib/services/settings.service";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getAllSystemSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = await updateSystemConfig(
      body,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: "System configuration saved successfully.",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("PUT /api/admin/settings error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update system settings" },
      { status: 400 }
    );
  }
}
