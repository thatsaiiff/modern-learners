import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateStudent } from "@/lib/auth/service";
import { createStudentToken } from "@/lib/auth/jwt";
import { setStudentSessionCookie } from "@/lib/auth/session";

const studentLoginSchema = z.object({
  rollNumber: z.string().min(1, "Roll number is required"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = studentLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { rollNumber, pin } = parsed.data;
    const authResult = await authenticateStudent(rollNumber, pin);

    if (!authResult.success || !authResult.data) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Authentication failed" },
        { status: 401 }
      );
    }

    const token = await createStudentToken(authResult.data);
    await setStudentSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Student login successful",
      student: authResult.data,
    });
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
