import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import {
  getLeaderboardPrivacySettings,
  updateLeaderboardSettings,
} from "@/lib/services/leaderboard.service";

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  showName: z.boolean().optional(),
  showRollNumber: z.boolean().optional(),
  showMarks: z.boolean().optional(),
  showPassRate: z.boolean().optional(),
  showClass: z.boolean().optional(),
});

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getLeaderboardPrivacySettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/leaderboards/settings error:", err);
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
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await updateLeaderboardSettings(parsed.data);
    return NextResponse.json({
      success: true,
      message: "Leaderboard settings updated successfully.",
      settings: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("PUT /api/leaderboards/settings error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update settings" },
      { status: 400 }
    );
  }
}
