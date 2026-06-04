import { describe, expect, it } from "vitest";

import { combineProgressSummaries, getProgressSummary } from "./summary";

describe("getProgressSummary", () => {
  it("returns zero progress when there are no required activities", () => {
    expect(getProgressSummary({})).toEqual({
      completed: 0,
      failed: 0,
      percent: 0,
      submitted: 0,
      total: 0,
      verified: 0,
    });
  });

  it("counts completed activities across materials, assignments, quizzes, and final exams", () => {
    expect(
      getProgressSummary({
        acceptedAssignments: 1,
        passedFinalExams: 1,
        passedQuizzes: 2,
        readMaterials: 3,
        requiredAssignments: 1,
        requiredFinalExams: 1,
        requiredMaterials: 3,
        requiredQuizzes: 2,
      }),
    ).toEqual({
      completed: 7,
      failed: 0,
      percent: 100,
      submitted: 0,
      total: 7,
      verified: 7,
    });
  });

  it("separates waiting-review and failed activities from completed progress", () => {
    expect(
      getProgressSummary({
        acceptedAssignments: 1,
        failedQuizzes: 1,
        readMaterials: 2,
        requiredAssignments: 2,
        requiredMaterials: 4,
        requiredQuizzes: 2,
        submittedAssignments: 1,
        submittedQuizzes: 1,
      }),
    ).toEqual({
      completed: 3,
      failed: 1,
      percent: 38,
      submitted: 2,
      total: 8,
      verified: 3,
    });
  });
});

describe("combineProgressSummaries", () => {
  it("combines module progress into class progress", () => {
    expect(
      combineProgressSummaries([
        { completed: 2, failed: 1, percent: 50, submitted: 0, total: 4, verified: 2 },
        { completed: 3, failed: 0, percent: 100, submitted: 1, total: 3, verified: 3 },
      ]),
    ).toEqual({
      completed: 5,
      failed: 1,
      percent: 71,
      submitted: 1,
      total: 7,
      verified: 5,
    });
  });
});
