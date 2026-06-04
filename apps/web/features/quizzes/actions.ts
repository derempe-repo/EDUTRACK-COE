"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assignments,
  classMembers,
  classes,
  examModeEvents,
  grades,
  moduleProgress,
  modules,
  moduleSteps,
  notifications,
  questionOptions,
  questions,
  quizAnswers,
  quizAttemptQuestions,
  quizAttempts,
  quizzes,
  submissions,
} from "@/db/schema";
import { tryIssueEligibleCertificate } from "@/features/certificates/issuer";
import { invalidateClassDataCache } from "@/features/classes/cache-tags";
import { getDosenModuleQuizzesPath, getMahasiswaClassPath } from "@/features/classes/urls";
import { hasPriorFlaggedSubmission } from "@/features/plagiarism/access";
import { canStudentAccessQuiz, canSubmitQuizAttempt, isQuestionUsableForQuiz } from "@/features/quizzes/access";
import { calculateQuizScore } from "@/features/quizzes/grading";
import {
  findDuplicateImportedQuestions,
  importedQuestionsPayloadSchema,
} from "@/features/quizzes/question-import";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "@/lib/validators";

const textField = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const optionLabels = ["A", "B", "C", "D"] as const;
const difficultySchema = z.enum(["easy", "medium", "hard"]);
const correctLabelSchema = z.enum(optionLabels);

async function notifyUsers(
  rows: Array<{
    body: string;
    entityId?: string;
    entityType?: string;
    recipientId: string;
    title: string;
  }>,
) {
  if (rows.length === 0) {
    return;
  }

  await db.insert(notifications).values(
    rows.map((row) => ({
      body: row.body,
      entityId: row.entityId,
      entityType: row.entityType,
      recipientId: row.recipientId,
      title: row.title,
    })),
  );
}

async function requireOwnedStep(stepId: string, lecturerId: string) {
  const rows = await db
    .select({
      classId: classes.id,
      classTitle: classes.title,
      moduleId: modules.id,
      moduleTitle: modules.title,
      stepId: moduleSteps.id,
      stepTitle: moduleSteps.title,
    })
    .from(moduleSteps)
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(moduleSteps.id, stepId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!rows[0]) {
    redirect("/dosen/dashboard?error=step_not_found");
  }

  return rows[0];
}

async function requireOwnedModule(moduleId: string, lecturerId: string) {
  const rows = await db
    .select({
      classId: classes.id,
      classTitle: classes.title,
      moduleId: modules.id,
      moduleTitle: modules.title,
    })
    .from(modules)
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(modules.id, moduleId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!rows[0]) {
    redirect("/dosen/dashboard?error=module_not_found");
  }

  return rows[0];
}

