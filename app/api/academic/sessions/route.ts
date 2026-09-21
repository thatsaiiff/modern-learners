import { NextResponse } from "next/server";
import { getAcademicSessions } from "@/lib/services/academic.service";

export async function GET() {
  try {
    const sessions = await getAcademicSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/academic/sessions error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
