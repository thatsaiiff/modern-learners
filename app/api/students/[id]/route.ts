import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, getStudentSession } from "@/lib/auth/session";
import { getStudentById, updateStudent } from "@/lib/services/student.service";
import { StudentStatus } from "@prisma/client";

const updateStudentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  status: z.nativeEnum(StudentStatus).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getAdminSession();
    const student = await getStudentSession();

    // Authorization guard: Admin or the student themselves
    if (!admin && (!student || student.studentId !== id)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await getStudentById(id);
    if (!data) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    // Never return pinHash
    const safeStudent = { ...data, pinHash: undefined };

    return NextResponse.json({ success: true, student: safeStudent });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/students/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch student" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const parsed = updateStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await updateStudent(
      id,
      parsed.data,
      { userId: admin.userId, role: admin.role },
      req.headers.get("x-forwarded-for") || undefined
    );

    const safeUpdated = { ...updated, pinHash: undefined };

    return NextResponse.json({
      success: true,
      message: "Student updated successfully.",
      student: safeUpdated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("PUT /api/students/:id error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update student" },
      { status: 400 }
    );
  }
}
