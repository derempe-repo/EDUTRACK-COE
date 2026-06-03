import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";

import {
  assignments,
  auditLogs,
  certificates,
  classes,
  classMembers,
  examModeEvents,
  exports,
  grades,
  materialReads,
  materials,
  moduleProgress,
  modules,
  moduleSteps,
  notifications,
  plagiarismChecks,
  profiles,
  questionOptions,
  questions,
  quizAttempts,
  quizzes,
  submissions,
} from "@/db/schema";
import { getCertificateEligibility } from "@/features/certificates/eligibility";
import { calculateWeightedClassScore } from "@/features/grades/class-score";
import { db } from "@/lib/db";

type CountRow = {
  id: string;
  value: number;
};

const RECENT_EXAM_EVENT_LIMIT = 300;
export const MODULE_ATTEMPT_PAGE_SIZE = 30;
export const MODULE_SUBMISSION_PAGE_SIZE = 20;

function toCountMap(rows: CountRow[]) {
  return new Map(rows.map((row) => [row.id, Number(row.value)]));
}

async function getModuleCounts(classIds: string[]) {
  if (classIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .select({
      id: modules.classId,
      value: sql<number>`count(*)::int`,
    })
    .from(modules)
    .where(inArray(modules.classId, classIds))
    .groupBy(modules.classId);

  return toCountMap(rows);
}

async function getStudentCounts(classIds: string[]) {
  if (classIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .select({
      id: classMembers.classId,
      value: sql<number>`count(*)::int`,
    })
    .from(classMembers)
    .where(and(inArray(classMembers.classId, classIds), eq(classMembers.role, "student")))
    .groupBy(classMembers.classId);

  return toCountMap(rows);
}

export async function getDosenDashboardData(lecturerId: string) {
  const managedClasses = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      status: classes.status,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
    })
    .from(classes)
    .where(eq(classes.createdBy, lecturerId))
    .orderBy(desc(classes.updatedAt));

  const classIds = managedClasses.map((item) => item.id);
  const [moduleCounts, studentCounts, pendingReviewRows, pendingReviewCountRows] = await Promise.all([
    getModuleCounts(classIds),
    getStudentCounts(classIds),
    db
      .select({
        assignmentTitle: assignments.title,
        classId: classes.id,
        classTitle: classes.title,
        moduleId: modules.id,
        moduleTitle: modules.title,
        studentName: profiles.name,
        submissionId: submissions.id,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .innerJoin(classes, eq(classes.id, modules.classId))
      .innerJoin(profiles, eq(profiles.id, submissions.studentId))
      .where(
        and(
          eq(classes.createdBy, lecturerId),
          inArray(submissions.status, ["submitted", "under_review"]),
        ),
      )
      .orderBy(desc(submissions.submittedAt))
      .limit(5),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .innerJoin(classes, eq(classes.id, modules.classId))
      .where(
        and(
          eq(classes.createdBy, lecturerId),
          inArray(submissions.status, ["submitted", "under_review"]),
        ),
      ),
  ]);

  const classSummaries = managedClasses.map((item) => ({
    ...item,
    moduleCount: moduleCounts.get(item.id) ?? 0,
    studentCount: studentCounts.get(item.id) ?? 0,
  }));

  return {
    stats: {
      totalClasses: classSummaries.length,
      publishedClasses: classSummaries.filter((item) => item.status === "published").length,
      draftClasses: classSummaries.filter((item) => item.status === "draft").length,
      pendingReviews: Number(pendingReviewCountRows[0]?.value ?? 0),
      totalStudents: classSummaries.reduce((sum, item) => sum + item.studentCount, 0),
    },
    classes: classSummaries,
    pendingReviews: pendingReviewRows,
  };
}

export async function getDosenClassDetail(lecturerId: string, classId: string) {
  const classRows = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      status: classes.status,
      assignmentWeight: classes.assignmentWeight,
      quizWeight: classes.quizWeight,
      finalExamWeight: classes.finalExamWeight,
      publishedAt: classes.publishedAt,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
    })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  const classItem = classRows[0] ?? null;

  if (!classItem) {
    return null;
  }

  const [memberRows, moduleRows, stepRows] = await Promise.all([
    db
      .select({
        id: classMembers.id,
        profileId: classMembers.profileId,
        role: classMembers.role,
        profileName: profiles.name,
        profileEmail: profiles.email,
      })
      .from(classMembers)
      .innerJoin(profiles, eq(profiles.id, classMembers.profileId))
      .where(eq(classMembers.classId, classId))
      .orderBy(asc(classMembers.role), asc(profiles.name)),
    db
      .select()
      .from(modules)
      .where(eq(modules.classId, classId))
      .orderBy(asc(modules.sortOrder), asc(modules.createdAt)),
    db
      .select({
        id: moduleSteps.id,
        moduleId: moduleSteps.moduleId,
        title: moduleSteps.title,
        description: moduleSteps.description,
        sortOrder: moduleSteps.sortOrder,
        isRequired: moduleSteps.isRequired,
        createdAt: moduleSteps.createdAt,
        updatedAt: moduleSteps.updatedAt,
      })
      .from(moduleSteps)
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(eq(modules.classId, classId))
      .orderBy(asc(moduleSteps.sortOrder), asc(moduleSteps.createdAt)),
  ]);

  const [materialRows, certificateRows, exportRows] = await Promise.all([
    db
      .select({
        id: materials.id,
        moduleStepId: materials.moduleStepId,
        title: materials.title,
        type: materials.type,
        url: materials.url,
        storagePath: materials.storagePath,
        description: materials.description,
        sortOrder: materials.sortOrder,
        createdAt: materials.createdAt,
      })
      .from(materials)
      .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(eq(modules.classId, classId))
      .orderBy(asc(materials.sortOrder), asc(materials.createdAt)),
    db
      .select({
        certificateNumber: certificates.certificateNumber,
        eligibleAt: certificates.eligibleAt,
        id: certificates.id,
        issuedAt: certificates.issuedAt,
        revokedAt: certificates.revokedAt,
        status: certificates.status,
        studentEmail: profiles.email,
        studentId: certificates.studentId,
        studentName: profiles.name,
      })
      .from(certificates)
      .innerJoin(profiles, eq(profiles.id, certificates.studentId))
      .where(eq(certificates.classId, classId))
      .orderBy(desc(certificates.updatedAt)),
    db
      .select({
        completedAt: exports.completedAt,
        createdAt: exports.createdAt,
        fileName: exports.fileName,
        format: exports.format,
        id: exports.id,
        status: exports.status,
      })
      .from(exports)
      .where(eq(exports.classId, classId))
      .orderBy(desc(exports.createdAt))
      .limit(10),
  ]);

  const materialsByStep = new Map<string, typeof materialRows>();
  for (const material of materialRows) {
    const current = materialsByStep.get(material.moduleStepId) ?? [];
    current.push(material);
    materialsByStep.set(material.moduleStepId, current);
  }

  const stepsByModule = new Map<
    string,
    Array<(typeof stepRows)[number] & { materials: typeof materialRows }>
  >();
  for (const step of stepRows) {
    const current = stepsByModule.get(step.moduleId) ?? [];
    current.push({
      ...step,
      materials: materialsByStep.get(step.id) ?? [],
    });
    stepsByModule.set(step.moduleId, current);
  }

  return {
    certificates: certificateRows,
    classItem,
    exports: exportRows,
    members: memberRows,
    modules: moduleRows.map((moduleItem) => ({
      ...moduleItem,
      steps: stepsByModule.get(moduleItem.id) ?? [],
    })),
  };
}

