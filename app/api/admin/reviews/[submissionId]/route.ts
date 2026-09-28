import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { submitTeacherReview } from "@/lib/services/teacher-review.service";
import { TeacherReviewAction } from "@prisma/client";

const reviewSchema = z.object({
  action: z.nativeEnum(TeacherReviewAction),
  officialMarks: z.number().min(0),
  maxMarks: z.number().positive(),
  reason: z.string().optional(),
  feedback: z.string().optional(),
  rubricAdjustments: z.any().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { submissionId } = await params;
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const review = await submitTeacherReview(
      { submissionId, ...parsed.data },
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for")
    );

    return NextResponse.json({ success: true, review });
  } catch (err) {
    console.error("POST /api/admin/reviews/:id error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message || "Failed to submit review" },
      { status: 400 }
    );
  }
}
