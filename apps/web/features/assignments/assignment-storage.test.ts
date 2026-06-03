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

  it("accepts common LMS attachments", () => {
    const file = new File(["demo"], "instruksi.pdf", { type: "application/pdf" });
    const docx = new File(["demo"], "brief.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const source = new File(["body {}"], "starter.css", { type: "text/css" });

    expect(validateAssignmentAttachmentFile(file)).toBeNull();
    expect(validateAssignmentAttachmentFile(docx)).toBeNull();
    expect(validateAssignmentAttachmentFile(source)).toBeNull();
  });

  it("rejects unsupported attachments", () => {
    const file = new File(["demo"], "installer.exe", {
      type: "application/vnd.microsoft.portable-executable",
    });

    expect(validateAssignmentAttachmentFile(file)).toBe("Format lampiran tugas belum didukung.");
  });

  it("rejects oversized attachments", () => {
    const file = new File([new Uint8Array(ASSIGNMENT_ATTACHMENT_FILE_SIZE_LIMIT + 1)], "large.pdf", {
      type: "application/pdf",
    });

    expect(validateAssignmentAttachmentFile(file)).toBe("Ukuran file tugas maksimal 25 MB.");
  });
});
