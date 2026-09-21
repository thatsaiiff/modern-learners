import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { resetStudentPin } from "@/lib/services/student.service";

const resetPinSchema = z.object({
  newPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = resetPinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await resetStudentPin(
      id,
      parsed.data.newPin,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/students/:id/reset-pin error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to reset PIN" },
      { status: 400 }
    );
  }
}
