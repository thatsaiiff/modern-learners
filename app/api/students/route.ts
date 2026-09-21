import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { createStudent, getStudents } from "@/lib/services/student.service";
import { StudentStatus } from "@prisma/client";

const createStudentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  classNumber: z.number().int().min(1).max(12),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  academicSessionId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const classNumber = searchParams.get("classNumber")
      ? parseInt(searchParams.get("classNumber")!, 10)
      : undefined;
    const academicSessionId = searchParams.get("academicSessionId") || undefined;
    const status = (searchParams.get("status") as StudentStatus) || undefined;

    const data = await getStudents({
      page,
      limit,
      search,
      classNumber,
      academicSessionId,
      status,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/students error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch students" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await createStudent(
      parsed.data,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Student created and enrolled successfully.",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/students error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create student" },
      { status: 400 }
    );
  }
}
