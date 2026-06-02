import { describe, expect, it } from "vitest";

import { calculateQuizScore } from "./grading";

describe("calculateQuizScore", () => {
  it("calculates weighted quiz score", () => {
    expect(
      calculateQuizScore([
        { isCorrect: true, weight: 2 },
        { isCorrect: false, weight: 1 },
        { isCorrect: true, weight: 1 },
      ]),
    ).toEqual({
      correctWeight: 3,
      score: 75,
      totalWeight: 4,
    });
  });

  it("returns zero score when there is no weight", () => {
    expect(calculateQuizScore([])).toEqual({
      correctWeight: 0,
      score: 0,
      totalWeight: 0,
    });
  });
});
