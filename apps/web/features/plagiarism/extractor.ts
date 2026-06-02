import JSZip from "jszip";
import { PDFParse } from "pdf-parse";

const MAX_EXTRACTED_TEXT_LENGTH = 200_000;
const MAX_ZIP_TEXT_FILES = 100;

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".ts",
  ".tsx",
  ".txt",
]);

const ignoredZipSegments = new Set([
  ".git",
  ".next",
  "build",
  "dist",
  "node_modules",
  "vendor",
]);

type SubmissionFile = Pick<File, "arrayBuffer" | "name" | "text">;

export type SubmissionExtraction = {
  error: string | null;
  status: "extracted" | "fallback" | "failed";
  text: string;
};

function extensionOf(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function trimExtractedText(value: string) {
  return value.slice(0, MAX_EXTRACTED_TEXT_LENGTH).trim();
}

function fallbackToNote(note: string | null, error: string): SubmissionExtraction {
  const fallbackText = trimExtractedText(note ?? "");

  return {
    error,
    status: fallbackText ? "fallback" : "failed",
    text: fallbackText,
  };
}

async function extractPdf(file: SubmissionFile) {
  const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });

  try {
    return trimExtractedText((await parser.getText()).text);
  } finally {
    await parser.destroy();
  }
}

async function extractZip(file: SubmissionFile) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const candidates = Object.values(zip.files)
    .filter((entry) => {
      const segments = entry.name.toLowerCase().split("/");
      return (
        !entry.dir &&
        !segments.some((segment) => ignoredZipSegments.has(segment)) &&
        textExtensions.has(extensionOf(entry.name))
      );
    })
    .slice(0, MAX_ZIP_TEXT_FILES);

  const parts: string[] = [];
  let currentLength = 0;

  for (const entry of candidates) {
    if (currentLength >= MAX_EXTRACTED_TEXT_LENGTH) {
      break;
    }

    const content = await entry.async("string");
    const part = `\n\n# file: ${entry.name}\n${content}`;
    parts.push(part);
    currentLength += part.length;
  }

  return trimExtractedText(parts.join(""));
}

export async function extractSubmissionContent(
  file: SubmissionFile,
  note: string | null,
): Promise<SubmissionExtraction> {
  const extension = extensionOf(file.name);

  try {
    const text =
      extension === ".pdf"
        ? await extractPdf(file)
        : extension === ".zip"
          ? await extractZip(file)
          : textExtensions.has(extension)
            ? trimExtractedText(await file.text())
            : "";

    if (text) {
      return { error: null, status: "extracted", text };
    }

    return fallbackToNote(note, `Tidak ada teks yang dapat diekstrak dari ${file.name}.`);
  } catch (error) {
    return fallbackToNote(
      note,
      error instanceof Error ? error.message : "Ekstraksi file submission gagal.",
    );
  }
}
