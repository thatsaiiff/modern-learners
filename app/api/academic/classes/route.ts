import { NextResponse } from "next/server";
import { getClasses } from "@/lib/services/academic.service";

export async function GET() {
  try {
    const classes = await getClasses();
    return NextResponse.json({ success: true, classes });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/academic/classes error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch classes" },
      { status: 500 }
    );
  }
}
