import { describe, expect, it } from "vitest";

import { calculateWeightedClassScore, gradeWeightsTotal } from "./class-score";

describe("weighted class score", () => {
  it("combines normalized assignment, quiz, and final exam averages", () => {
    expect(
      calculateWeightedClassScore({
        assignmentScores: [
          { maxScore: 50, score: 40 },
          { maxScore: 100, score: 90 },
        ],
        assignmentWeight: 30,
        finalExamScores: [{ maxScore: 100, score: 75 }],
        finalExamWeight: 40,
        quizScores: [{ maxScore: 100, score: 80 }],
        quizWeight: 30,
      }),
    ).toEqual({
      assignmentAverage: 85,
      finalExamAverage: 75,
      finalScore: 80,
      quizAverage: 80,
    });
  });

  it("keeps a configured category at zero until it has a graded result", () => {
    expect(
      calculateWeightedClassScore({
        assignmentScores: [],
        assignmentWeight: 30,
        finalExamScores: [],
        finalExamWeight: 40,
        quizScores: [{ maxScore: 100, score: 90 }],
        quizWeight: 30,
      }).finalScore,
    ).toBe(27);
  });

  it("ignores malformed score items that cannot be normalized", () => {
    expect(
      calculateWeightedClassScore({
        assignmentScores: [
          { maxScore: 0, score: 100 },
          { maxScore: 100, score: 80 },
        ],
        assignmentWeight: 100,
        finalExamScores: [],
        finalExamWeight: 0,
        quizScores: [],
        quizWeight: 0,
      }).finalScore,
    ).toBe(80);
  });

  it("totals configured weights", () => {
    expect(gradeWeightsTotal({ assignmentWeight: 30, finalExamWeight: 40, quizWeight: 30 })).toBe(
      100,
    );
  });
});
