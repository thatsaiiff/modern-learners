import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { reviewRetakeRequest } from "@/lib/services/retake.service";

const reviewSchema = z.object({
  approved: z.boolean(),
  reviewComment: z.string().optional(),
  additionalAttempts: z.number().int().positive().default(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await reviewRetakeRequest(
      requestId,
      parsed.data,
      admin.userId,
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: parsed.data.approved
        ? "Retake approved. Student has been granted an additional attempt."
        : "Retake request rejected.",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/admin/retakes/:id/review error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to review retake request" },
      { status: 400 }
    );
  }
}
