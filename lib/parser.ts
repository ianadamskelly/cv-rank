import type { ParsedCv } from "@/lib/types";

const maxFileSize = 8 * 1024 * 1024;

export async function parseCvFile(file: File): Promise<ParsedCv> {
  if (file.size > maxFileSize) {
    throw new Error("Upload a CV that is 8MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "pdf" || file.type === "application/pdf") {
    return parsePdf(buffer);
  }

  if (extension === "docx" || file.type.includes("wordprocessingml")) {
    return parseDocx(buffer);
  }

  throw new Error("For V1, upload a PDF or DOCX CV. DOC support can be added with server-side conversion.");
}

async function parsePdf(buffer: Buffer): Promise<ParsedCv> {
  const pdfParse = (await import("pdf-parse")).default;
  const parsed = await pdfParse(buffer);
  return buildParsedCv(parsed.text ?? "", "PDF");
}

async function parseDocx(buffer: Buffer): Promise<ParsedCv> {
  const mammoth = await import("mammoth");
  const parsed = await mammoth.extractRawText({ buffer });
  return buildParsedCv(parsed.value ?? "", "DOCX");
}

function buildParsedCv(rawText: string, source: string): ParsedCv {
  const text = rawText
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  const warnings: string[] = [];

  if (wordCount < 120) {
    warnings.push(
      `We could only read ${wordCount} words from this ${source}. This may mean the CV is scanned, image-heavy, or uses a layout that applicant tracking systems can struggle to read.`
    );
  }

  if (!/[a-z]{20,}/i.test(text) && wordCount < 220) {
    warnings.push("The extracted text looks sparse. Use a text-based PDF or DOCX with simple headings and standard sections.");
  }

  const parseConfidence: ParsedCv["parseConfidence"] =
    wordCount >= 250 ? "high" : wordCount >= 120 ? "medium" : "low";

  return {
    text,
    wordCount,
    parseConfidence,
    warnings
  };
}
