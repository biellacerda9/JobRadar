import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export class UnsupportedFileTypeError extends Error {
  constructor(mimetype: string) {
    super(`Unsupported file type: ${mimetype}`);
    this.name = "UnsupportedFileTypeError";
  }
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

export async function extractRawText(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  switch (mimetype) {
    case "application/pdf":
      return extractFromPdf(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractFromDocx(buffer);
    default:
      throw new UnsupportedFileTypeError(mimetype);
  }
}