export async function getDosenModuleDetail(
  lecturerId: string,
  classId: string,
  moduleId: string,
) {
  const moduleRows = await db
    .select({
      classItem: {
        id: classes.id,
        title: classes.title,
        description: classes.description,
        status: classes.status,
      },
      moduleItem: {
        id: modules.id,
        classId: modules.classId,
        title: modules.title,
        description: modules.description,
        sortOrder: modules.sortOrder,
        isLocked: modules.isLocked,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt,
      },
    })
    .from(modules)
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(classes.id, classId), eq(classes.createdBy, lecturerId), eq(modules.id, moduleId)))
    .limit(1);

  const row = moduleRows[0] ?? null;

  if (!row) {
    return null;
  }

  const [stepRows, materialRows, assignmentRows] = await Promise.all([
    db
      .select({
        id: moduleSteps.id,
        moduleId: moduleSteps.moduleId,
        title: moduleSteps.title,
        description: moduleSteps.description,
        sortOrder: moduleSteps.sortOrder,
        isRequired: moduleSteps.isRequired,
        createdAt: moduleSteps.createdAt,
        updatedAt: moduleSteps.updatedAt,
      })
      .from(moduleSteps)
      .where(eq(moduleSteps.moduleId, moduleId))
      .orderBy(asc(moduleSteps.sortOrder), asc(moduleSteps.createdAt)),
    db
      .select({
        id: materials.id,
        moduleStepId: materials.moduleStepId,
        title: materials.title,
        type: materials.type,
        url: materials.url,
        storagePath: materials.storagePath,
        description: materials.description,
        sortOrder: materials.sortOrder,
        createdAt: materials.createdAt,
      })
      .from(materials)
      .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
      .where(eq(moduleSteps.moduleId, moduleId))
      .orderBy(asc(materials.sortOrder), asc(materials.createdAt)),
    db
      .select({
        id: assignments.id,
        moduleStepId: assignments.moduleStepId,
        title: assignments.title,
        description: assignments.description,
        attachmentFileName: assignments.attachmentFileName,
        attachmentFileSize: assignments.attachmentFileSize,
        attachmentMimeType: assignments.attachmentMimeType,
        attachmentStoragePath: assignments.attachmentStoragePath,
        dueAt: assignments.dueAt,
        maxScore: assignments.maxScore,
        isActive: assignments.isActive,
        createdAt: assignments.createdAt,
      })
      .from(assignments)
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .where(eq(moduleSteps.moduleId, moduleId))
      .orderBy(asc(assignments.dueAt), asc(assignments.createdAt)),
  ]);

  const [quizRows, finalExamRows, questionRows, optionRows] = await Promise.all([
    db
      .select({
        id: quizzes.id,
        moduleStepId: quizzes.moduleStepId,
        title: quizzes.title,
        description: quizzes.description,
        durationMinutes: quizzes.durationMinutes,
        questionCount: quizzes.questionCount,
        passingScore: quizzes.passingScore,
        isActive: quizzes.isActive,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
      .where(
        and(
          eq(moduleSteps.moduleId, moduleId),
          eq(quizzes.quizType, "step"),
        ),
      )
      .orderBy(asc(quizzes.createdAt)),
    db
      .select({
        id: quizzes.id,
        moduleId: quizzes.moduleId,
        title: quizzes.title,
        description: quizzes.description,
        durationMinutes: quizzes.durationMinutes,
        questionCount: quizzes.questionCount,
        passingScore: quizzes.passingScore,
        isActive: quizzes.isActive,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .where(and(eq(quizzes.moduleId, moduleId), eq(quizzes.quizType, "final")))
      .orderBy(asc(quizzes.createdAt)),
    db
      .select({
        id: questions.id,
        moduleStepId: questions.moduleStepId,
        questionText: questions.questionText,
        difficulty: questions.difficulty,
        weight: questions.weight,
        isActive: questions.isActive,
        createdAt: questions.createdAt,
      })
      .from(questions)
      .innerJoin(moduleSteps, eq(moduleSteps.id, questions.moduleStepId))
      .where(eq(moduleSteps.moduleId, moduleId))
      .orderBy(asc(questions.createdAt)),
    db
      .select({
        id: questionOptions.id,
        questionId: questionOptions.questionId,
        label: questionOptions.label,
        optionText: questionOptions.optionText,
        isCorrect: questionOptions.isCorrect,
        sortOrder: questionOptions.sortOrder,
      })
      .from(questionOptions)
      .innerJoin(questions, eq(questions.id, questionOptions.questionId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, questions.moduleStepId))
      .where(eq(moduleSteps.moduleId, moduleId))
      .orderBy(asc(questionOptions.sortOrder)),
  ]);

  const attemptSummaryRows = await db
    .select({
      quizId: quizAttempts.quizId,
      value: sql<number>`count(*)::int`,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .leftJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
    .where(
      or(
        and(eq(moduleSteps.moduleId, moduleId), eq(quizzes.quizType, "step")),
        and(eq(quizzes.moduleId, moduleId), eq(quizzes.quizType, "final")),
      ),
    )
    .groupBy(quizAttempts.quizId);
  const attemptCountByQuiz = new Map(
    attemptSummaryRows.map((item) => [item.quizId, Number(item.value)]),
  );

  const materialsByStep = new Map<string, typeof materialRows>();
  for (const material of materialRows) {
    const current = materialsByStep.get(material.moduleStepId) ?? [];
    current.push(material);
    materialsByStep.set(material.moduleStepId, current);
  }

  const assignmentsByStep = new Map<string, typeof assignmentRows>();
  for (const assignment of assignmentRows) {
    const current = assignmentsByStep.get(assignment.moduleStepId) ?? [];
    current.push(assignment);
    assignmentsByStep.set(assignment.moduleStepId, current);
  }

  const optionsByQuestion = new Map<string, typeof optionRows>();
  for (const option of optionRows) {
    const current = optionsByQuestion.get(option.questionId) ?? [];
    current.push(option);
    optionsByQuestion.set(option.questionId, current);
  }

  const questionsByStep = new Map<
    string,
    Array<(typeof questionRows)[number] & { options: typeof optionRows }>
  >();
  for (const question of questionRows) {
    const current = questionsByStep.get(question.moduleStepId) ?? [];
    current.push({
      ...question,
      options: optionsByQuestion.get(question.id) ?? [],
    });
    questionsByStep.set(question.moduleStepId, current);
  }

  const quizzesByStep = new Map<
    string,
    Array<(typeof quizRows)[number] & { attemptCount: number }>
  >();
  for (const quiz of quizRows) {
    if (!quiz.moduleStepId) {
      continue;
    }

    const current = quizzesByStep.get(quiz.moduleStepId) ?? [];
    current.push({
      ...quiz,
      attemptCount: attemptCountByQuiz.get(quiz.id) ?? 0,
    });
    quizzesByStep.set(quiz.moduleStepId, current);
  }

  return {
    classItem: row.classItem,
    moduleItem: {
      ...row.moduleItem,
      finalExam: finalExamRows[0]
        ? {
            ...finalExamRows[0],
            attemptCount: attemptCountByQuiz.get(finalExamRows[0].id) ?? 0,
          }
        : null,
      totalAttemptCount: [...attemptCountByQuiz.values()].reduce((sum, value) => sum + value, 0),
      steps: stepRows.map((step) => ({
        ...step,
        materials: materialsByStep.get(step.id) ?? [],
        assignments: assignmentsByStep.get(step.id) ?? [],
        quizzes: quizzesByStep.get(step.id) ?? [],
        questions: questionsByStep.get(step.id) ?? [],
      })),
    },
  };
}

export async function getDosenQuizAttemptsDetail(
  lecturerId: string,
  classId: string,
  moduleId: string,
  quizId: string,
  options?: { page?: number },
) {
  const page = options?.page && options.page > 0 ? options.page : 1;
  const quizRows = await db
    .select({
      classItem: {
        id: classes.id,
        title: classes.title,
        description: classes.description,
        status: classes.status,
      },
      moduleItem: {
        id: modules.id,
        classId: modules.classId,
        title: modules.title,
        description: modules.description,
        sortOrder: modules.sortOrder,
        isLocked: modules.isLocked,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt,
      },
      quizItem: {
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        durationMinutes: quizzes.durationMinutes,
        questionCount: quizzes.questionCount,
        passingScore: quizzes.passingScore,
        isActive: quizzes.isActive,
        quizType: quizzes.quizType,
      },
      stepItem: {
        id: moduleSteps.id,
        title: moduleSteps.title,
        sortOrder: moduleSteps.sortOrder,
      },
    })
    .from(quizzes)
    .leftJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
    .innerJoin(modules, sql`${modules.id} = coalesce(${moduleSteps.moduleId}, ${quizzes.moduleId})`)
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(
      and(
        eq(classes.id, classId),
        eq(classes.createdBy, lecturerId),
        eq(modules.id, moduleId),
        eq(quizzes.id, quizId),
      ),
    )
    .limit(1);

  const row = quizRows[0] ?? null;
  if (!row) {
    return null;
  }

  const [attemptRows, countRows] = await Promise.all([
    db
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        studentName: profiles.name,
        studentEmail: profiles.email,
        status: quizAttempts.status,
        score: quizAttempts.score,
        warningCount: quizAttempts.warningCount,
        startedAt: quizAttempts.startedAt,
        submittedAt: quizAttempts.submittedAt,
      })
      .from(quizAttempts)
      .innerJoin(profiles, eq(profiles.id, quizAttempts.studentId))
      .where(eq(quizAttempts.quizId, quizId))
      .orderBy(desc(quizAttempts.startedAt))
      .limit(MODULE_ATTEMPT_PAGE_SIZE)
      .offset((page - 1) * MODULE_ATTEMPT_PAGE_SIZE),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(quizAttempts)
      .where(eq(quizAttempts.quizId, quizId)),
  ]);
  const allAttemptIds = attemptRows.map((attempt) => attempt.id);
  const examEventRows =
    allAttemptIds.length > 0
      ? await db
          .select({
            attemptId: examModeEvents.attemptId,
            createdAt: examModeEvents.createdAt,
            detail: examModeEvents.detail,
            eventType: examModeEvents.eventType,
            id: examModeEvents.id,
          })
          .from(examModeEvents)
          .where(inArray(examModeEvents.attemptId, allAttemptIds))
          .orderBy(desc(examModeEvents.createdAt))
          .limit(RECENT_EXAM_EVENT_LIMIT)
      : [];
  const eventsByAttempt = new Map<string, typeof examEventRows>();
  for (const event of examEventRows) {
    const current = eventsByAttempt.get(event.attemptId) ?? [];
    current.push(event);
    eventsByAttempt.set(event.attemptId, current);
  }

  const attemptsWithEvents = attemptRows.map((attempt) => ({
    ...attempt,
    events: eventsByAttempt.get(attempt.id) ?? [],
  }));

  return {
    classItem: row.classItem,
    moduleItem: row.moduleItem,
    pagination: {
      page,
      pageSize: MODULE_ATTEMPT_PAGE_SIZE,
      totalItems: Number(countRows[0]?.value ?? 0),
    },
    quizItem: row.quizItem,
    stepItem: row.stepItem?.id ? row.stepItem : null,
    attempts: attemptsWithEvents,
  };
}

export async function getDosenModuleLearningDetail(
  lecturerId: string,
  classId: string,
  moduleId: string,
) {
  const moduleRows = await db
    .select({
      classItem: {
        id: classes.id,
        title: classes.title,
        description: classes.description,
        status: classes.status,
      },
      moduleItem: {
        id: modules.id,
        classId: modules.classId,
        title: modules.title,
        description: modules.description,
        sortOrder: modules.sortOrder,
        isLocked: modules.isLocked,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt,
      },
    })
    .from(modules)
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(classes.id, classId), eq(classes.createdBy, lecturerId), eq(modules.id, moduleId)))
    .limit(1);

  const row = moduleRows[0] ?? null;

  if (!row) {
    return null;
  }

  const [stepRows, materialRows, assignmentRows, quizRows] = await Promise.all([
    db
      .select({
        id: moduleSteps.id,
        moduleId: moduleSteps.moduleId,
        title: moduleSteps.title,
        description: moduleSteps.description,
        sortOrder: moduleSteps.sortOrder,
        isRequired: moduleSteps.isRequired,
        createdAt: moduleSteps.createdAt,
        updatedAt: moduleSteps.updatedAt,
      })
      .from(moduleSteps)
      .where(eq(moduleSteps.moduleId, moduleId))
      .orderBy(asc(moduleSteps.sortOrder), asc(moduleSteps.createdAt)),
    db
      .select({
        id: materials.id,
        moduleStepId: materials.moduleStepId,
        title: materials.title,
        type: materials.type,
        url: materials.url,
        storagePath: materials.storagePath,
        description: materials.description,
        sortOrder: materials.sortOrder,
        createdAt: materials.createdAt,
      })
      .from(materials)
      .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
      .where(eq(moduleSteps.moduleId, moduleId))
      .orderBy(asc(materials.sortOrder), asc(materials.createdAt)),
    db
      .select({
        id: assignments.id,
        moduleStepId: assignments.moduleStepId,
      })
      .from(assignments)
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .where(eq(moduleSteps.moduleId, moduleId)),
    db
      .select({
        id: quizzes.id,
        moduleStepId: quizzes.moduleStepId,
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
  ]);

  const materialsByStep = new Map<string, typeof materialRows>();
  for (const material of materialRows) {
    const current = materialsByStep.get(material.moduleStepId) ?? [];
    current.push(material);
    materialsByStep.set(material.moduleStepId, current);
  }

  const assignmentCountByStep = new Map<string, number>();
  for (const assignment of assignmentRows) {
    assignmentCountByStep.set(
      assignment.moduleStepId,
      (assignmentCountByStep.get(assignment.moduleStepId) ?? 0) + 1,
    );
  }

  const quizCountByStep = new Map<string, number>();
  for (const quiz of quizRows) {
    if (!quiz.moduleStepId) {
      continue;
    }

    quizCountByStep.set(quiz.moduleStepId, (quizCountByStep.get(quiz.moduleStepId) ?? 0) + 1);
  }

  return {
    classItem: row.classItem,
    moduleItem: {
      ...row.moduleItem,
      steps: stepRows.map((step) => ({
        ...step,
        assignmentCount: assignmentCountByStep.get(step.id) ?? 0,
        materials: materialsByStep.get(step.id) ?? [],
        quizCount: quizCountByStep.get(step.id) ?? 0,
      })),
    },
  };
}

export async function getDosenModuleAssignmentsDetail(
  lecturerId: string,
  classId: string,
  moduleId: string,
) {
  const moduleRows = await db
    .select({
      classItem: {
        id: classes.id,
        title: classes.title,
        description: classes.description,
        status: classes.status,
      },
      moduleItem: {
        id: modules.id,
        classId: modules.classId,
        title: modules.title,
        description: modules.description,
        sortOrder: modules.sortOrder,
        isLocked: modules.isLocked,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt,
      },
    })
    .from(modules)
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(classes.id, classId), eq(classes.createdBy, lecturerId), eq(modules.id, moduleId)))
    .limit(1);

  const row = moduleRows[0] ?? null;

  if (!row) {
    return null;
  }

  const [stepRows, assignmentRows, submissionSummaryRows] = await Promise.all([
    db
      .select({
        id: moduleSteps.id,
        moduleId: moduleSteps.moduleId,
        title: moduleSteps.title,
        description: moduleSteps.description,
        sortOrder: moduleSteps.sortOrder,
        isRequired: moduleSteps.isRequired,
        createdAt: moduleSteps.createdAt,
        updatedAt: moduleSteps.updatedAt,
      })
      .from(moduleSteps)
      .where(eq(moduleSteps.moduleId, moduleId))
      .orderBy(asc(moduleSteps.sortOrder), asc(moduleSteps.createdAt)),
    db
      .select({
        id: assignments.id,
        moduleStepId: assignments.moduleStepId,
        title: assignments.title,
        description: assignments.description,
        attachmentFileName: assignments.attachmentFileName,
        attachmentFileSize: assignments.attachmentFileSize,
        attachmentMimeType: assignments.attachmentMimeType,
        attachmentStoragePath: assignments.attachmentStoragePath,
        dueAt: assignments.dueAt,
        maxScore: assignments.maxScore,
        isActive: assignments.isActive,
        createdAt: assignments.createdAt,
      })
      .from(assignments)
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .where(eq(moduleSteps.moduleId, moduleId))
      .orderBy(asc(assignments.dueAt), asc(assignments.createdAt)),
    db
      .select({
        assignmentId: submissions.assignmentId,
        status: submissions.status,
        plagiarismStatus: submissions.plagiarismStatus,
        value: sql<number>`count(*)::int`,
      })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .where(eq(moduleSteps.moduleId, moduleId))
      .groupBy(submissions.assignmentId, submissions.status, submissions.plagiarismStatus),
  ]);

  const submissionSummaryByAssignment = new Map<
    string,
    {
      accepted: number;
      flagged: number;
      pendingReview: number;
      rejected: number;
      total: number;
    }
  >();
  for (const row of submissionSummaryRows) {
    const current = submissionSummaryByAssignment.get(row.assignmentId) ?? {
      accepted: 0,
      flagged: 0,
      pendingReview: 0,
      rejected: 0,
      total: 0,
    };
    const value = Number(row.value);
    current.total += value;
    if (row.status === "accepted") {
      current.accepted += value;
    }
    if (row.status === "rejected" || row.status === "resubmit_allowed") {
      current.rejected += value;
    }
    if (row.status === "submitted" || row.status === "under_review") {
      current.pendingReview += value;
    }
    if (row.plagiarismStatus === "flagged") {
      current.flagged += value;
    }
    submissionSummaryByAssignment.set(row.assignmentId, current);
  }

  const assignmentsByStep = new Map<
    string,
    Array<
      (typeof assignmentRows)[number] & {
        submissionSummary: {
          accepted: number;
          flagged: number;
          pendingReview: number;
          rejected: number;
          total: number;
        };
      }
    >
  >();
  for (const assignment of assignmentRows) {
    const current = assignmentsByStep.get(assignment.moduleStepId) ?? [];
    current.push({
      ...assignment,
      submissionSummary: submissionSummaryByAssignment.get(assignment.id) ?? {
        accepted: 0,
        flagged: 0,
        pendingReview: 0,
        rejected: 0,
        total: 0,
      },
    });
    assignmentsByStep.set(assignment.moduleStepId, current);
  }

  return {
    classItem: row.classItem,
    moduleItem: {
      ...row.moduleItem,
      totalSubmissionCount: [...submissionSummaryByAssignment.values()].reduce(
        (sum, item) => sum + item.total,
        0,
      ),
      steps: stepRows.map((step) => ({
        ...step,
        assignments: assignmentsByStep.get(step.id) ?? [],
      })),
    },
  };
}

export async function getDosenAssignmentSubmissionsDetail(
  lecturerId: string,
  classId: string,
  moduleId: string,
  assignmentId: string,
  options?: { page?: number },
) {
  const page = options?.page && options.page > 0 ? options.page : 1;
  const assignmentRows = await db
    .select({
      assignmentItem: {
        id: assignments.id,
        moduleStepId: assignments.moduleStepId,
        title: assignments.title,
        description: assignments.description,
        attachmentFileName: assignments.attachmentFileName,
        attachmentFileSize: assignments.attachmentFileSize,
        attachmentMimeType: assignments.attachmentMimeType,
        attachmentStoragePath: assignments.attachmentStoragePath,
        dueAt: assignments.dueAt,
        maxScore: assignments.maxScore,
        isActive: assignments.isActive,
        createdAt: assignments.createdAt,
      },
      classItem: {
        id: classes.id,
        title: classes.title,
        description: classes.description,
        status: classes.status,
      },
      moduleItem: {
        id: modules.id,
        classId: modules.classId,
        title: modules.title,
        description: modules.description,
        sortOrder: modules.sortOrder,
        isLocked: modules.isLocked,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt,
      },
      stepItem: {
        id: moduleSteps.id,
        title: moduleSteps.title,
        sortOrder: moduleSteps.sortOrder,
      },
    })
    .from(assignments)
    .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(
      and(
        eq(classes.id, classId),
        eq(classes.createdBy, lecturerId),
        eq(modules.id, moduleId),
        eq(assignments.id, assignmentId),
      ),
    )
    .limit(1);

  const row = assignmentRows[0] ?? null;
  if (!row) {
    return null;
  }

  const [submissionRows, countRows] = await Promise.all([
    db
      .select({
        id: submissions.id,
        assignmentId: submissions.assignmentId,
        studentId: submissions.studentId,
        studentName: profiles.name,
        studentEmail: profiles.email,
        status: submissions.status,
        fileName: submissions.fileName,
        score: submissions.score,
        feedback: submissions.feedback,
        note: submissions.note,
        plagiarismStatus: submissions.plagiarismStatus,
        plagiarismCheckId: plagiarismChecks.id,
        similarityScore: plagiarismChecks.similarityScore,
        thresholdPercent: plagiarismChecks.thresholdPercent,
        extractionStatus: plagiarismChecks.extractionStatus,
        submittedAt: submissions.submittedAt,
        reviewedAt: submissions.reviewedAt,
      })
      .from(submissions)
      .innerJoin(profiles, eq(profiles.id, submissions.studentId))
      .leftJoin(plagiarismChecks, eq(plagiarismChecks.submissionId, submissions.id))
      .where(eq(submissions.assignmentId, assignmentId))
      .orderBy(desc(submissions.submittedAt))
      .limit(MODULE_SUBMISSION_PAGE_SIZE)
      .offset((page - 1) * MODULE_SUBMISSION_PAGE_SIZE),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(submissions)
      .where(eq(submissions.assignmentId, assignmentId)),
  ]);

  return {
    assignmentItem: row.assignmentItem,
    classItem: row.classItem,
    moduleItem: row.moduleItem,
    pagination: {
      page,
      pageSize: MODULE_SUBMISSION_PAGE_SIZE,
      totalItems: Number(countRows[0]?.value ?? 0),
    },
    stepItem: row.stepItem,
    submissions: submissionRows,
  };
}

export async function getMahasiswaDashboardData(studentId: string) {
  const enrolledClasses = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      status: classes.status,
      assignmentWeight: classes.assignmentWeight,
      quizWeight: classes.quizWeight,
      finalExamWeight: classes.finalExamWeight,
      joinedAt: classMembers.joinedAt,
    })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.profileId, studentId),
        eq(classMembers.role, "student"),
        eq(classes.status, "published"),
      ),
    )
    .orderBy(desc(classMembers.joinedAt));

  const classIds = enrolledClasses.map((item) => item.id);
  const [moduleCounts, notificationRows] = await Promise.all([
    getModuleCounts(classIds),
    db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        status: notifications.status,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.recipientId, studentId))
      .orderBy(desc(notifications.createdAt))
      .limit(5),
  ]);

  let activeModules: Array<{
    classId: string;
    classTitle: string;
    description: string | null;
    id: string;
    isLocked: boolean;
    title: string;
  }> = [];
  let materialRows: Array<{ classId: string; id: string }> = [];
  let materialReadRows: Array<{ classId: string; materialId: string }> = [];
  let assignmentRows: Array<{ classId: string; id: string }> = [];
  let acceptedSubmissionRows: Array<{
    assignmentId: string;
    classId: string;
    maxScore: number;
    score: number | null;
  }> = [];
  let quizRows: Array<{ classId: string; id: string; passingScore: number }> = [];
  let quizAttemptRows: Array<{
    classId: string;
    quizId: string;
    score: number | null;
    status: "started" | "submitted" | "reset" | "expired";
  }> = [];
  let gradeRows: Array<{ classId: string; maxScore: number; score: number; sourceType: string }> = [];

  if (classIds.length > 0) {
    [activeModules, materialRows, materialReadRows, assignmentRows] = await Promise.all([
          db
            .select({
              id: modules.id,
              title: modules.title,
              description: modules.description,
              isLocked: modules.isLocked,
              classId: modules.classId,
              classTitle: classes.title,
            })
            .from(modules)
            .innerJoin(classes, eq(classes.id, modules.classId))
            .where(
              and(
                inArray(modules.classId, classIds),
                eq(modules.isLocked, false),
                eq(classes.status, "published"),
              ),
            )
            .orderBy(asc(modules.sortOrder), asc(modules.createdAt)),
          db
            .select({ classId: modules.classId, id: materials.id })
            .from(materials)
            .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
            .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
            .where(and(inArray(modules.classId, classIds), eq(modules.isLocked, false))),
          db
            .select({ classId: modules.classId, materialId: materialReads.materialId })
            .from(materialReads)
            .innerJoin(materials, eq(materials.id, materialReads.materialId))
            .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
            .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
            .where(
              and(
                inArray(modules.classId, classIds),
                eq(modules.isLocked, false),
                eq(materialReads.studentId, studentId),
              ),
            ),
          db
            .select({ classId: modules.classId, id: assignments.id })
            .from(assignments)
            .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
            .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
            .where(
              and(
                inArray(modules.classId, classIds),
                eq(modules.isLocked, false),
                eq(assignments.isActive, true),
              ),
            ),
    ]);

    [acceptedSubmissionRows, quizRows, quizAttemptRows, gradeRows] = await Promise.all([
      db
        .select({
          assignmentId: submissions.assignmentId,
          classId: modules.classId,
          maxScore: assignments.maxScore,
          score: submissions.score,
        })
        .from(submissions)
        .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
        .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
        .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
        .where(
          and(
            inArray(modules.classId, classIds),
            eq(modules.isLocked, false),
            eq(submissions.studentId, studentId),
            eq(submissions.status, "accepted"),
          ),
        ),
      db
        .select({
          classId: modules.classId,
          id: quizzes.id,
          passingScore: quizzes.passingScore,
        })
        .from(quizzes)
        .leftJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
        .innerJoin(
          modules,
          sql`${modules.id} = coalesce(${moduleSteps.moduleId}, ${quizzes.moduleId})`,
        )
        .where(
          and(
            inArray(modules.classId, classIds),
            eq(modules.isLocked, false),
            eq(quizzes.isActive, true),
          ),
        ),
      db
        .select({
          classId: modules.classId,
          quizId: quizAttempts.quizId,
          score: quizAttempts.score,
          status: quizAttempts.status,
        })
        .from(quizAttempts)
        .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
        .leftJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
        .innerJoin(
          modules,
          sql`${modules.id} = coalesce(${moduleSteps.moduleId}, ${quizzes.moduleId})`,
        )
        .where(
          and(
            inArray(modules.classId, classIds),
            eq(modules.isLocked, false),
            eq(quizAttempts.studentId, studentId),
          ),
        ),
      db
        .select({
          classId: grades.classId,
          maxScore: grades.maxScore,
          score: grades.score,
          sourceType: grades.sourceType,
        })
        .from(grades)
        .where(eq(grades.studentId, studentId)),
    ]);
  }

  const progressByClass = new Map<
    string,
    { completed: number; failed: number; submitted: number; total: number; verified: number }
  >();
  const ensureClassProgress = (classId: string) => {
    const current = progressByClass.get(classId) ?? {
      completed: 0,
      failed: 0,
      submitted: 0,
      total: 0,
      verified: 0,
    };
    progressByClass.set(classId, current);
    return current;
  };

  for (const item of [...materialRows, ...assignmentRows, ...quizRows]) {
    const current = ensureClassProgress(item.classId);
    current.total += 1;
  }

  const readMaterialIds = new Set(materialReadRows.map((read) => read.materialId));
  for (const material of materialRows) {
    if (!readMaterialIds.has(material.id)) {
      continue;
    }
    const current = ensureClassProgress(material.classId);
    current.completed += 1;
    current.verified += 1;
  }

  const acceptedAssignmentIds = new Set(acceptedSubmissionRows.map((submission) => submission.assignmentId));
  for (const assignment of assignmentRows) {
    if (!acceptedAssignmentIds.has(assignment.id)) {
      continue;
    }
    const current = ensureClassProgress(assignment.classId);
    current.completed += 1;
    current.verified += 1;
  }

  const attemptsByQuiz = new Map<string, typeof quizAttemptRows>();
  for (const attempt of quizAttemptRows) {
    const current = attemptsByQuiz.get(attempt.quizId) ?? [];
    current.push(attempt);
    attemptsByQuiz.set(attempt.quizId, current);
  }
  for (const quiz of quizRows) {
    const quizAttemptsForStudent = attemptsByQuiz.get(quiz.id) ?? [];
    const current = ensureClassProgress(quiz.classId);
    const hasPassed = quizAttemptsForStudent.some(
      (attempt) => attempt.status === "submitted" && (attempt.score ?? 0) >= quiz.passingScore,
    );
    const hasSubmitted = quizAttemptsForStudent.some((attempt) => attempt.status === "submitted");
    const hasFailed = quizAttemptsForStudent.some(
      (attempt) => attempt.status === "submitted" && (attempt.score ?? 0) < quiz.passingScore,
    );

    if (hasPassed) {
      current.completed += 1;
      current.verified += 1;
    } else if (hasSubmitted) {
      current.submitted += 1;
    } else if (hasFailed) {
      current.failed += 1;
    }
  }

  const totalProgressPercent =
    [...progressByClass.values()].reduce((sum, item) => sum + item.total, 0) > 0
      ? Math.round(
          ([...progressByClass.values()].reduce((sum, item) => sum + item.completed, 0) /
            [...progressByClass.values()].reduce((sum, item) => sum + item.total, 0)) *
            100,
        )
      : 0;
  const classScores = enrolledClasses.map((classItem) =>
    calculateWeightedClassScore({
      assignmentScores: acceptedSubmissionRows
        .filter((submission) => submission.classId === classItem.id && submission.score !== null)
        .map((submission) => ({ maxScore: submission.maxScore, score: Number(submission.score) })),
      assignmentWeight: classItem.assignmentWeight,
      finalExamScores: gradeRows
        .filter((grade) => grade.classId === classItem.id && grade.sourceType === "final_exam")
        .map((grade) => ({ maxScore: grade.maxScore, score: grade.score })),
      finalExamWeight: classItem.finalExamWeight,
      quizScores: gradeRows
        .filter((grade) => grade.classId === classItem.id && grade.sourceType === "quiz")
        .map((grade) => ({ maxScore: grade.maxScore, score: grade.score })),
      quizWeight: classItem.quizWeight,
    }),
  );
  const averageScore =
    classScores.length > 0
      ? Math.round(classScores.reduce((sum, score) => sum + score.finalScore, 0) / classScores.length)
      : 0;

  return {
    stats: {
      totalProgressPercent,
      averageScore,
      badgesCount: Math.floor([...progressByClass.values()].reduce((sum, item) => sum + item.completed, 0) / 3),
      gamificationPoints: [...progressByClass.values()].reduce((sum, item) => sum + item.completed, 0) * 10,
      activeModulesCount: activeModules.length,
    },
    classes: enrolledClasses.map((item) => ({
      ...item,
      moduleCount: moduleCounts.get(item.id) ?? 0,
      progress: {
        failed: progressByClass.get(item.id)?.failed ?? 0,
        percent:
          (progressByClass.get(item.id)?.total ?? 0) > 0
            ? Math.round(
                ((progressByClass.get(item.id)?.completed ?? 0) /
                  (progressByClass.get(item.id)?.total ?? 1)) *
                  100,
              )
            : 0,
        submitted: progressByClass.get(item.id)?.submitted ?? 0,
        total: progressByClass.get(item.id)?.total ?? 0,
        verified: progressByClass.get(item.id)?.verified ?? 0,
      },
    })),
    activeModules,
    notifications: notificationRows,
  };
}

