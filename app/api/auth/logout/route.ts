import { NextResponse } from "next/server";
import { clearAllSessionCookies } from "@/lib/auth/session";

export async function POST() {
  try {
    await clearAllSessionCookies();
    return NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during logout." },
      { status: 500 }
    );
  }
}
