import { describe, expect, it } from "vitest";

import {
  buildSubmissionStoragePath,
  sanitizeSubmissionFileName,
  SUBMISSION_FILE_SIZE_LIMIT,
  validateSubmissionFile,
} from "./submission-storage";

describe("submission storage helpers", () => {
  it("sanitizes submission file names", () => {
    expect(sanitizeSubmissionFileName("Laporan Akhir HTML + CSS.zip")).toBe(
      "laporan-akhir-html-css.zip",
    );
  });

  it("builds submission paths scoped by class, assignment, and student", () => {
    expect(
      buildSubmissionStoragePath({
        assignmentId: "assignment-id",
        classId: "class-id",
        fileName: "source.zip",
        studentId: "student-id",
        token: "token",
      }),
    ).toBe("class-id/assignment-id/student-id/token-source.zip");
  });

  it("accepts source archives", () => {
    const file = new File(["demo"], "source.zip", { type: "application/zip" });

    expect(validateSubmissionFile(file)).toBeNull();
  });

  it("accepts browser source file mime types", () => {
    const file = new File(["<main />"], "index.html", { type: "text/html" });

    expect(validateSubmissionFile(file)).toBeNull();
  });

  it("rejects oversized files", () => {
    const file = new File([new Uint8Array(SUBMISSION_FILE_SIZE_LIMIT + 1)], "large.zip", {
      type: "application/zip",
    });

    expect(validateSubmissionFile(file)).toBe("Ukuran file submission maksimal 20 MB.");
  });
});