export async function getMahasiswaClassDetail(studentId: string, classId: string) {
  const classRows = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      status: classes.status,
      joinedAt: classMembers.joinedAt,
      lecturerName: profiles.name,
    })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .innerJoin(profiles, eq(profiles.id, classes.createdBy))
    .where(
      and(
        eq(classMembers.profileId, studentId),
        eq(classMembers.role, "student"),
        eq(classes.id, classId),
        eq(classes.status, "published"),
      ),
    )
    .limit(1);

  const classItem = classRows[0] ?? null;

  if (!classItem) {
    return null;
  }

  const [moduleRows, stepRows, materialRows, materialReadRows] = await Promise.all([
    db
      .select({
        id: modules.id,
        classId: modules.classId,
        title: modules.title,
        description: modules.description,
        sortOrder: modules.sortOrder,
        isLocked: modules.isLocked,
        createdAt: modules.createdAt,
      })
      .from(modules)
      .where(eq(modules.classId, classId))
      .orderBy(asc(modules.sortOrder), asc(modules.createdAt)),
    db
      .select({
        id: moduleSteps.id,
        moduleId: moduleSteps.moduleId,
        title: moduleSteps.title,
        description: moduleSteps.description,
        sortOrder: moduleSteps.sortOrder,
        isRequired: moduleSteps.isRequired,
        createdAt: moduleSteps.createdAt,
      })
      .from(moduleSteps)
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(and(eq(modules.classId, classId), eq(modules.isLocked, false)))
      .orderBy(asc(moduleSteps.sortOrder), asc(moduleSteps.createdAt)),
    db
      .select({
        id: materials.id,
        moduleStepId: materials.moduleStepId,
        title: materials.title,
        type: materials.type,
        url: materials.url,
        storagePath: materials.storagePath,
        description: materials.description,
        sortOrder: materials.sortOrder,
        createdAt: materials.createdAt,
      })
      .from(materials)
      .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(and(eq(modules.classId, classId), eq(modules.isLocked, false)))
      .orderBy(asc(materials.sortOrder), asc(materials.createdAt)),
    db
      .select({
        materialId: materialReads.materialId,
        readAt: materialReads.readAt,
      })
      .from(materialReads)
      .innerJoin(materials, eq(materials.id, materialReads.materialId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, materials.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(
        and(
          eq(modules.classId, classId),
          eq(modules.isLocked, false),
          eq(materialReads.studentId, studentId),
        ),
      ),
  ]);

  const [assignmentRows, submissionRows, progressRows] = await Promise.all([
    db
      .select({
        id: assignments.id,
        moduleStepId: assignments.moduleStepId,
        title: assignments.title,
        description: assignments.description,
        attachmentFileName: assignments.attachmentFileName,
        attachmentFileSize: assignments.attachmentFileSize,
        attachmentMimeType: assignments.attachmentMimeType,
        attachmentStoragePath: assignments.attachmentStoragePath,
        dueAt: assignments.dueAt,
        maxScore: assignments.maxScore,
        isActive: assignments.isActive,
        createdAt: assignments.createdAt,
      })
      .from(assignments)
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(
        and(
          eq(modules.classId, classId),
          eq(modules.isLocked, false),
          eq(assignments.isActive, true),
        ),
      )
      .orderBy(asc(assignments.dueAt), asc(assignments.createdAt)),
    db
      .select({
        id: submissions.id,
        assignmentId: submissions.assignmentId,
        status: submissions.status,
        fileName: submissions.fileName,
        note: submissions.note,
        score: submissions.score,
        feedback: submissions.feedback,
        plagiarismStatus: submissions.plagiarismStatus,
        submittedAt: submissions.submittedAt,
        reviewedAt: submissions.reviewedAt,
      })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(
        and(
          eq(modules.classId, classId),
          eq(modules.isLocked, false),
          eq(submissions.studentId, studentId),
        ),
      ),
    db
      .select({
        moduleStepId: moduleProgress.moduleStepId,
        score: moduleProgress.score,
        status: moduleProgress.status,
        submittedAt: moduleProgress.submittedAt,
        verifiedAt: moduleProgress.verifiedAt,
      })
      .from(moduleProgress)
      .where(and(eq(moduleProgress.classId, classId), eq(moduleProgress.studentId, studentId))),
  ]);

  const [quizRows, finalExamRows, quizAttemptRows, finalAttemptRows, certificateRows] = await Promise.all([
    db
      .select({
        id: quizzes.id,
        moduleStepId: quizzes.moduleStepId,
        title: quizzes.title,
        description: quizzes.description,
        durationMinutes: quizzes.durationMinutes,
        questionCount: quizzes.questionCount,
        passingScore: quizzes.passingScore,
        isActive: quizzes.isActive,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(
        and(
          eq(modules.classId, classId),
          eq(modules.isLocked, false),
          eq(quizzes.isActive, true),
          eq(quizzes.quizType, "step"),
        ),
      )
      .orderBy(asc(quizzes.createdAt)),
    db
      .select({
        id: quizzes.id,
        moduleId: quizzes.moduleId,
        title: quizzes.title,
        description: quizzes.description,
        durationMinutes: quizzes.durationMinutes,
        questionCount: quizzes.questionCount,
        passingScore: quizzes.passingScore,
        isActive: quizzes.isActive,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .innerJoin(modules, eq(modules.id, quizzes.moduleId))
      .where(
        and(
          eq(modules.classId, classId),
          eq(modules.isLocked, false),
          eq(quizzes.isActive, true),
          eq(quizzes.quizType, "final"),
        ),
      )
      .orderBy(asc(quizzes.createdAt)),
    db
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        status: quizAttempts.status,
        score: quizAttempts.score,
        warningCount: quizAttempts.warningCount,
        startedAt: quizAttempts.startedAt,
        expiresAt: quizAttempts.expiresAt,
        submittedAt: quizAttempts.submittedAt,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, quizzes.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(
        and(
          eq(modules.classId, classId),
          eq(modules.isLocked, false),
          eq(quizzes.quizType, "step"),
          eq(quizAttempts.studentId, studentId),
        ),
      )
      .orderBy(desc(quizAttempts.startedAt)),
    db
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        status: quizAttempts.status,
        score: quizAttempts.score,
        warningCount: quizAttempts.warningCount,
        startedAt: quizAttempts.startedAt,
        expiresAt: quizAttempts.expiresAt,
        submittedAt: quizAttempts.submittedAt,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .innerJoin(modules, eq(modules.id, quizzes.moduleId))
      .where(
        and(
          eq(modules.classId, classId),
          eq(modules.isLocked, false),
          eq(quizzes.quizType, "final"),
          eq(quizAttempts.studentId, studentId),
        ),
      )
      .orderBy(desc(quizAttempts.startedAt)),
    db
      .select({
        id: certificates.id,
        status: certificates.status,
        eligibleAt: certificates.eligibleAt,
        issuedAt: certificates.issuedAt,
        revokedAt: certificates.revokedAt,
        certificateNumber: certificates.certificateNumber,
        pdfStoragePath: certificates.pdfStoragePath,
        verificationToken: certificates.verificationToken,
      })
      .from(certificates)
      .where(and(eq(certificates.classId, classId), eq(certificates.studentId, studentId)))
      .limit(1),
  ]);

  const readByMaterial = new Map(materialReadRows.map((read) => [read.materialId, read]));
  const materialRowsWithRead = materialRows.map((material) => ({
    ...material,
    read: readByMaterial.get(material.id) ?? null,
  }));

  const materialsByStep = new Map<string, typeof materialRowsWithRead>();
  for (const material of materialRowsWithRead) {
    const current = materialsByStep.get(material.moduleStepId) ?? [];
    current.push(material);
    materialsByStep.set(material.moduleStepId, current);
  }

  const stepsByModule = new Map<
    string,
    Array<
      (typeof stepRows)[number] & {
        assignments: Array<(typeof assignmentRows)[number] & { submission: (typeof submissionRows)[number] | null }>;
        materials: typeof materialRowsWithRead;
        progress: (typeof progressRows)[number] | null;
        quizzes: Array<(typeof quizRows)[number] & { attempt: (typeof quizAttemptRows)[number] | null }>;
      }
    >
  >();
  const submissionByAssignment = new Map(
    submissionRows.map((submission) => [submission.assignmentId, submission]),
  );
  const progressByStep = new Map(
    progressRows.map((progress) => [progress.moduleStepId, progress]),
  );
  const assignmentsByStep = new Map<
    string,
    Array<(typeof assignmentRows)[number] & { submission: (typeof submissionRows)[number] | null }>
  >();
  for (const assignment of assignmentRows) {
    const current = assignmentsByStep.get(assignment.moduleStepId) ?? [];
    current.push({
      ...assignment,
      submission: submissionByAssignment.get(assignment.id) ?? null,
    });
    assignmentsByStep.set(assignment.moduleStepId, current);
  }

  const attemptByQuiz = new Map<string, (typeof quizAttemptRows)[number]>();
  for (const attempt of quizAttemptRows) {
    if (!attemptByQuiz.has(attempt.quizId)) {
      attemptByQuiz.set(attempt.quizId, attempt);
    }
  }
  const finalAttemptByQuiz = new Map<string, (typeof finalAttemptRows)[number]>();
  for (const attempt of finalAttemptRows) {
    if (!finalAttemptByQuiz.has(attempt.quizId)) {
      finalAttemptByQuiz.set(attempt.quizId, attempt);
    }
  }

  const quizzesByStep = new Map<
    string,
    Array<(typeof quizRows)[number] & { attempt: (typeof quizAttemptRows)[number] | null }>
  >();
  for (const quiz of quizRows) {
    if (!quiz.moduleStepId) {
      continue;
    }

    const current = quizzesByStep.get(quiz.moduleStepId) ?? [];
    current.push({
      ...quiz,
      attempt: attemptByQuiz.get(quiz.id) ?? null,
    });
    quizzesByStep.set(quiz.moduleStepId, current);
  }

  for (const step of stepRows) {
    const current = stepsByModule.get(step.moduleId) ?? [];
    current.push({
      ...step,
      materials: materialsByStep.get(step.id) ?? [],
      assignments: assignmentsByStep.get(step.id) ?? [],
      progress: progressByStep.get(step.id) ?? null,
      quizzes: quizzesByStep.get(step.id) ?? [],
    });
    stepsByModule.set(step.moduleId, current);
  }

  const moduleIdByStep = new Map(stepRows.map((step) => [step.id, step.moduleId]));
  const stepIdByAssignment = new Map(
    assignmentRows.map((assignment) => [assignment.id, assignment.moduleStepId]),
  );
  const flaggedModuleIds = new Set(
    submissionRows
      .filter((submission) => submission.plagiarismStatus === "flagged")
      .map((submission) => stepIdByAssignment.get(submission.assignmentId))
      .map((stepId) => (stepId ? moduleIdByStep.get(stepId) : undefined))
      .filter((moduleId): moduleId is string => Boolean(moduleId)),
  );
  const firstFlaggedModuleSortOrder =
    moduleRows
      .filter((moduleItem) => flaggedModuleIds.has(moduleItem.id))
      .map((moduleItem) => moduleItem.sortOrder)
      .sort((left, right) => left - right)[0] ?? null;

  const modulesWithCompletion = moduleRows.map((moduleItem) => {
      const moduleSteps = stepsByModule.get(moduleItem.id) ?? [];
      const moduleMaterials = moduleSteps.flatMap((step) => step.materials);
      const moduleAssignments = moduleSteps.flatMap((step) => step.assignments);
      const moduleQuizzes = moduleSteps.flatMap((step) => step.quizzes);
      const readMaterials = moduleMaterials.filter((material) => material.read).length;
      const acceptedAssignments = moduleAssignments.filter(
        (assignment) => assignment.submission?.status === "accepted",
      ).length;
      const passedQuizzes = moduleQuizzes.filter(
        (quiz) => quiz.attempt?.status === "submitted" && (quiz.attempt.score ?? 0) >= quiz.passingScore,
      ).length;
      const finalExam = finalExamRows.find((quiz) => quiz.moduleId === moduleItem.id) ?? null;
      const finalAttempt = finalExam ? (finalAttemptByQuiz.get(finalExam.id) ?? null) : null;
      const finalExamPassed =
        finalExam && finalAttempt?.status === "submitted" && (finalAttempt.score ?? 0) >= finalExam.passingScore
          ? 1
          : 0;
      const requiredCompletionCount =
        moduleMaterials.length + moduleAssignments.length + moduleQuizzes.length + (finalExam ? 1 : 0);
      const completedCount = readMaterials + acceptedAssignments + passedQuizzes + finalExamPassed;
      const isPlagiarismLocked =
        firstFlaggedModuleSortOrder !== null && moduleItem.sortOrder > firstFlaggedModuleSortOrder;

      return {
        ...moduleItem,
        isLocked: moduleItem.isLocked || isPlagiarismLocked,
        lockReason: isPlagiarismLocked ? "plagiarism" : moduleItem.isLocked ? "manual" : null,
        completion: {
          acceptedAssignments,
          completedCount,
          finalExamPassed,
          passedQuizzes,
          percent:
            requiredCompletionCount > 0
              ? Math.round((completedCount / requiredCompletionCount) * 100)
              : 0,
          readMaterials,
          readyForFinalExam:
            moduleMaterials.length + moduleAssignments.length + moduleQuizzes.length ===
            readMaterials + acceptedAssignments + passedQuizzes,
          requiredAssignments: moduleAssignments.length,
          requiredCompletionCount,
          requiredFinalExams: finalExam ? 1 : 0,
          requiredMaterials: moduleMaterials.length,
          requiredQuizzes: moduleQuizzes.length,
        },
        finalExam: finalExam
          ? {
              ...finalExam,
              attempt: finalAttempt,
            }
          : null,
        steps: moduleSteps,
      };
    });

  const classCompletedCount = modulesWithCompletion.reduce(
    (sum, moduleItem) => sum + moduleItem.completion.completedCount,
    0,
  );
  const classRequiredCount = modulesWithCompletion.reduce(
    (sum, moduleItem) => sum + moduleItem.completion.requiredCompletionCount,
    0,
  );
  const classProgress = {
    completed: classCompletedCount,
    percent: classRequiredCount > 0 ? Math.round((classCompletedCount / classRequiredCount) * 100) : 0,
    total: classRequiredCount,
  };
  const certificateEligibility = getCertificateEligibility({
    completed: classProgress.completed,
    modulePercents: modulesWithCompletion.map((moduleItem) => moduleItem.completion.percent),
    total: classProgress.total,
  });

  return {
    certificate: certificateRows[0] ?? null,
    certificateEligibility,
    classItem,
    classProgress,
    modules: modulesWithCompletion,
  };
}

export async function getAdminDashboardData() {
  const [activeUsers, totalUsers, totalClasses, publishedClasses, recentAuditLogs] =
    await Promise.all([
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(profiles)
        .where(eq(profiles.status, "active")),
      db.select({ value: sql<number>`count(*)::int` }).from(profiles),
      db.select({ value: sql<number>`count(*)::int` }).from(classes),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(classes)
        .where(eq(classes.status, "published")),
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          actorRole: auditLogs.actorRole,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(6),
    ]);

  return {
    stats: {
      activeUsers: Number(activeUsers[0]?.value ?? 0),
      totalUsers: Number(totalUsers[0]?.value ?? 0),
      totalClasses: Number(totalClasses[0]?.value ?? 0),
      publishedClasses: Number(publishedClasses[0]?.value ?? 0),
    },
    recentAuditLogs,
  };
}

export async function getSuperAdminDashboardData() {
  const data = await getAdminDashboardData();
  const auditLogCount = await db.select({ value: sql<number>`count(*)::int` }).from(auditLogs);

  return {
    ...data,
    stats: {
      ...data.stats,
      auditLogCount: Number(auditLogCount[0]?.value ?? 0),
    },
  };
}
