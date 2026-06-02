import { and, asc, eq, inArray } from "drizzle-orm";

import {
  classes,
  moduleSteps,
  modules,
  questionOptions,
  quizAnswers,
  quizAttemptQuestions,
  quizAttempts,
  quizzes,
} from "@/db/schema";
import { db } from "@/lib/db";

export async function getQuizAttemptDetail(studentId: string, attemptId: string) {
  const stepAttemptRows = await db
    .select({
      attempt: {
        correctWeight: quizAttempts.correctWeight,
        expiresAt: quizAttempts.expiresAt,
        id: quizAttempts.id,
        score: quizAttempts.score,
        startedAt: quizAttempts.startedAt,
        status: quizAttempts.status,
        submittedAt: quizAttempts.submittedAt,
        totalWeight: quizAttempts.totalWeight,
        warningCount: quizAttempts.warningCount,
      },
      classItem: {
        id: classes.id,
        title: classes.title,
      },
      moduleItem: {
        id: modules.id,
        title: modules.title,
      },
      quiz: {
        durationMinutes: quizzes.durationMinutes,
        id: quizzes.id,
        passingScore: quizzes.passingScore,
        quizType: quizzes.quizType,
        title: quizzes.title,
      },
      step: {
        id: moduleSteps.id,
        title: moduleSteps.title,
      },
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, studentId)))
    .limit(1);
  const finalAttemptRows =
    stepAttemptRows[0]
      ? []
      : await db
          .select({
            attempt: {
              correctWeight: quizAttempts.correctWeight,
              expiresAt: quizAttempts.expiresAt,
              id: quizAttempts.id,
              score: quizAttempts.score,
              startedAt: quizAttempts.startedAt,
              status: quizAttempts.status,
              submittedAt: quizAttempts.submittedAt,
              totalWeight: quizAttempts.totalWeight,
              warningCount: quizAttempts.warningCount,
            },
            classItem: {
              id: classes.id,
              title: classes.title,
            },
            moduleItem: {
              id: modules.id,
              title: modules.title,
            },
            quiz: {
              durationMinutes: quizzes.durationMinutes,
              id: quizzes.id,
              passingScore: quizzes.passingScore,
              quizType: quizzes.quizType,
              title: quizzes.title,
            },
            step: {
              id: moduleSteps.id,
              title: moduleSteps.title,
            },
          })
          .from(quizAttempts)
          .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
          .innerJoin(modules, eq(modules.id, quizzes.moduleId))
          .innerJoin(classes, eq(classes.id, modules.classId))
          .leftJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
          .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, studentId)))
          .limit(1);
  const row = stepAttemptRows[0] ?? finalAttemptRows[0] ?? null;

  if (!row) {
    return null;
  }

  const attemptQuestionRows = await db
    .select({
      id: quizAttemptQuestions.id,
      questionId: quizAttemptQuestions.questionId,
      questionText: quizAttemptQuestions.questionText,
      sortOrder: quizAttemptQuestions.sortOrder,
      weight: quizAttemptQuestions.weight,
    })
    .from(quizAttemptQuestions)
    .where(eq(quizAttemptQuestions.attemptId, attemptId))
    .orderBy(asc(quizAttemptQuestions.sortOrder));
  const questionIds = attemptQuestionRows.map((question) => question.questionId);
  const attemptQuestionIds = attemptQuestionRows.map((question) => question.id);
  const [optionRows, answerRows] =
    questionIds.length > 0
      ? await Promise.all([
          db
            .select({
              id: questionOptions.id,
              isCorrect: questionOptions.isCorrect,
              label: questionOptions.label,
              optionText: questionOptions.optionText,
              questionId: questionOptions.questionId,
              sortOrder: questionOptions.sortOrder,
            })
            .from(questionOptions)
            .where(inArray(questionOptions.questionId, questionIds)),
          attemptQuestionIds.length > 0
            ? db
                .select({
                  attemptQuestionId: quizAnswers.attemptQuestionId,
                  isCorrect: quizAnswers.isCorrect,
                  selectedOptionId: quizAnswers.selectedOptionId,
                  weightAwarded: quizAnswers.weightAwarded,
                })
                .from(quizAnswers)
                .where(inArray(quizAnswers.attemptQuestionId, attemptQuestionIds))
            : Promise.resolve([]),
        ])
      : [[], []];

  const filteredOptions = optionRows
    .filter((option) => questionIds.includes(option.questionId))
    .sort((first, second) => first.sortOrder - second.sortOrder);
  const filteredAnswers = answerRows.filter((answer) =>
    attemptQuestionIds.includes(answer.attemptQuestionId),
  );
  const optionsByQuestion = new Map<string, typeof filteredOptions>();
  const answerByAttemptQuestion = new Map(
    filteredAnswers.map((answer) => [answer.attemptQuestionId, answer]),
  );

  for (const option of filteredOptions) {
    const current = optionsByQuestion.get(option.questionId) ?? [];
    current.push(option);
    optionsByQuestion.set(option.questionId, current);
  }

  return {
    ...row,
    questions: attemptQuestionRows.map((question) => ({
      ...question,
      answer: answerByAttemptQuestion.get(question.id) ?? null,
      options: optionsByQuestion.get(question.questionId) ?? [],
    })),
  };
}
