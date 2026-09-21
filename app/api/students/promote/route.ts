import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { promoteClass } from "@/lib/services/promotion.service";

const promoteSchema = z.object({
  fromClassNumber: z.number().int().min(1).max(12),
  fromSessionId: z.string().min(1, "Source session is required"),
  toSessionId: z.string().min(1, "Target session is required"),
  studentIds: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = promoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await promoteClass(
      parsed.data,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Successfully processed promotion for ${result.promotedCount} students.`,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/students/promote error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Promotion failed" },
      { status: 400 }
    );
  }
}
