import { NextRequest, NextResponse } from "next/server";
import { getStudentSession, getAdminSession } from "@/lib/auth/session";
import { DocumentStorageService } from "@/lib/services/document-storage.service";
import prisma from "@/lib/prisma";
import fs from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    const student = await getStudentSession();

    if (!admin && !student) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: docId } = await params;
    const doc = await prisma.submissionDocument.findUnique({
        where: { id: docId },
        include: { submission: { include: { attempt: true } } }
    });

    if (!doc) return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });

    // Authorization check
    if (!admin && doc.submission.attempt.studentId !== student?.studentId) {
       return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const filePath = DocumentStorageService.getDocumentPath(doc.storageKey);
    if (!fs.existsSync(filePath)) return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });

    const fileBuffer = await fs.promises.readFile(filePath);
    return new NextResponse(fileBuffer, {
        headers: {
            "Content-Type": doc.mimeType,
            "Content-Disposition": `inline; filename="${doc.originalFilename}"`
        }
    });

  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Failed to stream document" },
      { status: 500 }
    );
  }
}
