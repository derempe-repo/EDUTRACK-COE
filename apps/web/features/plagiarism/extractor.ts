import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import JSZip from "jszip";

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

function findAncestorDirectories(start: string) {
  const directories: string[] = [];
  let current = path.resolve(start);

  while (true) {
    directories.push(current);
    const parent = path.dirname(current);

    if (parent === current) {
      return directories;
    }

    current = parent;
  }
}

function resolvePdfWorkerPath() {
  for (const directory of findAncestorDirectories(process.cwd())) {
    const directWorkerPath = path.join(
      directory,
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs",
    );

    if (fs.existsSync(directWorkerPath)) {
      return directWorkerPath;
    }

    const pnpmRoot = path.join(directory, "node_modules", ".pnpm");
    if (!fs.existsSync(pnpmRoot)) {
      continue;
    }

    const pdfjsPackage = fs
      .readdirSync(pnpmRoot, { withFileTypes: true })
      .find((entry) => entry.isDirectory() && entry.name.startsWith("pdfjs-dist@"));

    if (!pdfjsPackage) {
      continue;
    }

    const pnpmWorkerPath = path.join(
      pnpmRoot,
      pdfjsPackage.name,
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs",
    );

    if (fs.existsSync(pnpmWorkerPath)) {
      return pnpmWorkerPath;
    }
  }

  return null;
}

function configurePdfWorker(pdfParser: { setWorker(workerUrl: string): void }) {
  const workerPath = resolvePdfWorkerPath();

  if (!workerPath) {
    throw new Error("PDF worker tidak ditemukan di node_modules aplikasi.");
  }

  pdfParser.setWorker(pathToFileURL(workerPath).toString());
}

async function extractPdfFromBytes(bytes: Uint8Array) {
  const { PDFParse } = await import("pdf-parse");

  configurePdfWorker(PDFParse);
  const parser = new PDFParse({
    data: bytes,
    disableFontFace: true,
    useWorkerFetch: false,
  });

  try {
    return trimExtractedText((await parser.getText()).text);
  } finally {
    await parser.destroy();
  }
}

async function extractZipFromBytes(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
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
  const bytes =
    extension === ".pdf" || extension === ".zip"
      ? new Uint8Array(await file.arrayBuffer())
      : null;

  try {
    const text =
      extension === ".pdf"
        ? await extractPdfFromBytes(bytes ?? new Uint8Array())
        : extension === ".zip"
          ? await extractZipFromBytes(bytes ?? new Uint8Array())
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
