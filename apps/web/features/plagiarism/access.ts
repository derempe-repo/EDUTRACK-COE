import { and, eq, lt } from "drizzle-orm";

import { assignments, modules, moduleSteps, submissions } from "@/db/schema";
import { db } from "@/lib/db";

export async function hasPriorFlaggedSubmission({
  classId,
  moduleId,
  studentId,
}: {
  classId: string;
  moduleId: string;
  studentId: string;
}) {
  const moduleRows = await db
    .select({ sortOrder: modules.sortOrder })
    .from(modules)
    .where(and(eq(modules.id, moduleId), eq(modules.classId, classId)))
    .limit(1);
  const currentModule = moduleRows[0];

  if (!currentModule) {
    return false;
  }

  const flaggedRows = await db
    .select({ id: submissions.id })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .where(
      and(
        eq(modules.classId, classId),
        lt(modules.sortOrder, currentModule.sortOrder),
        eq(submissions.studentId, studentId),
        eq(submissions.plagiarismStatus, "flagged"),
      ),
    )
    .limit(1);

  return Boolean(flaggedRows[0]);
}
