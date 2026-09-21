import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { generateCsvExport } from "@/lib/services/report.service";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") as "results" | "attendance") || "results";
    const classNumber = searchParams.get("classNumber")
      ? parseInt(searchParams.get("classNumber")!, 10)
      : undefined;
    const subjectCode = searchParams.get("subjectCode") || undefined;
    const studentId = searchParams.get("studentId") || undefined;

    const csvContent = await generateCsvExport(type, {
      classNumber,
      subjectCode,
      studentId,
    });

    const filename = `modern_learners_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/reports/export/csv error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to export CSV" },
      { status: 500 }
    );
  }
}
