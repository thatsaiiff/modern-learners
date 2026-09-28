import { describe, it, expect, vi } from "vitest";
import { DocumentStorageService } from "@/lib/services/document-storage.service";

describe("AI-01F — Document Storage Foundation", () => {
  it("should validate magic bytes for supported types", async () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const res = await DocumentStorageService.validateFile(pdfBuffer, "application/pdf");
    expect(res).toBe(true);
  });

  it("should prevent path traversal attacks", () => {
    const maliciousKey = "../../../etc/passwd";
    expect(() => DocumentStorageService.getDocumentPath(maliciousKey)).toThrow("potential traversal attempt");
  });

  it("should generate opaque storage keys", () => {
    const key = DocumentStorageService.generateStorageKey("stu-1", "att-1", "answer.pdf");
    expect(key).toContain("stu-1/att-1/");
    expect(key).toMatch(/\.pdf$/);
  });
});
