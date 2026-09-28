import fs from "fs";
import path from "path";
import crypto from "crypto";

const DOCUMENT_STORAGE_DIR = path.join(process.cwd(), ".storage/handwritten");
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

const MAGIC_BYTES: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
};

if (!fs.existsSync(DOCUMENT_STORAGE_DIR)) fs.mkdirSync(DOCUMENT_STORAGE_DIR, { recursive: true });

export class DocumentStorageService {
  static detectMimeType(buffer: Buffer): string | null {
    for (const [mime, signature] of Object.entries(MAGIC_BYTES)) {
      if (signature.every((byte, index) => buffer[index] === byte)) return mime;
    }
    return null;
  }

  static validateFile(buffer: Buffer, claimedMimeType: string): boolean {
    if (!buffer.length || buffer.length > MAX_FILE_SIZE) return false;
    const detected = this.detectMimeType(buffer);
    return detected === claimedMimeType;
  }

  static countPdfPages(buffer: Buffer): number {
    const text = buffer.toString("latin1");
    const pages = (text.match(/\/Type\s*\/Page\b/g) || []).length;
    return pages > 0 ? pages : 1;
  }

  static generateStorageKey(studentId: string, attemptId: string, originalFilename: string): string {
    const ext = path.extname(originalFilename).toLowerCase();
    return path.join(studentId, attemptId, `${crypto.randomUUID()}${ext}`);
  }

  static async saveDocument(buffer: Buffer, storageKey: string): Promise<string> {
    const fullPath = this.getDocumentPath(storageKey);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, buffer, { flag: "wx" });
    return storageKey;
  }
  
  static async preprocess(buffer: Buffer, mimeType: string, documentKey: string): Promise<{ pageCount: number; pages: string[]; thumbnail: string }> {
    const pageCount = mimeType === "application/pdf" ? this.countPdfPages(buffer) : 1;
    const pages: string[] = [];
    for (let index = 0; index < pageCount; index++) {
        pages.push(documentKey); // Stubs for page assets
    }
    return { pageCount, pages, thumbnail: documentKey };
  }

  static async removeDocument(storageKey: string): Promise<void> {
    const fullPath = this.getDocumentPath(storageKey);
    if (fs.existsSync(fullPath)) await fs.promises.unlink(fullPath);
  }

  static getDocumentPath(storageKey: string): string {
    const root = path.resolve(DOCUMENT_STORAGE_DIR);
    const safePath = path.resolve(root, storageKey);
    if (!safePath.startsWith(root)) throw new Error("Invalid storage path - potential traversal attempt.");
    return safePath;
  }
}
