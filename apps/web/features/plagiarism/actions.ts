"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assignments,
  classes,
  moduleProgress,
  modules,
  moduleSteps,
  notifications,
  plagiarismChecks,
  plagiarismOverrides,
  submissions,
} from "@/db/schema";
import { invalidateClassDataCache } from "@/features/classes/cache-tags";
import { getDosenModuleAssignmentsPath, getMahasiswaClassPath } from "@/features/classes/urls";
import { writeAuditLog } from "@/lib/audit";
import { type AppProfile, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "@/lib/validators";

const overrideSchema = z.object({
  reason: z.string().trim().min(10).max(500),
  submissionId: z.uuid(),
});

async function requireManageableFlaggedSubmission(submissionId: string, profile: AppProfile) {
  const rows = await db
    .select({
      assignmentTitle: assignments.title,
      checkId: plagiarismChecks.id,
      classId: classes.id,
      classOwnerId: classes.createdBy,
      classTitle: classes.title,
      moduleId: modules.id,
      moduleTitle: modules.title,
      studentId: submissions.studentId,
      submissionId: submissions.id,
    })
    .from(submissions)
    .innerJoin(plagiarismChecks, eq(plagiarismChecks.submissionId, submissions.id))
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(
      and(
        eq(submissions.id, submissionId),
        eq(submissions.plagiarismStatus, "flagged"),
        eq(plagiarismChecks.status, "flagged"),
      ),
    )
    .limit(1);
  const submission = rows[0] ?? null;
  const canManage =
    submission &&
    (submission.classOwnerId === profile.id ||
      profile.role === "admin" ||
      profile.role === "super_admin");

  if (!submission || !canManage) {
    redirect(`${dashboardPath(profile)}/?error=plagiarism_check_not_found`);
  }

  return submission;
}

function dashboardPath(profile: AppProfile) {
  if (profile.role === "dosen") {
    return "/dosen/dashboard";
  }

  return profile.role === "admin" ? "/admin/monitoring" : "/super-admin/monitoring";
}

function successPath(
  profile: AppProfile,
  submission: {
    classId: string;
    classTitle: string;
    moduleId: string;
    moduleTitle: string;
  },
) {
  return profile.role === "dosen"
    ? getDosenModuleAssignmentsPath(
        { id: submission.classId, title: submission.classTitle },
        { id: submission.moduleId, title: submission.moduleTitle },
      )
    : dashboardPath(profile);
}

async function recordOverride({
  action,
  profile,
  reason,
  submission,
}: {
  action: "allow_resubmit" | "reject_permanent";
  profile: AppProfile;
  reason: string;
  submission: Awaited<ReturnType<typeof requireManageableFlaggedSubmission>>;
}) {
  await db.insert(plagiarismOverrides).values({
    action,
    actorId: profile.id,
    checkId: submission.checkId,
    reason,
    submissionId: submission.submissionId,
  });

  await writeAuditLog({
    action: `plagiarism.${action}`,
    entityId: submission.checkId,
    entityType: "plagiarism_checks",
    metadata: {
      class_id: submission.classId,
      reason,
      submission_id: submission.submissionId,
    },
  });
}

export async function allowPlagiarismResubmitAction(formData: FormData) {
  const profile = await requireRole(["dosen", "admin", "super_admin"]);
  const parsed = overrideSchema.safeParse({
    reason: formData.get("reason"),
    submissionId: formData.get("submissionId"),
  });

  if (!parsed.success) {
    redirect(`${dashboardPath(profile)}?error=invalid_plagiarism_override`);
  }

  const submission = await requireManageableFlaggedSubmission(parsed.data.submissionId, profile);
  const now = new Date();

  await db
    .update(submissions)
    .set({
      plagiarismStatus: "resubmit_allowed",
      score: null,
      status: "resubmit_allowed",
      updatedAt: now,
    })
    .where(eq(submissions.id, submission.submissionId));
  await db
    .update(plagiarismChecks)
    .set({ status: "resubmit_allowed", updatedAt: now })
    .where(eq(plagiarismChecks.id, submission.checkId));
  await db
    .update(moduleProgress)
    .set({ score: null, status: "in_progress", updatedAt: now, verifiedAt: null })
    .where(eq(moduleProgress.submissionId, submission.submissionId));
  await db.insert(notifications).values({
    body: `Anda dapat mengunggah ulang tugas "${submission.assignmentTitle}". Alasan: ${parsed.data.reason}`,
    entityId: submission.submissionId,
    entityType: "plagiarism_checks",
    recipientId: submission.studentId,
    title: "Resubmit plagiarism dibuka",
  });
  await recordOverride({
    action: "allow_resubmit",
    profile,
    reason: parsed.data.reason,
    submission,
  });

  revalidatePath("/mahasiswa/dashboard");
  revalidatePath(getMahasiswaClassPath({ id: submission.classId, title: submission.classTitle }));
  invalidateClassDataCache({
    classId: submission.classId,
    lecturerId: profile.role === "dosen" ? profile.id : submission.classOwnerId,
    studentId: submission.studentId,
  });
  redirect(successPath(profile, submission) + "?plagiarism_resubmit_allowed=1");
}

export async function rejectPermanentPlagiarismAction(formData: FormData) {
  const profile = await requireRole(["dosen", "admin", "super_admin"]);
  const parsed = overrideSchema.safeParse({
    reason: formData.get("reason"),
    submissionId: formData.get("submissionId"),
  });

  if (!parsed.success) {
    redirect(`${dashboardPath(profile)}?error=invalid_plagiarism_override`);
  }

  const submission = await requireManageableFlaggedSubmission(parsed.data.submissionId, profile);
  const now = new Date();

  await db
    .update(submissions)
    .set({
      feedback: parsed.data.reason,
      plagiarismStatus: "rejected_permanent",
      reviewedAt: now,
      reviewedBy: profile.id,
      score: 0,
      status: "locked",
      updatedAt: now,
    })
    .where(eq(submissions.id, submission.submissionId));
  await db
    .update(plagiarismChecks)
    .set({ status: "rejected_permanent", updatedAt: now })
    .where(eq(plagiarismChecks.id, submission.checkId));
  await db
    .update(moduleProgress)
    .set({ score: 0, status: "failed", updatedAt: now, verifiedAt: null })
    .where(eq(moduleProgress.submissionId, submission.submissionId));
  await db.insert(notifications).values({
    body: `Submission tugas "${submission.assignmentTitle}" ditolak permanen. Alasan: ${parsed.data.reason}`,
    entityId: submission.submissionId,
    entityType: "plagiarism_checks",
    recipientId: submission.studentId,
    title: "Submission ditolak permanen",
  });
  await recordOverride({
    action: "reject_permanent",
    profile,
    reason: parsed.data.reason,
    submission,
  });

  revalidatePath("/mahasiswa/dashboard");
  revalidatePath(getMahasiswaClassPath({ id: submission.classId, title: submission.classTitle }));
  invalidateClassDataCache({
    classId: submission.classId,
    lecturerId: profile.role === "dosen" ? profile.id : submission.classOwnerId,
    studentId: submission.studentId,
  });
  redirect(successPath(profile, submission) + "?plagiarism_rejected=1");
}
