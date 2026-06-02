import { describe, expect, it } from "vitest";

import {
  canStudentAccessQuiz,
  canSubmitQuizAttempt,
  isQuestionUsableForQuiz,
  shouldResetAttempt,
} from "./access";

describe("quiz access helpers", () => {
  it("allows enrolled students to access active quizzes in unlocked published modules", () => {
    expect(
      canStudentAccessQuiz({
        classStatus: "published",
        moduleIsLocked: false,
        quizIsActive: true,
        studentIsEnrolled: true,
      }),
    ).toBe(true);
  });

  it("blocks quiz access when class or module is unavailable", () => {
    expect(
      canStudentAccessQuiz({
        classStatus: "draft",
        moduleIsLocked: false,
        quizIsActive: true,
        studentIsEnrolled: true,
      }),
    ).toBe(false);
    expect(
      canStudentAccessQuiz({
        classStatus: "published",
        moduleIsLocked: true,
        quizIsActive: true,
        studentIsEnrolled: true,
      }),
    ).toBe(false);
  });

  it("only allows submit while attempt is started and not expired", () => {
    const now = new Date("2026-05-28T00:00:00.000Z");

    expect(
      canSubmitQuizAttempt({
        expiresAt: new Date("2026-05-28T00:10:00.000Z"),
        now,
        status: "started",
      }),
    ).toBe(true);
    expect(
      canSubmitQuizAttempt({
        expiresAt: new Date("2026-05-27T23:59:00.000Z"),
        now,
        status: "started",
      }),
    ).toBe(false);
    expect(
      canSubmitQuizAttempt({
        expiresAt: new Date("2026-05-28T00:10:00.000Z"),
        now,
        status: "submitted",
      }),
    ).toBe(false);
  });

  it("marks attempts reset after warning limit", () => {
    expect(shouldResetAttempt(2)).toBe(false);
    expect(shouldResetAttempt(3)).toBe(true);
  });

  it("requires one correct option before a question can be used", () => {
    expect(
      isQuestionUsableForQuiz({
        isActive: true,
        options: [{ isCorrect: true }, { isCorrect: false }],
      }),
    ).toBe(true);
    expect(
      isQuestionUsableForQuiz({
        isActive: true,
        options: [{ isCorrect: true }, { isCorrect: true }],
      }),
    ).toBe(false);
  });
});
