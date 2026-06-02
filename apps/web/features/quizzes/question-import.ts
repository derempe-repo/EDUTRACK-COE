import ExcelJS from "exceljs";

import { z } from "../../lib/validators";

export const MAX_QUESTION_IMPORT_ROWS = 200;
export const MAX_QUESTION_IMPORT_FILE_SIZE = 2 * 1024 * 1024;

export const questionImportColumns = [
  { header: "pertanyaan", key: "questionText" },
  { header: "pilihan_a", key: "optionA" },
  { header: "pilihan_b", key: "optionB" },
  { header: "pilihan_c", key: "optionC" },
  { header: "pilihan_d", key: "optionD" },
  { header: "jawaban_benar", key: "correctLabel" },
  { header: "tingkat_kesulitan", key: "difficulty" },
  { header: "bobot", key: "weight" },
] as const;

const requiredHeaders = questionImportColumns.map((column) => column.header);
const optionLabels = ["A", "B", "C", "D"] as const;

export const importedQuestionSchema = z.object({
  correctLabel: z.enum(optionLabels),
  difficulty: z.enum(["easy", "medium", "hard"]),
  optionA: z.string().trim().min(1).max(1000),
  optionB: z.string().trim().min(1).max(1000),
  optionC: z.string().trim().min(1).max(1000),
  optionD: z.string().trim().min(1).max(1000),
  questionText: z.string().trim().min(5).max(3000),
  weight: z.coerce.number().int().min(1).max(100),
});

export const importedQuestionsPayloadSchema = z.array(importedQuestionSchema).min(1).max(MAX_QUESTION_IMPORT_ROWS);

export type ImportedQuestion = z.infer<typeof importedQuestionSchema>;

export type QuestionImportPreviewRow = {
  data: ImportedQuestion | null;
  errors: string[];
  rowNumber: number;
  values: {
    correctLabel: string;
    difficulty: string;
    questionText: string;
    weight: string;
  };
};

export type QuestionImportPreview = {
  fatalErrors: string[];
  invalidCount: number;
  rows: QuestionImportPreviewRow[];
  validCount: number;
};

export async function parseQuestionImportWorkbook(buffer: Buffer): Promise<QuestionImportPreview> {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(new Uint8Array(buffer).buffer);
  } catch {
    return emptyPreview("File Excel tidak dapat dibaca. Gunakan template .xlsx yang disediakan.");
  }

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return emptyPreview("File Excel belum memiliki worksheet.");
  }

  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = normalizeHeader(readCellText(cell.value));

    if (header) {
      headers.set(header, columnNumber);
    }
  });

  const missingHeaders = requiredHeaders.filter((header) => !headers.has(header));

  if (missingHeaders.length > 0) {
    return emptyPreview(`Kolom wajib belum lengkap: ${missingHeaders.join(", ")}.`);
  }

  const rows: QuestionImportPreviewRow[] = [];
  const fingerprintRows = new Map<string, QuestionImportPreviewRow[]>();

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rawValues = Object.fromEntries(
      questionImportColumns.map((column) => [
        column.key,
        readCellText(row.getCell(headers.get(column.header) ?? 0).value),
      ]),
    ) as Record<(typeof questionImportColumns)[number]["key"], string>;

    if (Object.values(rawValues).every((value) => value.trim().length === 0)) {
      continue;
    }

    const candidate = {
      ...rawValues,
      correctLabel: rawValues.correctLabel.trim().toUpperCase(),
      difficulty: rawValues.difficulty.trim().toLowerCase() || "medium",
      weight: rawValues.weight.trim() || "1",
    };
    const parsed = importedQuestionSchema.safeParse(candidate);
    const previewRow: QuestionImportPreviewRow = {
      data: parsed.success ? parsed.data : null,
      errors: parsed.success ? [] : parsed.error.issues.map(formatValidationIssue),
      rowNumber,
      values: {
        correctLabel: candidate.correctLabel,
        difficulty: candidate.difficulty,
        questionText: candidate.questionText,
        weight: candidate.weight,
      },
    };
    rows.push(previewRow);

    if (parsed.success) {
      const fingerprint = normalizeQuestionFingerprint(parsed.data.questionText);
      const matchingRows = fingerprintRows.get(fingerprint) ?? [];
      matchingRows.push(previewRow);
      fingerprintRows.set(fingerprint, matchingRows);
    }
  }

  if (rows.length === 0) {
    return emptyPreview("Belum ada soal pada file Excel.");
  }

  if (rows.length > MAX_QUESTION_IMPORT_ROWS) {
    return {
      fatalErrors: [`Maksimal ${MAX_QUESTION_IMPORT_ROWS} soal dalam satu proses import.`],
      invalidCount: rows.length,
      rows,
      validCount: 0,
    };
  }

  for (const matchingRows of fingerprintRows.values()) {
    if (matchingRows.length < 2) {
      continue;
    }

    for (const row of matchingRows) {
      row.errors.push("Pertanyaan duplikat di dalam file.");
      row.data = null;
    }
  }

  return summarizePreview(rows);
}

export function addExistingQuestionErrors(
  preview: QuestionImportPreview,
  existingQuestionTexts: string[],
) {
  const existingFingerprints = new Set(existingQuestionTexts.map(normalizeQuestionFingerprint));

  for (const row of preview.rows) {
    if (!row.data || !existingFingerprints.has(normalizeQuestionFingerprint(row.data.questionText))) {
      continue;
    }

    row.errors.push("Pertanyaan sudah ada di bank soal step ini.");
    row.data = null;
  }

  return {
    ...preview,
    ...summarizeCounts(preview.rows),
  };
}

export function findDuplicateImportedQuestions(
  importedQuestions: ImportedQuestion[],
  existingQuestionTexts: string[],
) {
  const seen = new Set(existingQuestionTexts.map(normalizeQuestionFingerprint));

  for (const question of importedQuestions) {
    const fingerprint = normalizeQuestionFingerprint(question.questionText);

    if (seen.has(fingerprint)) {
      return true;
    }

    seen.add(fingerprint);
  }

  return false;
}

export function normalizeQuestionFingerprint(questionText: string) {
  return questionText.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

function emptyPreview(message: string): QuestionImportPreview {
  return {
    fatalErrors: [message],
    invalidCount: 0,
    rows: [],
    validCount: 0,
  };
}

function formatValidationIssue(issue: z.core.$ZodIssue) {
  const field = issue.path[0];
  const labels: Record<string, string> = {
    correctLabel: "jawaban_benar",
    difficulty: "tingkat_kesulitan",
    optionA: "pilihan_a",
    optionB: "pilihan_b",
    optionC: "pilihan_c",
    optionD: "pilihan_d",
    questionText: "pertanyaan",
    weight: "bobot",
  };

  return `${labels[String(field)] ?? String(field)}: ${issue.message}`;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function readCellText(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("result" in value && value.result !== undefined) {
      return String(value.result ?? "");
    }

    if ("richText" in value) {
      return value.richText.map((item) => item.text).join("");
    }
  }

  return String(value);
}

function summarizePreview(rows: QuestionImportPreviewRow[]): QuestionImportPreview {
  return {
    fatalErrors: [],
    rows,
    ...summarizeCounts(rows),
  };
}

function summarizeCounts(rows: QuestionImportPreviewRow[]) {
  const validCount = rows.filter((row) => row.data && row.errors.length === 0).length;

  return {
    invalidCount: rows.length - validCount,
    validCount,
  };
}
