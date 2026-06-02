import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  addExistingQuestionErrors,
  findDuplicateImportedQuestions,
  parseQuestionImportWorkbook,
  questionImportColumns,
} from "./question-import";
import { buildQuestionImportTemplate } from "./question-import-template";

async function buildWorkbook(
  rows: Array<Record<string, string | number>>,
  headers: ReadonlyArray<(typeof questionImportColumns)[number]> = questionImportColumns,
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bank Soal");
  worksheet.addRow(headers.map((header) => header.header));

  for (const row of rows) {
    worksheet.addRow(headers.map((header) => row[header.key] ?? ""));
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("question import parser", () => {
  it("keeps the downloadable template compatible with the preview parser", async () => {
    const preview = await parseQuestionImportWorkbook(await buildQuestionImportTemplate());

    expect(preview).toMatchObject({
      fatalErrors: [],
      invalidCount: 0,
      validCount: 1,
    });
    expect(preview.rows[0]?.data?.questionText).toBe("Apa kepanjangan dari HTML?");
  });

  it("parses valid rows and applies optional defaults", async () => {
    const preview = await parseQuestionImportWorkbook(
      await buildWorkbook([
        {
          correctLabel: "b",
          difficulty: "",
          optionA: "A",
          optionB: "B",
          optionC: "C",
          optionD: "D",
          questionText: "Pertanyaan pertama?",
          weight: "",
        },
      ]),
    );

    expect(preview).toMatchObject({
      fatalErrors: [],
      invalidCount: 0,
      validCount: 1,
    });
    expect(preview.rows[0]?.data).toMatchObject({
      correctLabel: "B",
      difficulty: "medium",
      weight: 1,
    });
  });

  it("reports missing required headers", async () => {
    const preview = await parseQuestionImportWorkbook(
      await buildWorkbook([], questionImportColumns.filter((column) => column.header !== "bobot")),
    );

    expect(preview.validCount).toBe(0);
    expect(preview.fatalErrors[0]).toContain("bobot");
  });

  it("marks duplicate questions inside one workbook", async () => {
    const question = {
      correctLabel: "A",
      difficulty: "easy",
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      questionText: "Apa fungsi tag HTML?",
      weight: 1,
    };
    const preview = await parseQuestionImportWorkbook(await buildWorkbook([question, question]));

    expect(preview.invalidCount).toBe(2);
    expect(preview.rows[0]?.errors).toContain("Pertanyaan duplikat di dalam file.");
  });

  it("marks questions that already exist in the selected step", async () => {
    const preview = await parseQuestionImportWorkbook(
      await buildWorkbook([
        {
          correctLabel: "A",
          difficulty: "hard",
          optionA: "A",
          optionB: "B",
          optionC: "C",
          optionD: "D",
          questionText: "Apa fungsi semantic HTML?",
          weight: 2,
        },
      ]),
    );
    const nextPreview = addExistingQuestionErrors(preview, ["  Apa fungsi  semantic HTML? "]);

    expect(nextPreview.invalidCount).toBe(1);
    expect(nextPreview.rows[0]?.errors).toContain("Pertanyaan sudah ada di bank soal step ini.");
  });

  it("reports invalid rows instead of accepting a partial import", async () => {
    const preview = await parseQuestionImportWorkbook(
      await buildWorkbook([
        {
          correctLabel: "E",
          difficulty: "medium",
          optionA: "A",
          optionB: "B",
          optionC: "C",
          optionD: "D",
          questionText: "Jawaban benar tidak valid?",
          weight: 1,
        },
      ]),
    );

    expect(preview.validCount).toBe(0);
    expect(preview.invalidCount).toBe(1);
    expect(preview.rows[0]?.data).toBeNull();
  });

  it("rejects duplicate payloads during the final server validation", () => {
    expect(
      findDuplicateImportedQuestions(
        [
          {
            correctLabel: "A",
            difficulty: "medium",
            optionA: "A",
            optionB: "B",
            optionC: "C",
            optionD: "D",
            questionText: "Apa fungsi CSS?",
            weight: 1,
          },
        ],
        ["  Apa fungsi CSS?  "],
      ),
    ).toBe(true);
  });
});
