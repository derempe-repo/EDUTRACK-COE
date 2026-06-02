import ExcelJS from "exceljs";

export async function buildQuestionImportTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LMS";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Bank Soal");
  worksheet.columns = [
    { header: "pertanyaan", key: "questionText", width: 52 },
    { header: "pilihan_a", key: "optionA", width: 28 },
    { header: "pilihan_b", key: "optionB", width: 28 },
    { header: "pilihan_c", key: "optionC", width: 28 },
    { header: "pilihan_d", key: "optionD", width: 28 },
    { header: "jawaban_benar", key: "correctLabel", width: 18 },
    { header: "tingkat_kesulitan", key: "difficulty", width: 22 },
    { header: "bobot", key: "weight", width: 12 },
  ];
  worksheet.addRow({
    correctLabel: "A",
    difficulty: "medium",
    optionA: "HyperText Markup Language",
    optionB: "HighText Machine Language",
    optionC: "Hyperlink and Text Markup Language",
    optionD: "Home Tool Markup Language",
    questionText: "Apa kepanjangan dari HTML?",
    weight: 1,
  });

  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    fgColor: { argb: "FF0F766E" },
    pattern: "solid",
    type: "pattern",
  };
  header.alignment = { horizontal: "center", vertical: "middle" };
  header.height = 24;
  worksheet.getRow(2).fill = {
    fgColor: { argb: "FFF0FDFA" },
    pattern: "solid",
    type: "pattern",
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: "A1",
    to: "H1",
  };

  for (let row = 2; row <= 202; row += 1) {
    worksheet.getCell(`F${row}`).dataValidation = {
      allowBlank: false,
      formulae: ['"A,B,C,D"'],
      type: "list",
    };
    worksheet.getCell(`G${row}`).dataValidation = {
      allowBlank: true,
      formulae: ['"easy,medium,hard"'],
      type: "list",
    };
    worksheet.getCell(`H${row}`).dataValidation = {
      allowBlank: true,
      formulae: [1],
      operator: "greaterThanOrEqual",
      type: "whole",
    };
  }

  const instructions = workbook.addWorksheet("Petunjuk");
  instructions.columns = [
    { key: "label", width: 28 },
    { key: "description", width: 100 },
  ];
  instructions.addRows([
    ["Cara penggunaan", "Isi worksheet Bank Soal. Baris contoh boleh dihapus sebelum mengunggah file."],
    ["Batas import", "Maksimal 200 soal dalam satu file .xlsx dengan ukuran maksimal 2 MB."],
    ["jawaban_benar", "Wajib diisi salah satu huruf: A, B, C, atau D."],
    ["tingkat_kesulitan", "Isi easy, medium, atau hard. Jika dikosongkan, sistem memakai medium."],
    ["bobot", "Isi angka bulat 1 sampai 100. Jika dikosongkan, sistem memakai 1."],
    ["Catatan", "Jangan mengubah nama kolom pada baris pertama."],
  ]);
  instructions.getColumn("label").font = { bold: true, color: { argb: "FF134E4A" } };
  instructions.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