async function requireOwnedQuiz(quizId: string, lecturerId: string) {
  const stepQuizRows = await db
    .select({
      classId: classes.id,
      classTitle: classes.title,
      moduleId: modules.id,
      moduleTitle: modules.title,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      quizType: quizzes.quizType,
      stepId: moduleSteps.id,
      stepTitle: moduleSteps.title,
    })
    .from(quizzes)
    .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(quizzes.id, quizId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (stepQuizRows[0]) {
    return stepQuizRows[0];
  }

  const finalQuizRows = await db
    .select({
      classId: classes.id,
      classTitle: classes.title,
      moduleId: modules.id,
      moduleTitle: modules.title,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      quizType: quizzes.quizType,
      stepId: moduleSteps.id,
      stepTitle: moduleSteps.title,
    })
    .from(quizzes)
    .innerJoin(modules, eq(modules.id, quizzes.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .leftJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
    .where(and(eq(quizzes.id, quizId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!finalQuizRows[0]) {
    redirect("/dosen/dashboard?error=quiz_not_found");
  }

  return finalQuizRows[0];
}

async function requireOwnedAttempt(attemptId: string, lecturerId: string) {
  const stepAttemptRows = await db
    .select({
      attemptId: quizAttempts.id,
      classId: classes.id,
      classTitle: classes.title,
      moduleId: modules.id,
      moduleTitle: modules.title,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      quizType: quizzes.quizType,
      status: quizAttempts.status,
      studentId: quizAttempts.studentId,
      stepId: moduleSteps.id,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(quizAttempts.id, attemptId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (stepAttemptRows[0]) {
    return stepAttemptRows[0];
  }

  const finalAttemptRows = await db
    .select({
      attemptId: quizAttempts.id,
      classId: classes.id,
      classTitle: classes.title,
      moduleId: modules.id,
      moduleTitle: modules.title,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      quizType: quizzes.quizType,
      status: quizAttempts.status,
      studentId: quizAttempts.studentId,
      stepId: moduleSteps.id,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(modules, eq(modules.id, quizzes.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .leftJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
    .where(and(eq(quizAttempts.id, attemptId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!finalAttemptRows[0]) {
    redirect("/dosen/dashboard?error=quiz_attempt_not_found");
  }

  return finalAttemptRows[0];
}

async function requireOwnedQuestion(questionId: string, lecturerId: string) {
  const rows = await db
    .select({
      classId: classes.id,
      classTitle: classes.title,
      moduleId: modules.id,
      moduleTitle: modules.title,
      questionId: questions.id,
      questionText: questions.questionText,
      stepId: moduleSteps.id,
    })
    .from(questions)
    .innerJoin(moduleSteps, eq(moduleSteps.id, questions.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(questions.id, questionId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!rows[0]) {
    redirect("/dosen/dashboard?error=question_not_found");
  }

  return rows[0];
}

async function requireStudentQuizContext(quizId: string, studentId: string) {
  const stepQuizRows = await db
    .select({
      classId: classes.id,
      classStatus: classes.status,
      classTitle: classes.title,
      lecturerId: classes.createdBy,
      moduleId: modules.id,
      moduleIsLocked: modules.isLocked,
      moduleTitle: modules.title,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      quizType: quizzes.quizType,
      questionCount: quizzes.questionCount,
      durationMinutes: quizzes.durationMinutes,
      passingScore: quizzes.passingScore,
      isActive: quizzes.isActive,
      stepId: moduleSteps.id,
      stepTitle: moduleSteps.title,
    })
    .from(quizzes)
    .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .innerJoin(classMembers, eq(classMembers.classId, classes.id))
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(classMembers.profileId, studentId),
        eq(classMembers.role, "student"),
      ),
    )
    .limit(1);

  const finalQuizRows =
    stepQuizRows[0]
      ? []
      : await db
          .select({
            classId: classes.id,
            classStatus: classes.status,
            classTitle: classes.title,
            lecturerId: classes.createdBy,
            moduleId: modules.id,
            moduleIsLocked: modules.isLocked,
            moduleTitle: modules.title,
            quizId: quizzes.id,
            quizTitle: quizzes.title,
            quizType: quizzes.quizType,
            questionCount: quizzes.questionCount,
            durationMinutes: quizzes.durationMinutes,
            passingScore: quizzes.passingScore,
            isActive: quizzes.isActive,
            stepId: moduleSteps.id,
            stepTitle: moduleSteps.title,
          })
          .from(quizzes)
          .innerJoin(modules, eq(modules.id, quizzes.moduleId))
          .innerJoin(classes, eq(classes.id, modules.classId))
          .innerJoin(classMembers, eq(classMembers.classId, classes.id))
          .leftJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
          .where(
            and(
              eq(quizzes.id, quizId),
              eq(classMembers.profileId, studentId),
              eq(classMembers.role, "student"),
            ),
          )
          .limit(1);

  const context = stepQuizRows[0] ?? finalQuizRows[0] ?? null;

  if (
    !context ||
    !canStudentAccessQuiz({
      classStatus: context.classStatus,
      moduleIsLocked: context.moduleIsLocked,
      quizIsActive: context.isActive,
      studentIsEnrolled: true,
    })
  ) {
    redirect("/mahasiswa/dashboard?error=quiz_not_found");
  }

  if (
    await hasPriorFlaggedSubmission({
      classId: context.classId,
      moduleId: context.moduleId,
      studentId,
    })
  ) {
    redirect(
      getMahasiswaClassPath({ id: context.classId, title: context.classTitle }) +
        "?error=plagiarism_module_locked",
    );
  }

  return context;
}

async function getModuleCompletionGate(moduleId: string, studentId: string) {
  const [assignmentRows, submissionRows, quizRows, attemptRows] = await Promise.all([
    db
      .select({ id: assignments.id })
      .from(assignments)
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .where(and(eq(moduleSteps.moduleId, moduleId), eq(assignments.isActive, true))),
    db
      .select({ assignmentId: submissions.assignmentId })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .where(
        and(
          eq(moduleSteps.moduleId, moduleId),
          eq(submissions.studentId, studentId),
          eq(submissions.status, "accepted"),
        ),
      ),
    db
      .select({
        id: quizzes.id,
        passingScore: quizzes.passingScore,
      })
      .from(quizzes)
      .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
      .where(
        and(
          eq(moduleSteps.moduleId, moduleId),
          eq(quizzes.isActive, true),
          eq(quizzes.quizType, "step"),
        ),
      ),
    db
      .select({
        quizId: quizAttempts.quizId,
        score: quizAttempts.score,
        status: quizAttempts.status,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
      .where(and(eq(moduleSteps.moduleId, moduleId), eq(quizAttempts.studentId, studentId))),
  ]);

  const acceptedAssignments = new Set(submissionRows.map((submission) => submission.assignmentId));
  const attemptsByQuiz = new Map<string, (typeof attemptRows)[number][]>();
  for (const attempt of attemptRows) {
    const current = attemptsByQuiz.get(attempt.quizId) ?? [];
    current.push(attempt);
    attemptsByQuiz.set(attempt.quizId, current);
  }

  const completedAssignments = assignmentRows.filter((assignment) =>
    acceptedAssignments.has(assignment.id),
  ).length;
  const completedQuizzes = quizRows.filter((quiz) =>
    (attemptsByQuiz.get(quiz.id) ?? []).some(
      (attempt) => attempt.status === "submitted" && (attempt.score ?? 0) >= quiz.passingScore,
    ),
  ).length;
  const required = assignmentRows.length + quizRows.length;
  const completed = completedAssignments + completedQuizzes;

  return {
    completed,
    completedAssignments,
    completedQuizzes,
    ready: required === completed,
    required,
    requiredAssignments: assignmentRows.length,
    requiredQuizzes: quizRows.length,
  };
}

function shuffle<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export async function createQuizAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      description: textField,
      durationMinutes: z.coerce.number().int().min(1).max(240),
      isActive: z.boolean(),
      passingScore: z.coerce.number().int().min(0).max(100),
      questionCount: z.coerce.number().int().min(1).max(50),
      stepId: z.uuid(),
      title: z.string().trim().min(3).max(120),
    })
    .safeParse({
      description: formData.get("description"),
      durationMinutes: formData.get("durationMinutes") ?? 30,
      isActive: formData.get("isActive") === "on",
      passingScore: formData.get("passingScore") ?? 70,
      questionCount: formData.get("questionCount") ?? 5,
      stepId: formData.get("stepId"),
      title: formData.get("title"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_quiz");
  }

  const step = await requireOwnedStep(parsed.data.stepId, profile.id);
  const existingQuiz = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(and(eq(quizzes.moduleStepId, parsed.data.stepId), eq(quizzes.quizType, "step")))
    .limit(1);

  if (existingQuiz[0]) {
    redirect(
      getDosenModuleQuizzesPath(
        { id: step.classId, title: step.classTitle },
        { id: step.moduleId, title: step.moduleTitle },
      ) + "?error=quiz_already_exists",
    );
  }

  const [quiz] = await db
    .insert(quizzes)
    .values({
      createdBy: profile.id,
      description: parsed.data.description,
      durationMinutes: parsed.data.durationMinutes,
      isActive: parsed.data.isActive,
      moduleStepId: parsed.data.stepId,
      quizType: "step",
      passingScore: parsed.data.passingScore,
      questionCount: parsed.data.questionCount,
      title: parsed.data.title,
    })
    .returning({ id: quizzes.id });

  const students = await db
    .select({ profileId: classMembers.profileId })
    .from(classMembers)
    .where(and(eq(classMembers.classId, step.classId), eq(classMembers.role, "student")));

  if (parsed.data.isActive) {
    await notifyUsers(
      students.map((student) => ({
        body: `Kuis baru "${parsed.data.title}" tersedia di ${step.moduleTitle}.`,
        entityId: quiz.id,
        entityType: "quizzes",
        recipientId: student.profileId,
        title: "Kuis baru tersedia",
      })),
    );
  }

  await writeAuditLog({
    action: "quizzes.created",
    entityId: quiz.id,
    entityType: "quizzes",
    metadata: {
      class_id: step.classId,
      step_id: parsed.data.stepId,
      title: parsed.data.title,
    },
  });

  revalidatePath(`/dosen/classes/${step.classId}`);
  revalidatePath(`/mahasiswa/classes/${step.classId}`);
  invalidateClassDataCache({ classId: step.classId, lecturerId: profile.id });
  redirect(
    getDosenModuleQuizzesPath(
      { id: step.classId, title: step.classTitle },
      { id: step.moduleId, title: step.moduleTitle },
    ) + "?quiz_created=1",
  );
}

export async function createFinalExamAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      description: textField,
      durationMinutes: z.coerce.number().int().min(1).max(240),
      isActive: z.boolean(),
      moduleId: z.uuid(),
      passingScore: z.coerce.number().int().min(0).max(100),
      questionCount: z.coerce.number().int().min(1).max(100),
      title: z.string().trim().min(3).max(120),
    })
    .safeParse({
      description: formData.get("description"),
      durationMinutes: formData.get("durationMinutes") ?? 60,
      isActive: formData.get("isActive") === "on",
      moduleId: formData.get("moduleId"),
      passingScore: formData.get("passingScore") ?? 75,
      questionCount: formData.get("questionCount") ?? 10,
      title: formData.get("title"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_final_exam");
  }

  const moduleItem = await requireOwnedModule(parsed.data.moduleId, profile.id);
  const existingFinalExam = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(and(eq(quizzes.moduleId, parsed.data.moduleId), eq(quizzes.quizType, "final")))
    .limit(1);

  if (existingFinalExam[0]) {
    redirect(
      getDosenModuleQuizzesPath(
        { id: moduleItem.classId, title: moduleItem.classTitle },
        { id: moduleItem.moduleId, title: moduleItem.moduleTitle },
      ) + "?error=final_exam_already_exists",
    );
  }

  const [quiz] = await db
    .insert(quizzes)
    .values({
      createdBy: profile.id,
      description: parsed.data.description,
      durationMinutes: parsed.data.durationMinutes,
      isActive: parsed.data.isActive,
      moduleId: parsed.data.moduleId,
      passingScore: parsed.data.passingScore,
      questionCount: parsed.data.questionCount,
      quizType: "final",
      title: parsed.data.title,
    })
    .returning({ id: quizzes.id });

  const students = await db
    .select({ profileId: classMembers.profileId })
    .from(classMembers)
    .where(and(eq(classMembers.classId, moduleItem.classId), eq(classMembers.role, "student")));

  if (parsed.data.isActive) {
    await notifyUsers(
      students.map((student) => ({
        body: `Final exam "${parsed.data.title}" tersedia di modul ${moduleItem.moduleTitle}.`,
        entityId: quiz.id,
        entityType: "quizzes",
        recipientId: student.profileId,
        title: "Final exam tersedia",
      })),
    );
  }

  await writeAuditLog({
    action: "final_exams.created",
    entityId: quiz.id,
    entityType: "quizzes",
    metadata: {
      class_id: moduleItem.classId,
      module_id: parsed.data.moduleId,
      title: parsed.data.title,
    },
  });

  revalidatePath(`/dosen/classes/${moduleItem.classId}`);
  revalidatePath(`/mahasiswa/classes/${moduleItem.classId}`);
  invalidateClassDataCache({ classId: moduleItem.classId, lecturerId: profile.id });
  redirect(
    getDosenModuleQuizzesPath(
      { id: moduleItem.classId, title: moduleItem.classTitle },
      { id: moduleItem.moduleId, title: moduleItem.moduleTitle },
    ) + "?final_exam_created=1",
  );
}

export async function updateQuizAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      description: textField,
      durationMinutes: z.coerce.number().int().min(1).max(240),
      isActive: z.boolean(),
      passingScore: z.coerce.number().int().min(0).max(100),
      questionCount: z.coerce.number().int().min(1).max(50),
      quizId: z.uuid(),
      title: z.string().trim().min(3).max(120),
    })
    .safeParse({
      description: formData.get("description"),
      durationMinutes: formData.get("durationMinutes") ?? 30,
      isActive: formData.get("isActive") === "on",
      passingScore: formData.get("passingScore") ?? 70,
      questionCount: formData.get("questionCount") ?? 5,
      quizId: formData.get("quizId"),
      title: formData.get("title"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_quiz");
  }

  const quiz = await requireOwnedQuiz(parsed.data.quizId, profile.id);
  if (quiz.quizType !== "final" && !quiz.stepId) {
    redirect("/dosen/dashboard?error=quiz_not_found");
  }

  if (parsed.data.isActive) {
    const activeQuizRows =
      quiz.quizType === "final"
        ? await db
            .select({ id: quizzes.id })
            .from(quizzes)
            .where(
              and(
                eq(quizzes.moduleId, quiz.moduleId),
                eq(quizzes.quizType, "final"),
                eq(quizzes.isActive, true),
              ),
            )
            .limit(2)
        : await db
            .select({ id: quizzes.id })
            .from(quizzes)
            .where(
              and(
                eq(quizzes.moduleStepId, quiz.stepId ?? ""),
                eq(quizzes.quizType, "step"),
                eq(quizzes.isActive, true),
              ),
            )
            .limit(2);
    const otherActiveQuiz = activeQuizRows.find((item) => item.id !== parsed.data.quizId);

    if (otherActiveQuiz) {
      redirect(
        getDosenModuleQuizzesPath(
          { id: quiz.classId, title: quiz.classTitle },
          { id: quiz.moduleId, title: quiz.moduleTitle },
        ) + (quiz.quizType === "final" ? "?error=final_exam_already_exists" : "?error=quiz_already_exists"),
      );
    }
  }

  await db
    .update(quizzes)
    .set({
      description: parsed.data.description,
      durationMinutes: parsed.data.durationMinutes,
      isActive: parsed.data.isActive,
      passingScore: parsed.data.passingScore,
      questionCount: parsed.data.questionCount,
      title: parsed.data.title,
      updatedAt: new Date(),
    })
    .where(eq(quizzes.id, parsed.data.quizId));

  await writeAuditLog({
    action: "quizzes.updated",
    entityId: parsed.data.quizId,
    entityType: "quizzes",
    metadata: {
      class_id: quiz.classId,
      is_active: parsed.data.isActive,
      title: parsed.data.title,
    },
  });

  revalidatePath(`/mahasiswa/classes/${quiz.classId}`);
  invalidateClassDataCache({ classId: quiz.classId, lecturerId: profile.id });
  redirect(
    getDosenModuleQuizzesPath(
      { id: quiz.classId, title: quiz.classTitle },
      { id: quiz.moduleId, title: quiz.moduleTitle },
    ) + "?quiz_updated=1",
  );
}

export async function createQuestionAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      correctLabel: correctLabelSchema,
      difficulty: difficultySchema,
      optionA: z.string().trim().min(1).max(1000),
      optionB: z.string().trim().min(1).max(1000),
      optionC: z.string().trim().min(1).max(1000),
      optionD: z.string().trim().min(1).max(1000),
      questionText: z.string().trim().min(5).max(3000),
      stepId: z.uuid(),
      weight: z.coerce.number().int().min(1).max(100),
    })
    .safeParse({
      correctLabel: formData.get("correctLabel"),
      difficulty: formData.get("difficulty") ?? "medium",
      optionA: formData.get("optionA"),
      optionB: formData.get("optionB"),
      optionC: formData.get("optionC"),
      optionD: formData.get("optionD"),
      questionText: formData.get("questionText"),
      stepId: formData.get("stepId"),
      weight: formData.get("weight") ?? 1,
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_question");
  }

  const step = await requireOwnedStep(parsed.data.stepId, profile.id);
  const [question] = await db
    .insert(questions)
    .values({
      createdBy: profile.id,
      difficulty: parsed.data.difficulty,
      moduleStepId: parsed.data.stepId,
      questionText: parsed.data.questionText,
      weight: parsed.data.weight,
    })
    .returning({ id: questions.id });

  await db.insert(questionOptions).values(
    optionLabels.map((label, index) => ({
      isCorrect: parsed.data.correctLabel === label,
      label,
      optionText: parsed.data[`option${label}`],
      questionId: question.id,
      sortOrder: index + 1,
    })),
  );

  await writeAuditLog({
    action: "questions.created",
    entityId: question.id,
    entityType: "questions",
    metadata: {
      class_id: step.classId,
      difficulty: parsed.data.difficulty,
      step_id: parsed.data.stepId,
    },
  });

  revalidatePath(`/dosen/classes/${step.classId}`);
  invalidateClassDataCache({ classId: step.classId, lecturerId: profile.id });
  redirect(
    getDosenModuleQuizzesPath(
      { id: step.classId, title: step.classTitle },
      { id: step.moduleId, title: step.moduleTitle },
    ) + "?question_created=1",
  );
}

export async function importQuestionsAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      payload: z.string().trim().min(2).max(1_000_000),
      stepId: z.uuid(),
    })
    .safeParse({
      payload: formData.get("payload"),
      stepId: formData.get("stepId"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_question_import");
  }

  const step = await requireOwnedStep(parsed.data.stepId, profile.id);
  const quizzesPath = getDosenModuleQuizzesPath(
    { id: step.classId, title: step.classTitle },
    { id: step.moduleId, title: step.moduleTitle },
  );
  let payload: unknown;

  try {
    payload = JSON.parse(parsed.data.payload);
  } catch {
    redirect(`${quizzesPath}?error=invalid_question_import`);
  }

  const questionsParsed = importedQuestionsPayloadSchema.safeParse(payload);

  if (!questionsParsed.success) {
    redirect(`${quizzesPath}?error=invalid_question_import`);
  }

  const existingQuestions = await db
    .select({ questionText: questions.questionText })
    .from(questions)
    .where(eq(questions.moduleStepId, parsed.data.stepId));

  if (
    findDuplicateImportedQuestions(
      questionsParsed.data,
      existingQuestions.map((question) => question.questionText),
    )
  ) {
    redirect(`${quizzesPath}?error=question_import_duplicate`);
  }

  await db.transaction(async (tx) => {
    for (const importedQuestion of questionsParsed.data) {
      const [question] = await tx
        .insert(questions)
        .values({
          createdBy: profile.id,
          difficulty: importedQuestion.difficulty,
          moduleStepId: parsed.data.stepId,
          questionText: importedQuestion.questionText,
          weight: importedQuestion.weight,
        })
        .returning({ id: questions.id });

      await tx.insert(questionOptions).values(
        optionLabels.map((label, index) => ({
          isCorrect: importedQuestion.correctLabel === label,
          label,
          optionText: importedQuestion[`option${label}`],
          questionId: question.id,
          sortOrder: index + 1,
        })),
      );
    }
  });

  await writeAuditLog({
    action: "questions.imported",
    entityId: parsed.data.stepId,
    entityType: "module_steps",
    metadata: {
      class_id: step.classId,
      count: questionsParsed.data.length,
      step_id: parsed.data.stepId,
    },
  });

  revalidatePath(`/dosen/classes/${step.classId}`);
  invalidateClassDataCache({ classId: step.classId, lecturerId: profile.id });
  redirect(`${quizzesPath}?questions_imported=${questionsParsed.data.length}`);
}

export async function deleteQuestionAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z.object({ questionId: z.uuid() }).safeParse({
    questionId: formData.get("questionId"),
  });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_question");
  }

  const question = await requireOwnedQuestion(parsed.data.questionId, profile.id);
  const usedRows = await db
    .select({ id: quizAttemptQuestions.id })
    .from(quizAttemptQuestions)
    .where(eq(quizAttemptQuestions.questionId, parsed.data.questionId))
    .limit(1);

  if (usedRows[0]) {
    await db
      .update(questions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(questions.id, parsed.data.questionId));
  } else {
    await db.delete(questions).where(eq(questions.id, parsed.data.questionId));
  }

  await writeAuditLog({
    action: "questions.deleted",
    entityId: parsed.data.questionId,
    entityType: "questions",
    metadata: {
      class_id: question.classId,
      deactivated_only: Boolean(usedRows[0]),
    },
  });

  invalidateClassDataCache({ classId: question.classId, lecturerId: profile.id });
  redirect(
    getDosenModuleQuizzesPath(
      { id: question.classId, title: question.classTitle },
      { id: question.moduleId, title: question.moduleTitle },
    ) + "?question_deleted=1",
  );
}

export async function startQuizAction(formData: FormData) {
  const profile = await requireRole(["mahasiswa"]);
  const parsed = z.object({ quizId: z.uuid() }).safeParse({
    quizId: formData.get("quizId"),
  });

  if (!parsed.success) {
    redirect("/mahasiswa/dashboard?error=invalid_quiz");
  }

  const context = await requireStudentQuizContext(parsed.data.quizId, profile.id);
  const classPath = getMahasiswaClassPath({ id: context.classId, title: context.classTitle });

  if (context.quizType === "final") {
    const gate = await getModuleCompletionGate(context.moduleId, profile.id);
    if (!gate.ready) {
      redirect(classPath + "?error=final_exam_locked");
    }
  }

  const latestAttempts = await db
    .select({
      expiresAt: quizAttempts.expiresAt,
      id: quizAttempts.id,
      status: quizAttempts.status,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, parsed.data.quizId), eq(quizAttempts.studentId, profile.id)))
    .orderBy(desc(quizAttempts.startedAt))
    .limit(1);
  const latestAttempt = latestAttempts[0] ?? null;

  if (latestAttempt?.status === "started") {
    if (latestAttempt.expiresAt.getTime() > Date.now()) {
      redirect(`/mahasiswa/quizzes/attempts/${latestAttempt.id}`);
    }

    await db
      .update(quizAttempts)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(quizAttempts.id, latestAttempt.id));
  } else if (latestAttempt?.status === "submitted") {
    redirect(`/mahasiswa/quizzes/attempts/${latestAttempt.id}`);
  }

  const questionRows =
    context.quizType === "final"
      ? await db
          .select({
            difficulty: questions.difficulty,
            id: questions.id,
            isActive: questions.isActive,
            questionText: questions.questionText,
            weight: questions.weight,
          })
          .from(questions)
          .innerJoin(moduleSteps, eq(moduleSteps.id, questions.moduleStepId))
          .where(and(eq(moduleSteps.moduleId, context.moduleId), eq(questions.isActive, true)))
      : await db
          .select({
            difficulty: questions.difficulty,
            id: questions.id,
            isActive: questions.isActive,
            questionText: questions.questionText,
            weight: questions.weight,
          })
          .from(questions)
          .where(and(eq(questions.moduleStepId, context.stepId ?? ""), eq(questions.isActive, true)));
  const optionRows =
    questionRows.length > 0
      ? await db
          .select({
            id: questionOptions.id,
            isCorrect: questionOptions.isCorrect,
            label: questionOptions.label,
            optionText: questionOptions.optionText,
            questionId: questionOptions.questionId,
            sortOrder: questionOptions.sortOrder,
          })
          .from(questionOptions)
          .where(
            inArray(
              questionOptions.questionId,
              questionRows.map((question) => question.id),
            ),
          )
          .orderBy(asc(questionOptions.sortOrder))
      : [];
  const optionsByQuestion = new Map<string, typeof optionRows>();

  for (const option of optionRows) {
    const current = optionsByQuestion.get(option.questionId) ?? [];
    current.push(option);
    optionsByQuestion.set(option.questionId, current);
  }

  const usableQuestions = questionRows.filter((question) =>
    isQuestionUsableForQuiz({
      isActive: question.isActive,
      options: optionsByQuestion.get(question.id) ?? [],
    }),
  );

  if (usableQuestions.length < context.questionCount) {
    redirect(classPath + "?error=quiz_not_enough_questions");
  }

  const selectedQuestions = shuffle(usableQuestions).slice(0, context.questionCount);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + context.durationMinutes * 60 * 1000);
  const totalWeight = selectedQuestions.reduce((sum, question) => sum + question.weight, 0);

  const [attempt] = await db.transaction(async (tx) => {
    const [createdAttempt] = await tx
      .insert(quizAttempts)
      .values({
        expiresAt,
        quizId: parsed.data.quizId,
        startedAt: now,
        studentId: profile.id,
        totalWeight,
      })
      .returning({ id: quizAttempts.id });

    await tx.insert(quizAttemptQuestions).values(
      selectedQuestions.map((question, index) => ({
        attemptId: createdAttempt.id,
        questionId: question.id,
        questionText: question.questionText,
        sortOrder: index + 1,
        weight: question.weight,
      })),
    );

    return [createdAttempt];
  });

  await writeAuditLog({
    action: "quiz_attempts.started",
    entityId: attempt.id,
    entityType: "quiz_attempts",
    metadata: {
      class_id: context.classId,
      quiz_id: parsed.data.quizId,
      question_count: selectedQuestions.length,
    },
  });

  redirect(`/mahasiswa/quizzes/attempts/${attempt.id}`);
}

export async function submitQuizAttemptAction(formData: FormData) {
  const profile = await requireRole(["mahasiswa"]);
  const parsed = z.object({ attemptId: z.uuid() }).safeParse({
    attemptId: formData.get("attemptId"),
  });

  if (!parsed.success) {
    redirect("/mahasiswa/dashboard?error=invalid_quiz_submission");
  }

  const stepAttemptRows = await db
    .select({
      attemptId: quizAttempts.id,
      classId: classes.id,
      classTitle: classes.title,
      expiresAt: quizAttempts.expiresAt,
      lecturerId: classes.createdBy,
      moduleId: modules.id,
      moduleTitle: modules.title,
      passingScore: quizzes.passingScore,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      quizType: quizzes.quizType,
      status: quizAttempts.status,
      stepId: moduleSteps.id,
      studentId: quizAttempts.studentId,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(quizAttempts.id, parsed.data.attemptId), eq(quizAttempts.studentId, profile.id)))
    .limit(1);
  const finalAttemptRows =
    stepAttemptRows[0]
      ? []
      : await db
          .select({
            attemptId: quizAttempts.id,
            classId: classes.id,
            classTitle: classes.title,
            expiresAt: quizAttempts.expiresAt,
            lecturerId: classes.createdBy,
            moduleId: modules.id,
            moduleTitle: modules.title,
            passingScore: quizzes.passingScore,
            quizId: quizzes.id,
            quizTitle: quizzes.title,
            quizType: quizzes.quizType,
            status: quizAttempts.status,
            stepId: moduleSteps.id,
            studentId: quizAttempts.studentId,
          })
          .from(quizAttempts)
          .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
          .innerJoin(modules, eq(modules.id, quizzes.moduleId))
          .innerJoin(classes, eq(classes.id, modules.classId))
          .leftJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
          .where(and(eq(quizAttempts.id, parsed.data.attemptId), eq(quizAttempts.studentId, profile.id)))
          .limit(1);
  const attempt = stepAttemptRows[0] ?? finalAttemptRows[0] ?? null;

  if (!attempt) {
    redirect("/mahasiswa/dashboard?error=quiz_attempt_not_found");
  }

  const classPath = getMahasiswaClassPath({ id: attempt.classId, title: attempt.classTitle });

  if (!canSubmitQuizAttempt({ expiresAt: attempt.expiresAt, status: attempt.status })) {
    if (attempt.status === "started" && attempt.expiresAt.getTime() <= Date.now()) {
      await db
        .update(quizAttempts)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(quizAttempts.id, parsed.data.attemptId));
    }

    redirect(classPath + "?error=quiz_attempt_expired");
  }

  const attemptQuestionRows = await db
    .select({
      id: quizAttemptQuestions.id,
      questionId: quizAttemptQuestions.questionId,
      weight: quizAttemptQuestions.weight,
    })
    .from(quizAttemptQuestions)
    .where(eq(quizAttemptQuestions.attemptId, parsed.data.attemptId));

  if (attemptQuestionRows.length === 0) {
    redirect(classPath + "?error=invalid_quiz_submission");
  }

  const optionRows = await db
    .select({
      id: questionOptions.id,
      isCorrect: questionOptions.isCorrect,
      questionId: questionOptions.questionId,
    })
    .from(questionOptions)
    .where(
      inArray(
        questionOptions.questionId,
        attemptQuestionRows.map((question) => question.questionId),
      ),
    );
  const optionsById = new Map(optionRows.map((option) => [option.id, option]));

  const answerRows = attemptQuestionRows.map((question) => {
    const selectedOptionId = String(formData.get(`answer_${question.id}`) ?? "");
    const selectedOption = optionsById.get(selectedOptionId);
    const isCorrect = Boolean(selectedOption?.isCorrect && selectedOption.questionId === question.questionId);

    return {
      attemptQuestionId: question.id,
      isCorrect,
      selectedOptionId: selectedOption?.questionId === question.questionId ? selectedOption.id : null,
      weight: question.weight,
    };
  });
  const result = calculateQuizScore(answerRows);
  const now = new Date();
  const progressStatus = result.score >= attempt.passingScore ? "verified" : "failed";

  await db.transaction(async (tx) => {
    await tx.delete(quizAnswers).where(
      inArray(
        quizAnswers.attemptQuestionId,
        answerRows.map((answer) => answer.attemptQuestionId),
      ),
    );

    await tx.insert(quizAnswers).values(
      answerRows.map((answer) => ({
        attemptQuestionId: answer.attemptQuestionId,
        isCorrect: answer.isCorrect,
        selectedOptionId: answer.selectedOptionId,
        weightAwarded: answer.isCorrect ? answer.weight : 0,
      })),
    );

    await tx
      .update(quizAttempts)
      .set({
        correctWeight: result.correctWeight,
        score: result.score,
        status: "submitted",
        submittedAt: now,
        totalWeight: result.totalWeight,
        updatedAt: now,
      })
      .where(eq(quizAttempts.id, parsed.data.attemptId));

    await tx
      .insert(grades)
      .values({
        classId: attempt.classId,
        maxScore: 100,
        score: result.score,
        sourceId: attempt.quizId,
        sourceType: attempt.quizType === "final" ? "final_exam" : "quiz",
        studentId: profile.id,
      })
      .onConflictDoUpdate({
        target: [grades.studentId, grades.sourceType, grades.sourceId],
        set: {
          score: result.score,
          updatedAt: now,
        },
      });

    if (attempt.stepId) {
      await tx
        .insert(moduleProgress)
        .values({
          classId: attempt.classId,
          moduleStepId: attempt.stepId,
          score: result.score,
          status: progressStatus,
          studentId: profile.id,
          submittedAt: now,
          verifiedAt: progressStatus === "verified" ? now : null,
        })
        .onConflictDoUpdate({
          target: [moduleProgress.moduleStepId, moduleProgress.studentId],
          set: {
            score: result.score,
            status: progressStatus,
            submittedAt: now,
            updatedAt: now,
            verifiedAt: progressStatus === "verified" ? now : null,
          },
        });
    }
  });

  await notifyUsers([
    {
      body: `Nilai ${attempt.quizType === "final" ? "final exam" : "kuis"} "${attempt.quizTitle}" sudah keluar: ${result.score}.`,
      entityId: parsed.data.attemptId,
      entityType: "quiz_attempts",
      recipientId: profile.id,
      title: attempt.quizType === "final" ? "Nilai final exam tersedia" : "Nilai kuis tersedia",
    },
    {
      body: `${profile.name} menyelesaikan ${attempt.quizType === "final" ? "final exam" : "kuis"} "${attempt.quizTitle}" dengan nilai ${result.score}.`,
      entityId: parsed.data.attemptId,
      entityType: "quiz_attempts",
      recipientId: attempt.lecturerId,
      title: attempt.quizType === "final" ? "Final exam selesai dikerjakan" : "Kuis selesai dikerjakan",
    },
  ]);

  await writeAuditLog({
    action: "quiz_attempts.submitted",
    entityId: parsed.data.attemptId,
    entityType: "quiz_attempts",
    metadata: {
      class_id: attempt.classId,
      quiz_id: attempt.quizId,
      score: result.score,
    },
  });

  await tryIssueEligibleCertificate(profile.id, attempt.classId);

  revalidatePath("/mahasiswa/dashboard");
  revalidatePath(classPath);
  invalidateClassDataCache({ classId: attempt.classId, lecturerId: attempt.lecturerId, studentId: profile.id });
  redirect(`/mahasiswa/quizzes/attempts/${parsed.data.attemptId}?submitted=1`);
}

export async function resetQuizAttemptAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z.object({ attemptId: z.uuid() }).safeParse({
    attemptId: formData.get("attemptId"),
  });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_quiz_attempt");
  }

  const attempt = await requireOwnedAttempt(parsed.data.attemptId, profile.id);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(quizAttempts)
      .set({
        correctWeight: 0,
        score: null,
        status: "reset",
        submittedAt: null,
        updatedAt: now,
        warningCount: 0,
      })
      .where(eq(quizAttempts.id, parsed.data.attemptId));

    await tx
      .delete(grades)
      .where(
        and(
          eq(grades.studentId, attempt.studentId),
          eq(grades.sourceId, attempt.quizId),
          eq(grades.sourceType, attempt.quizType === "final" ? "final_exam" : "quiz"),
        ),
      );
  });

  await notifyUsers([
    {
      body: `Kesempatan ulang untuk ${attempt.quizType === "final" ? "final exam" : "kuis"} "${attempt.quizTitle}" sudah dibuka oleh dosen.`,
      entityId: parsed.data.attemptId,
      entityType: "quiz_attempts",
      recipientId: attempt.studentId,
      title: "Retake dibuka",
    },
  ]);

  await writeAuditLog({
    action: "quiz_attempts.retake_opened",
    entityId: parsed.data.attemptId,
    entityType: "quiz_attempts",
    metadata: {
      class_id: attempt.classId,
      quiz_id: attempt.quizId,
      quiz_type: attempt.quizType,
    },
  });

  revalidatePath(`/mahasiswa/classes/${attempt.classId}`);
  invalidateClassDataCache({ classId: attempt.classId, lecturerId: profile.id, studentId: attempt.studentId });
  redirect(
    getDosenModuleQuizzesPath(
      { id: attempt.classId, title: attempt.classTitle },
      { id: attempt.moduleId, title: attempt.moduleTitle },
    ) + "?retake_opened=1",
  );
}

export async function recordExamModeEvent({
  attemptId,
  detail,
  eventType,
  studentId,
}: {
  attemptId: string;
  detail?: string | null;
  eventType: string;
  studentId: string;
}) {
  const attemptRows = await db
    .select({
      id: quizAttempts.id,
      status: quizAttempts.status,
      studentId: quizAttempts.studentId,
      warningCount: quizAttempts.warningCount,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, studentId)))
    .limit(1);
  const attempt = attemptRows[0] ?? null;

  if (!attempt || attempt.status !== "started") {
    return { reset: false, warningCount: attempt?.warningCount ?? 0 };
  }

  const nextWarningCount = attempt.warningCount + 1;
  const reset = nextWarningCount >= 3;

  await db.transaction(async (tx) => {
    await tx.insert(examModeEvents).values({
      attemptId,
      detail: detail ?? null,
      eventType,
      studentId,
    });

    await tx
      .update(quizAttempts)
      .set({
        status: reset ? "reset" : "started",
        updatedAt: new Date(),
        warningCount: nextWarningCount,
      })
      .where(eq(quizAttempts.id, attemptId));
  });

  return { reset, warningCount: nextWarningCount };
}
