import { describe, expect, it } from "vitest";

import { evaluateCertificateRule } from "./rules";

describe("evaluateCertificateRule", () => {
  it("allows certificate issuance after learning, score, and plagiarism checks pass", () => {
    expect(
      evaluateCertificateRule({
        finalScore: 80,
        hasRejectedPermanentSubmission: false,
        progressPercent: 100,
      }).isEligible,
    ).toBe(true);
  });

  it("blocks issuance when the final score is below 70", () => {
    expect(
      evaluateCertificateRule({
        finalScore: 69,
        hasRejectedPermanentSubmission: false,
        progressPercent: 100,
      }).isEligible,
    ).toBe(false);
  });

  it("blocks issuance after permanent plagiarism rejection", () => {
    expect(
      evaluateCertificateRule({
        finalScore: 90,
        hasRejectedPermanentSubmission: true,
        progressPercent: 100,
      }).isEligible,
    ).toBe(false);
  });
});
