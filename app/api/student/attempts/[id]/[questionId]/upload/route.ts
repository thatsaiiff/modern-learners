import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/session";
import { DocumentStorageService, MAX_FILE_SIZE } from "@/lib/services/document-storage.service";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const student = await getStudentSession();
    if (!student) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id: attemptId, questionId: examQuestionId } = await params;

    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) return NextResponse.json({ success: false, error: "Attempt not found" }, { status: 404 });
    if (attempt.studentId !== student.studentId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const submission = await prisma.subjectiveSubmission.findFirst({
      where: { attemptId, examQuestionId }
    });
    if (!submission) return NextResponse.json({ success: false, error: "Submission not found for this question" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) return NextResponse.json({ success: false, error: "Missing or empty file" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ success: false, error: "File too large" }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMime = DocumentStorageService.detectMimeType(buffer);
    if (!detectedMime) return NextResponse.json({ success: false, error: "Unsupported document format" }, { status: 415 });
    if (!DocumentStorageService.validateFile(buffer, detectedMime)) return NextResponse.json({ success: false, error: "Invalid file content" }, { status: 415 });

    const storageKey = DocumentStorageService.generateStorageKey(student.studentId, attemptId, file.name);
    let doc;
    try {
      await DocumentStorageService.saveDocument(buffer, storageKey);
      const preprocessed = await DocumentStorageService.preprocess(buffer, detectedMime, storageKey);

      doc = await prisma.submissionDocument.create({
        data: {
          submissionId: submission.id,
          originalFilename: file.name,
          storageKey,
          mimeType: detectedMime,
          fileSizeBytes: buffer.length,
          pageCount: preprocessed.pageCount,
        }
      });

      await logAudit({
        actorId: student.studentId,
        actorRole: "STUDENT",
        action: "DOCUMENT_UPLOADED",
        entityType: "SubmissionDocument",
        entityId: doc.id,
      });
    } catch (err) {
      await DocumentStorageService.removeDocument(storageKey);
      throw err;
    }

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        filename: doc.originalFilename,
        mimeType: doc.mimeType,
        fileSizeBytes: doc.fileSizeBytes,
        pageCount: doc.pageCount,
        createdAt: doc.createdAt,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
