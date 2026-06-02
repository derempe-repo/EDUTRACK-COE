import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_ATTACHMENT_FILE_SIZE_LIMIT,
  buildAssignmentAttachmentStoragePath,
  validateAssignmentAttachmentFile,
} from "./assignment-storage";

describe("assignment attachment storage helpers", () => {
  it("builds assignment attachment paths scoped by class and module", () => {
    expect(
      buildAssignmentAttachmentStoragePath({
        classId: "class-id",
        fileName: "Instruksi Tugas 1.pdf",
        moduleId: "module-id",
        token: "token",
      }),
    ).toBe("class-id/module-id/assignments/token-instruksi-tugas-1.pdf");
  });

  it("accepts pdf attachments", () => {
    const file = new File(["demo"], "instruksi.pdf", { type: "application/pdf" });

    expect(validateAssignmentAttachmentFile(file)).toBeNull();
  });

  it("rejects non-pdf attachments", () => {
    const file = new File(["demo"], "instruksi.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(validateAssignmentAttachmentFile(file)).toBe("Lampiran tugas harus berupa PDF.");
  });

  it("rejects oversized attachments", () => {
    const file = new File([new Uint8Array(ASSIGNMENT_ATTACHMENT_FILE_SIZE_LIMIT + 1)], "large.pdf", {
      type: "application/pdf",
    });

    expect(validateAssignmentAttachmentFile(file)).toBe("Ukuran file tugas maksimal 10 MB.");
  });
});
