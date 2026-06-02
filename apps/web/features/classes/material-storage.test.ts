import { describe, expect, it } from "vitest";

import {
  buildMaterialDownloadFileName,
  buildMaterialStoragePath,
  MATERIAL_FILE_SIZE_LIMIT,
  sanitizeStorageFileName,
  validateMaterialFile,
} from "./material-storage";

describe("material storage helpers", () => {
  it("sanitizes uploaded file names for storage paths", () => {
    expect(sanitizeStorageFileName("Materi HTML Dasar (Final).PDF")).toBe(
      "materi-html-dasar-final-.pdf",
    );
  });

  it("builds paths scoped by class and module", () => {
    expect(
      buildMaterialStoragePath({
        classId: "class-id",
        moduleId: "module-id",
        fileName: "Slide 1.pptx",
        token: "upload-token",
      }),
    ).toBe("class-id/module-id/upload-token-slide-1.pptx");
  });

  it("builds download names with the original storage extension", () => {
    expect(
      buildMaterialDownloadFileName({
        storagePath: "class-id/module-id/upload-token-slide-1.pptx",
        title: "Materi HTML Dasar",
      }),
    ).toBe("materi-html-dasar.pptx");
  });

  it("replaces an unclear title extension with the storage extension", () => {
    expect(
      buildMaterialDownloadFileName({
        storagePath: "class-id/module-id/upload-token-bab-1.pdf",
        title: "Bab 1 Final",
      }),
    ).toBe("bab-1-final.pdf");
  });

  it("accepts PDF files for PDF material", () => {
    const file = new File(["demo"], "demo.pdf", { type: "application/pdf" });

    expect(validateMaterialFile({ file, type: "pdf" })).toBeNull();
  });

  it("rejects unsupported MIME types", () => {
    const file = new File(["demo"], "demo.txt", { type: "text/plain" });

    expect(validateMaterialFile({ file, type: "pdf" })).toBe("Materi PDF harus memakai file PDF.");
  });

  it("rejects files larger than the Learning MVP limit", () => {
    const file = new File([new Uint8Array(MATERIAL_FILE_SIZE_LIMIT + 1)], "large.pdf", {
      type: "application/pdf",
    });

    expect(validateMaterialFile({ file, type: "pdf" })).toBe("Ukuran file materi maksimal 10 MB.");
  });
});
