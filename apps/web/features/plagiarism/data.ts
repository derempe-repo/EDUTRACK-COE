import { and, desc, eq, inArray } from "drizzle-orm";

import {
  assignments,
  classes,
  modules,
  moduleSteps,
  plagiarismChecks,
  plagiarismMatches,
  plagiarismOverrides,
  profiles,
  submissions,
} from "@/db/schema";
import { db } from "@/lib/db";

export async function getDosenClassPlagiarismReport(lecturerId: string, classId: string) {
  const classRows = await db
    .select({
      id: classes.id,
      title: classes.title,
      description: classes.description,
      status: classes.status,
    })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.createdBy, lecturerId)))
    .limit(1);
  const classItem = classRows[0] ?? null;

  if (!classItem) {
    return null;
  }

  const checks = await db
    .select({
      assignmentTitle: assignments.title,
      checkedAt: plagiarismChecks.checkedAt,
      extractionError: plagiarismChecks.extractionError,
      extractionStatus: plagiarismChecks.extractionStatus,
      fileName: submissions.fileName,
      id: plagiarismChecks.id,
      moduleTitle: modules.title,
      similarityScore: plagiarismChecks.similarityScore,
      status: plagiarismChecks.status,
      studentEmail: profiles.email,
      studentName: profiles.name,
      submissionId: submissions.id,
      submittedAt: submissions.submittedAt,
      thresholdPercent: plagiarismChecks.thresholdPercent,
    })
    .from(plagiarismChecks)
    .innerJoin(submissions, eq(submissions.id, plagiarismChecks.submissionId))
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(profiles, eq(profiles.id, submissions.studentId))
    .where(eq(modules.classId, classId))
    .orderBy(desc(plagiarismChecks.checkedAt), desc(plagiarismChecks.createdAt));
  const checkIds = checks.map((check) => check.id);

  const [matches, overrides] =
    checkIds.length > 0
      ? await Promise.all([
          db
            .select({
              checkId: plagiarismMatches.checkId,
              fileName: submissions.fileName,
              matchedSubmissionId: plagiarismMatches.matchedSubmissionId,
              similarityScore: plagiarismMatches.similarityScore,
              studentEmail: profiles.email,
              studentName: profiles.name,
            })
            .from(plagiarismMatches)
            .innerJoin(submissions, eq(submissions.id, plagiarismMatches.matchedSubmissionId))
            .innerJoin(profiles, eq(profiles.id, submissions.studentId))
            .where(inArray(plagiarismMatches.checkId, checkIds))
            .orderBy(desc(plagiarismMatches.similarityScore)),
          db
            .select({
              action: plagiarismOverrides.action,
              actorName: profiles.name,
              checkId: plagiarismOverrides.checkId,
              createdAt: plagiarismOverrides.createdAt,
              id: plagiarismOverrides.id,
              reason: plagiarismOverrides.reason,
            })
            .from(plagiarismOverrides)
            .innerJoin(profiles, eq(profiles.id, plagiarismOverrides.actorId))
            .where(inArray(plagiarismOverrides.checkId, checkIds))
            .orderBy(desc(plagiarismOverrides.createdAt)),
        ])
      : [[], []];
  const matchesByCheck = new Map<string, typeof matches>();
  const overridesByCheck = new Map<string, typeof overrides>();

  for (const match of matches) {
    const current = matchesByCheck.get(match.checkId) ?? [];
    current.push(match);
    matchesByCheck.set(match.checkId, current);
  }

  for (const override of overrides) {
    const current = overridesByCheck.get(override.checkId) ?? [];
    current.push(override);
    overridesByCheck.set(override.checkId, current);
  }

  return {
    checks: checks.map((check) => ({
      ...check,
      matches: matchesByCheck.get(check.id) ?? [],
      overrides: overridesByCheck.get(check.id) ?? [],
    })),
    classItem,
  };
}
