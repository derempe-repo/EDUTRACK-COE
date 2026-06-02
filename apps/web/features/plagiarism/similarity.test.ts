import { describe, expect, it } from "vitest";

import {
  calculateJaccardSimilarity,
  normalizeSubmissionText,
  tokenizeSubmissionText,
} from "./similarity";

describe("plagiarism similarity helpers", () => {
  it("normalizes casing and repeated whitespace", () => {
    expect(normalizeSubmissionText("  Halo\n  DUNIA  ")).toBe("halo dunia");
  });

  it("removes basic Indonesian stopwords while keeping code identifiers", () => {
    expect(tokenizeSubmissionText("ini adalah function renderCard untuk student_id")).toEqual([
      "function",
      "rendercard",
      "student_id",
    ]);
  });

  it("returns a high score for strongly overlapping submissions", () => {
    expect(
      calculateJaccardSimilarity(
        "html css javascript fetch api responsive layout",
        "HTML CSS JavaScript fetch API responsive layout tambahan",
      ),
    ).toBe(88);
  });

  it("returns zero when one submission has no meaningful text", () => {
    expect(calculateJaccardSimilarity("dan ini adalah", "html css")).toBe(0);
  });
});
