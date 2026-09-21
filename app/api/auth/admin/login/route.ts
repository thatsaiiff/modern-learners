import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAdmin } from "@/lib/auth/service";
import { createAdminToken } from "@/lib/auth/jwt";
import { setAdminSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or Email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;
    const authResult = await authenticateAdmin(identifier, password);

    if (!authResult.success || !authResult.data) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Authentication failed" },
        { status: 401 }
      );
    }

    const token = await createAdminToken(authResult.data);
    await setAdminSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Admin login successful",
      user: authResult.data,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
