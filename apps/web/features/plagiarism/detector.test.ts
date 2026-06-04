import { describe, expect, it } from "vitest";

import { compareSubmissionAgainstCandidates } from "./detector";

describe("plagiarism detector", () => {
  it("flags identical files by file hash even when text extraction is empty", () => {
    const result = compareSubmissionAgainstCandidates({
      candidates: [
        {
          fileHash: "same-file",
          id: "submission-a",
          submissionText: null,
          textHash: null,
        },
      ],
      extractionStatus: "failed",
      fileHash: "same-file",
      submissionText: "",
      textHash: null,
      thresholdPercent: 70,
    });

    expect(result).toMatchObject({
      detectionMethod: "exact_file",
      similarityScore: 100,
      status: "flagged",
    });
    expect(result.matches[0]).toMatchObject({
      matchedSubmissionId: "submission-a",
      similarityScore: 100,
    });
  });

  it("flags identical extracted text by text hash", () => {
    const result = compareSubmissionAgainstCandidates({
      candidates: [
        {
          fileHash: "different-file",
          id: "submission-b",
          submissionText: "laporan html css lengkap",
          textHash: "same-text",
        },
      ],
      extractionStatus: "extracted",
      fileHash: "new-file",
      submissionText: "laporan html css lengkap",
      textHash: "same-text",
      thresholdPercent: 70,
    });

    expect(result.detectionMethod).toBe("exact_text");
    expect(result.status).toBe("flagged");
    expect(result.similarityScore).toBe(100);
  });

  it("marks failed extraction as needs_review instead of passed when no match exists", () => {
    const result = compareSubmissionAgainstCandidates({
      candidates: [],
      extractionStatus: "failed",
      fileHash: "unique-file",
      submissionText: "",
      textHash: null,
      thresholdPercent: 70,
    });

    expect(result).toMatchObject({
      detectionMethod: "extraction_failed",
      similarityScore: 0,
      status: "needs_review",
    });
  });
});
