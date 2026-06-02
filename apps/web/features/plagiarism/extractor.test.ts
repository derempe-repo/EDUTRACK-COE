import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { extractSubmissionContent } from "./extractor";

function textFile(name: string, content: string) {
  return {
    arrayBuffer: async () => new TextEncoder().encode(content).buffer,
    name,
    text: async () => content,
  } as File;
}

describe("submission text extraction", () => {
  it("reads supported plain text submissions", async () => {
    await expect(extractSubmissionContent(textFile("report.md", "Isi laporan"), null)).resolves.toEqual({
      error: null,
      status: "extracted",
      text: "Isi laporan",
    });
  });

  it("reads source code files from ZIP and ignores dependencies", async () => {
    const zip = new JSZip();
    zip.file("src/app.ts", "export const answer = 42;");
    zip.file("node_modules/library/index.js", "ignored dependency");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const file = {
      arrayBuffer: async () => bytes.buffer,
      name: "project.zip",
      text: async () => "",
    } as File;

    const result = await extractSubmissionContent(file, null);

    expect(result.status).toBe("extracted");
    expect(result.text).toContain("src/app.ts");
    expect(result.text).toContain("answer = 42");
    expect(result.text).not.toContain("ignored dependency");
  });

  it("uses the submission note when a binary format cannot be extracted", async () => {
    await expect(extractSubmissionContent(textFile("project.rar", "binary"), "Ringkasan laporan")).resolves.toEqual({
      error: "Tidak ada teks yang dapat diekstrak dari project.rar.",
      status: "fallback",
      text: "Ringkasan laporan",
    });
  });
});
