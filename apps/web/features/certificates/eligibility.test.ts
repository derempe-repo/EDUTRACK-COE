import { describe, expect, it } from "vitest";

import { getCertificateEligibility } from "./eligibility";

describe("getCertificateEligibility", () => {
  it("marks a student eligible when every required activity and module is complete", () => {
    expect(
      getCertificateEligibility({
        completed: 8,
        modulePercents: [100, 100],
        total: 8,
      }),
    ).toMatchObject({
      isEligible: true,
      missingCount: 0,
      percent: 100,
    });
  });

  it("keeps certificate locked when there are remaining required activities", () => {
    expect(
      getCertificateEligibility({
        completed: 7,
        modulePercents: [100, 75],
        total: 8,
      }),
    ).toMatchObject({
      isEligible: false,
      missingCount: 1,
      percent: 88,
    });
  });

  it("does not issue eligibility for an empty class", () => {
    expect(
      getCertificateEligibility({
        completed: 0,
        modulePercents: [],
        total: 0,
      }),
    ).toMatchObject({
      isEligible: false,
      missingCount: 0,
      percent: 0,
    });
  });
});
