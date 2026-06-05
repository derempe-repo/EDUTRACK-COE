"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assignments,
  classes,
  classMembers,
  moduleProgress,
  modules,
  moduleSteps,
  notifications,
  profiles,
  submissions,
} from "@/db/schema";
import { canStudentReplaceSubmission, progressStatusFromSubmission } from "@/features/assignments/access";
import {
  buildAssignmentAttachmentStoragePath,
  ASSIGNMENT_ATTACHMENTS_BUCKET,
  validateAssignmentAttachmentFile,
} from "@/features/assignments/assignment-storage";
import {
  buildSubmissionStoragePath,
  SUBMISSIONS_BUCKET,
  validateSubmissionFile,
} from "@/features/assignments/submission-storage";
import { getUploadContentType } from "@/features/files/lms-file-types";
import {
  getDosenModuleAssignmentsPath,
  getMahasiswaClassPath,
} from "@/features/classes/urls";
import { invalidateClassDataCache } from "@/features/classes/cache-tags";
import { hasPriorFlaggedSubmission } from "@/features/plagiarism/access";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { z } from "@/lib/validators";
import { parseAppDateTimeInput } from "@/lib/app-time";

const textField = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

const maxScoreField = z.coerce.number().int().min(1).max(1000);
const reviewStatusSchema = z.enum(["accepted", "rejected"]);
type PlagiarismCheckResult = Awaited<
  ReturnType<(typeof import("@/features/plagiarism/service"))["runPlagiarismCheck"]>
>;

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
      lecturerId: classes.createdBy,
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

async function requireOwnedSubmission(submissionId: string, lecturerId: string) {
  const rows = await db
    .select({
      assignmentId: assignments.id,
      assignmentTitle: assignments.title,
      classId: classes.id,
      classTitle: classes.title,
      filePath: submissions.filePath,
      maxScore: assignments.maxScore,
      moduleId: modules.id,
      moduleTitle: modules.title,
      plagiarismStatus: submissions.plagiarismStatus,
      status: submissions.status,
      stepId: moduleSteps.id,
      studentId: submissions.studentId,
      studentName: profiles.name,
      submissionId: submissions.id,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .innerJoin(profiles, eq(profiles.id, submissions.studentId))
    .where(and(eq(submissions.id, submissionId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!rows[0]) {
    redirect("/dosen/dashboard?error=submission_not_found");
  }

  return rows[0];
}

async function requireOwnedAssignment(assignmentId: string, lecturerId: string) {
  const rows = await db
    .select({
      assignmentId: assignments.id,
      assignmentTitle: assignments.title,
      attachmentStoragePath: assignments.attachmentStoragePath,
      classId: classes.id,
      classTitle: classes.title,
      moduleId: modules.id,
      moduleTitle: modules.title,
      stepId: moduleSteps.id,
      stepTitle: moduleSteps.title,
    })
    .from(assignments)
    .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(assignments.id, assignmentId), eq(classes.createdBy, lecturerId)))
    .limit(1);

  if (!rows[0]) {
    redirect("/dosen/dashboard?error=assignment_not_found");
  }

  return rows[0];
}

async function requireSubmittableAssignment(assignmentId: string, studentId: string) {
  const rows = await db
    .select({
      assignmentId: assignments.id,
      assignmentTitle: assignments.title,
      classId: classes.id,
      classTitle: classes.title,
      dueAt: assignments.dueAt,
      lecturerId: classes.createdBy,
      moduleId: modules.id,
      moduleTitle: modules.title,
      stepId: moduleSteps.id,
      stepTitle: moduleSteps.title,
    })
    .from(assignments)
    .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .innerJoin(classMembers, eq(classMembers.classId, classes.id))
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.isActive, true),
        eq(classes.status, "published"),
        eq(modules.isLocked, false),
        eq(classMembers.profileId, studentId),
        eq(classMembers.role, "student"),
      ),
    )
    .limit(1);

  if (!rows[0]) {
    redirect("/mahasiswa/dashboard?error=assignment_not_found");
  }

  if (
    await hasPriorFlaggedSubmission({
      classId: rows[0].classId,
      moduleId: rows[0].moduleId,
      studentId,
    })
  ) {
    redirect(
      getMahasiswaClassPath({ id: rows[0].classId, title: rows[0].classTitle }) +
        "?error=plagiarism_module_locked",
    );
  }

  return rows[0];
}

async function upsertProgress({
  classId,
  score,
  status,
  stepId,
  studentId,
  submissionId,
}: {
  classId: string;
  score: number | null;
  status: "failed" | "in_progress" | "locked" | "not_started" | "submitted" | "verified";
  stepId: string;
  studentId: string;
  submissionId: string;
}) {
  const now = new Date();

  await db
    .insert(moduleProgress)
    .values({
      classId,
      moduleStepId: stepId,
      score,
      status,
      studentId,
      submissionId,
      submittedAt: now,
      verifiedAt: status === "verified" ? now : null,
    })
    .onConflictDoUpdate({
      target: [moduleProgress.moduleStepId, moduleProgress.studentId],
      set: {
        score,
        status,
        submissionId,
        submittedAt: now,
        updatedAt: now,
        verifiedAt: status === "verified" ? now : null,
      },
    });
}

export async function createAssignmentAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const fileEntry = formData.get("attachment");
  const attachment = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  const parsed = z
    .object({
      description: textField,
      isActive: z.boolean(),
      maxScore: maxScoreField,
      stepId: z.uuid(),
      title: z.string().trim().min(3).max(120),
    })
    .safeParse({
      description: formData.get("description"),
      isActive: formData.get("isActive") === "on",
      maxScore: formData.get("maxScore") ?? 100,
      stepId: formData.get("stepId"),
      title: formData.get("title"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_assignment");
  }

  const dueAt = parseAppDateTimeInput(formData.get("dueAt"));
  const stepItem = await requireOwnedStep(parsed.data.stepId, profile.id);
  let attachmentData:
    | {
        attachmentFileName: string;
        attachmentFileSize: number;
        attachmentMimeType: string;
        attachmentStoragePath: string;
      }
    | Record<string, never> = {};

  if (attachment) {
    const attachmentError = validateAssignmentAttachmentFile(attachment);
    if (attachmentError) {
      redirect(
        getDosenModuleAssignmentsPath(
          { id: stepItem.classId, title: stepItem.classTitle },
          { id: stepItem.moduleId, title: stepItem.moduleTitle },
        ) + "?error=invalid_assignment_file",
      );
    }

    const storagePath = buildAssignmentAttachmentStoragePath({
      classId: stepItem.classId,
      fileName: attachment.name,
      moduleId: stepItem.moduleId,
      token: crypto.randomUUID(),
    });
    const supabase = await createClient();
    const { error } = await supabase.storage.from(ASSIGNMENT_ATTACHMENTS_BUCKET).upload(storagePath, attachment, {
      contentType: getUploadContentType(attachment),
      upsert: false,
    });

    if (error) {
      redirect(
        getDosenModuleAssignmentsPath(
          { id: stepItem.classId, title: stepItem.classTitle },
          { id: stepItem.moduleId, title: stepItem.moduleTitle },
        ) + "?error=assignment_upload_failed",
      );
    }

    attachmentData = {
      attachmentFileName: attachment.name,
      attachmentFileSize: attachment.size,
      attachmentMimeType: getUploadContentType(attachment),
      attachmentStoragePath: storagePath,
    };
  }

  const [assignment] = await db
    .insert(assignments)
    .values({
      ...attachmentData,
      createdBy: profile.id,
      description: parsed.data.description,
      dueAt,
      isActive: parsed.data.isActive,
      maxScore: parsed.data.maxScore,
      moduleStepId: parsed.data.stepId,
      title: parsed.data.title,
    })
    .returning({ id: assignments.id });

  const students = await db
    .select({ profileId: classMembers.profileId })
    .from(classMembers)
    .where(and(eq(classMembers.classId, stepItem.classId), eq(classMembers.role, "student")));

  await notifyUsers(
    students.map((student) => ({
      body: `Tugas baru "${parsed.data.title}" tersedia di ${stepItem.moduleTitle}.`,
      entityId: assignment.id,
      entityType: "assignments",
      recipientId: student.profileId,
      title: "Tugas baru tersedia",
    })),
  );

  await writeAuditLog({
    action: "assignments.created",
    entityId: assignment.id,
    entityType: "assignments",
    metadata: {
      class_id: stepItem.classId,
      step_id: parsed.data.stepId,
      title: parsed.data.title,
    },
  });

  revalidatePath(`/dosen/classes/${stepItem.classId}`);
  revalidatePath("/mahasiswa/dashboard");
  invalidateClassDataCache({ classId: stepItem.classId, lecturerId: profile.id });
  redirect(
    getDosenModuleAssignmentsPath(
      { id: stepItem.classId, title: stepItem.classTitle },
      { id: stepItem.moduleId, title: stepItem.moduleTitle },
    ) + "?assignment_created=1",
  );
}

export async function updateAssignmentAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const fileEntry = formData.get("attachment");
  const attachment = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  const parsed = z
    .object({
      assignmentId: z.uuid(),
      description: textField,
      isActive: z.boolean(),
      maxScore: maxScoreField,
      title: z.string().trim().min(3).max(120),
    })
    .safeParse({
      assignmentId: formData.get("assignmentId"),
      description: formData.get("description"),
      isActive: formData.get("isActive") === "on",
      maxScore: formData.get("maxScore") ?? 100,
      title: formData.get("title"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_assignment");
  }

  const dueAt = parseAppDateTimeInput(formData.get("dueAt"));
  const assignment = await requireOwnedAssignment(parsed.data.assignmentId, profile.id);
  const now = new Date();
  const removeAttachment = formData.get("removeAttachment") === "on";
  let nextAttachmentData: {
    attachmentFileName?: string | null;
    attachmentFileSize?: number | null;
    attachmentMimeType?: string | null;
    attachmentStoragePath?: string | null;
  } = {};
  let storagePathToRemove: string | null = null;

  if (attachment) {
    const attachmentError = validateAssignmentAttachmentFile(attachment);
    if (attachmentError) {
      redirect(
        getDosenModuleAssignmentsPath(
          { id: assignment.classId, title: assignment.classTitle },
          { id: assignment.moduleId, title: assignment.moduleTitle },
        ) + "?error=invalid_assignment_file",
      );
    }

    const storagePath = buildAssignmentAttachmentStoragePath({
      classId: assignment.classId,
      fileName: attachment.name,
      moduleId: assignment.moduleId,
      token: crypto.randomUUID(),
    });
    const supabase = await createClient();
    const { error } = await supabase.storage.from(ASSIGNMENT_ATTACHMENTS_BUCKET).upload(storagePath, attachment, {
      contentType: getUploadContentType(attachment),
      upsert: false,
    });

    if (error) {
      redirect(
        getDosenModuleAssignmentsPath(
          { id: assignment.classId, title: assignment.classTitle },
          { id: assignment.moduleId, title: assignment.moduleTitle },
        ) + "?error=assignment_upload_failed",
      );
    }

    storagePathToRemove = assignment.attachmentStoragePath;
    nextAttachmentData = {
      attachmentFileName: attachment.name,
      attachmentFileSize: attachment.size,
      attachmentMimeType: getUploadContentType(attachment),
      attachmentStoragePath: storagePath,
    };
  } else if (removeAttachment) {
    storagePathToRemove = assignment.attachmentStoragePath;
    nextAttachmentData = {
      attachmentFileName: null,
      attachmentFileSize: null,
      attachmentMimeType: null,
      attachmentStoragePath: null,
    };
  }

  await db
    .update(assignments)
    .set({
      ...nextAttachmentData,
      description: parsed.data.description,
      dueAt,
      isActive: parsed.data.isActive,
      maxScore: parsed.data.maxScore,
      title: parsed.data.title,
      updatedAt: now,
    })
    .where(eq(assignments.id, parsed.data.assignmentId));

  if (storagePathToRemove) {
    const supabase = await createClient();
    await supabase.storage.from(ASSIGNMENT_ATTACHMENTS_BUCKET).remove([storagePathToRemove]);
  }

  const students = await db
    .select({ profileId: classMembers.profileId })
    .from(classMembers)
    .where(and(eq(classMembers.classId, assignment.classId), eq(classMembers.role, "student")));

  await notifyUsers(
    students.map((student) => ({
      body: parsed.data.isActive
        ? `Tugas "${parsed.data.title}" diperbarui oleh dosen.`
        : `Tugas "${parsed.data.title}" sementara dinonaktifkan oleh dosen.`,
      entityId: parsed.data.assignmentId,
      entityType: "assignments",
      recipientId: student.profileId,
      title: parsed.data.isActive ? "Tugas diperbarui" : "Tugas dinonaktifkan",
    })),
  );

  await writeAuditLog({
    action: "assignments.updated",
    entityId: parsed.data.assignmentId,
    entityType: "assignments",
    metadata: {
      class_id: assignment.classId,
      is_active: parsed.data.isActive,
      title: parsed.data.title,
    },
  });

  revalidatePath("/mahasiswa/dashboard");
  revalidatePath(`/mahasiswa/classes/${assignment.classId}`);
  invalidateClassDataCache({ classId: assignment.classId, lecturerId: profile.id });
  redirect(
    getDosenModuleAssignmentsPath(
      { id: assignment.classId, title: assignment.classTitle },
      { id: assignment.moduleId, title: assignment.moduleTitle },
    ) + "?assignment_updated=1",
  );
}

export async function deleteAssignmentAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z.object({ assignmentId: z.uuid() }).safeParse({
    assignmentId: formData.get("assignmentId"),
  });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_assignment");
  }

  const assignment = await requireOwnedAssignment(parsed.data.assignmentId, profile.id);
  const existingSubmission = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.assignmentId, parsed.data.assignmentId))
    .limit(1);
  const modulePath = getDosenModuleAssignmentsPath(
    { id: assignment.classId, title: assignment.classTitle },
    { id: assignment.moduleId, title: assignment.moduleTitle },
  );

  if (existingSubmission[0]) {
    redirect(modulePath + "?error=assignment_has_submissions");
  }

  const students = await db
    .select({ profileId: classMembers.profileId })
    .from(classMembers)
    .where(and(eq(classMembers.classId, assignment.classId), eq(classMembers.role, "student")));

  await db.delete(assignments).where(eq(assignments.id, parsed.data.assignmentId));

  if (assignment.attachmentStoragePath) {
    const supabase = await createClient();
    await supabase.storage.from(ASSIGNMENT_ATTACHMENTS_BUCKET).remove([assignment.attachmentStoragePath]);
  }

  await notifyUsers(
    students.map((student) => ({
      body: `Tugas "${assignment.assignmentTitle}" dihapus dari ${assignment.stepTitle}.`,
      entityId: assignment.stepId,
      entityType: "module_steps",
      recipientId: student.profileId,
      title: "Tugas dihapus",
    })),
  );

  await writeAuditLog({
    action: "assignments.deleted",
    entityId: parsed.data.assignmentId,
    entityType: "assignments",
    metadata: {
      class_id: assignment.classId,
      title: assignment.assignmentTitle,
    },
  });

  revalidatePath("/mahasiswa/dashboard");
  revalidatePath(`/mahasiswa/classes/${assignment.classId}`);
  invalidateClassDataCache({ classId: assignment.classId, lecturerId: profile.id });
  redirect(modulePath + "?assignment_deleted=1");
}

export async function submitAssignmentAction(formData: FormData) {
  const profile = await requireRole(["mahasiswa"]);
  const fileEntry = formData.get("file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  const parsed = z
    .object({
      assignmentId: z.uuid(),
      note: textField,
    })
    .safeParse({
      assignmentId: formData.get("assignmentId"),
      note: formData.get("note"),
    });

  if (!parsed.success || !file) {
    redirect("/mahasiswa/dashboard?error=invalid_submission");
  }

  const fileError = validateSubmissionFile(file);
  if (fileError) {
    redirect("/mahasiswa/dashboard?error=invalid_submission_file");
  }

  const assignment = await requireSubmittableAssignment(parsed.data.assignmentId, profile.id);
  const existingRows = await db
    .select({
      filePath: submissions.filePath,
      status: submissions.status,
    })
    .from(submissions)
    .where(and(eq(submissions.assignmentId, parsed.data.assignmentId), eq(submissions.studentId, profile.id)))
    .limit(1);
  const existingSubmission = existingRows[0] ?? null;

  if (!canStudentReplaceSubmission(existingSubmission?.status ?? null)) {
    redirect(getMahasiswaClassPath({ id: assignment.classId, title: assignment.classTitle }) + "?error=submission_locked");
  }

  if (
    assignment.dueAt &&
    assignment.dueAt.getTime() < Date.now() &&
    existingSubmission?.status !== "resubmit_allowed"
  ) {
    redirect(getMahasiswaClassPath({ id: assignment.classId, title: assignment.classTitle }) + "?error=assignment_due_passed");
  }

  const storagePath = buildSubmissionStoragePath({
    assignmentId: parsed.data.assignmentId,
    classId: assignment.classId,
    fileName: file.name,
    studentId: profile.id,
    token: crypto.randomUUID(),
  });

  const supabase = await createClient();
  const { error } = await supabase.storage.from(SUBMISSIONS_BUCKET).upload(storagePath, file, {
    contentType: getUploadContentType(file),
    upsert: false,
  });

  if (error) {
    redirect(getMahasiswaClassPath({ id: assignment.classId, title: assignment.classTitle }) + "?error=submission_upload_failed");
  }

  const now = new Date();
  const [submission] = await db
    .insert(submissions)
    .values({
      assignmentId: parsed.data.assignmentId,
      fileName: file.name,
      fileHash: null,
      filePath: storagePath,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      note: parsed.data.note,
      plagiarismStatus: "pending",
      status: "submitted",
      studentId: profile.id,
      submissionText: null,
      submittedAt: now,
      textHash: null,
    })
    .onConflictDoUpdate({
      target: [submissions.assignmentId, submissions.studentId],
      set: {
        feedback: null,
        fileName: file.name,
        fileHash: null,
        filePath: storagePath,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        note: parsed.data.note,
        plagiarismStatus: "pending",
        reviewedAt: null,
        reviewedBy: null,
        score: null,
        status: "submitted",
        submissionText: null,
        submittedAt: now,
        textHash: null,
        updatedAt: now,
      },
    })
    .returning({ id: submissions.id });

  if (existingSubmission?.filePath) {
    await supabase.storage.from(SUBMISSIONS_BUCKET).remove([existingSubmission.filePath]);
  }

  let plagiarismResult: PlagiarismCheckResult | null = null;

  try {
    const { runPlagiarismCheck } = await import("@/features/plagiarism/service");

    plagiarismResult = await runPlagiarismCheck({
      assignmentId: parsed.data.assignmentId,
      assignmentTitle: assignment.assignmentTitle,
      file,
      lecturerId: assignment.lecturerId,
      note: parsed.data.note,
      studentId: profile.id,
      studentName: profile.name,
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("Failed to run plagiarism check", {
      assignmentId: parsed.data.assignmentId,
      error,
      submissionId: submission.id,
    });
  }

  await upsertProgress({
    classId: assignment.classId,
    score: null,
    status: progressStatusFromSubmission(plagiarismResult?.status === "flagged" ? "locked" : "submitted"),
    stepId: assignment.stepId,
    studentId: profile.id,
    submissionId: submission.id,
  });

  await notifyUsers([
    {
      body: `${profile.name} mengumpulkan tugas "${assignment.assignmentTitle}".`,
      entityId: submission.id,
      entityType: "submissions",
      recipientId: assignment.lecturerId,
      title: "Submission baru",
    },
  ]);

  await writeAuditLog({
    action: "submissions.submitted",
    entityId: submission.id,
    entityType: "submissions",
    metadata: {
      assignment_id: parsed.data.assignmentId,
      class_id: assignment.classId,
      storage_path: storagePath,
      plagiarism_status: plagiarismResult?.status ?? "pending",
      similarity_score: plagiarismResult?.similarityScore ?? null,
    },
  });

  if (plagiarismResult?.status === "flagged") {
    await writeAuditLog({
      action: "plagiarism.flagged",
      entityId: plagiarismResult.checkId,
      entityType: "plagiarism_checks",
      metadata: {
        assignment_id: parsed.data.assignmentId,
        class_id: assignment.classId,
        similarity_score: plagiarismResult.similarityScore,
        submission_id: submission.id,
        threshold_percent: plagiarismResult.thresholdPercent,
      },
    });
  }

  revalidatePath("/mahasiswa/dashboard");
  revalidatePath(`/mahasiswa/classes/${assignment.classId}`);
  invalidateClassDataCache({ classId: assignment.classId, studentId: profile.id });
  redirect(getMahasiswaClassPath({ id: assignment.classId, title: assignment.classTitle }) + "?submission_submitted=1");
}

export async function reviewSubmissionAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      feedback: textField,
      score: z.coerce.number().int().min(0).max(1000).optional(),
      status: reviewStatusSchema,
      submissionId: z.uuid(),
    })
    .safeParse({
      feedback: formData.get("feedback"),
      score: formData.get("score") || undefined,
      status: formData.get("status"),
      submissionId: formData.get("submissionId"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_submission_review");
  }

  const submission = await requireOwnedSubmission(parsed.data.submissionId, profile.id);
  if (
    submission.plagiarismStatus === "flagged" ||
    submission.plagiarismStatus === "rejected_permanent"
  ) {
    redirect(
      getDosenModuleAssignmentsPath(
        { id: submission.classId, title: submission.classTitle },
        { id: submission.moduleId, title: submission.moduleTitle },
      ) + "?error=plagiarism_override_required",
    );
  }
  const score = parsed.data.status === "accepted" ? (parsed.data.score ?? submission.maxScore) : null;

  if (score !== null && score > submission.maxScore) {
    redirect(
      getDosenModuleAssignmentsPath(
        { id: submission.classId, title: submission.classTitle },
        { id: submission.moduleId, title: submission.moduleTitle },
      ) + "?error=invalid_submission_score",
    );
  }

  const now = new Date();
  await db
    .update(submissions)
    .set({
      feedback: parsed.data.feedback,
      plagiarismStatus: "passed",
      reviewedAt: now,
      reviewedBy: profile.id,
      score,
      status: parsed.data.status,
      updatedAt: now,
    })
    .where(eq(submissions.id, parsed.data.submissionId));

  await upsertProgress({
    classId: submission.classId,
    score,
    status: progressStatusFromSubmission(parsed.data.status),
    stepId: submission.stepId,
    studentId: submission.studentId,
    submissionId: parsed.data.submissionId,
  });

  await notifyUsers([
    {
      body:
        parsed.data.status === "accepted"
          ? `Submission tugas "${submission.assignmentTitle}" diterima.`
          : `Submission tugas "${submission.assignmentTitle}" perlu diperbaiki.`,
      entityId: parsed.data.submissionId,
      entityType: "submissions",
      recipientId: submission.studentId,
      title: parsed.data.status === "accepted" ? "Submission diterima" : "Submission ditolak",
    },
  ]);

  await writeAuditLog({
    action: "submissions.reviewed",
    entityId: parsed.data.submissionId,
    entityType: "submissions",
    metadata: {
      class_id: submission.classId,
      status: parsed.data.status,
    },
  });

  const { tryIssueEligibleCertificate } = await import("@/features/certificates/issuer");
  await tryIssueEligibleCertificate(submission.studentId, submission.classId);

  revalidatePath("/mahasiswa/dashboard");
  revalidatePath(`/mahasiswa/classes/${submission.classId}`);
  invalidateClassDataCache({ classId: submission.classId, lecturerId: profile.id, studentId: submission.studentId });
  redirect(
    getDosenModuleAssignmentsPath(
      { id: submission.classId, title: submission.classTitle },
      { id: submission.moduleId, title: submission.moduleTitle },
    ) + "?submission_reviewed=1",
  );
}

export async function allowResubmitAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z.object({ submissionId: z.uuid() }).safeParse({
    submissionId: formData.get("submissionId"),
  });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_submission_review");
  }

  const submission = await requireOwnedSubmission(parsed.data.submissionId, profile.id);
  if (submission.plagiarismStatus === "flagged") {
    redirect(
      getDosenModuleAssignmentsPath(
        { id: submission.classId, title: submission.classTitle },
        { id: submission.moduleId, title: submission.moduleTitle },
      ) + "?error=plagiarism_override_required",
    );
  }
  const now = new Date();

  await db
    .update(submissions)
    .set({
      plagiarismStatus: "resubmit_allowed",
      reviewedAt: now,
      reviewedBy: profile.id,
      status: "resubmit_allowed",
      updatedAt: now,
    })
    .where(eq(submissions.id, parsed.data.submissionId));

  await upsertProgress({
    classId: submission.classId,
    score: null,
    status: progressStatusFromSubmission("resubmit_allowed"),
    stepId: submission.stepId,
    studentId: submission.studentId,
    submissionId: parsed.data.submissionId,
  });

  await notifyUsers([
    {
      body: `Dosen membuka pengumpulan ulang untuk tugas "${submission.assignmentTitle}".`,
      entityId: parsed.data.submissionId,
      entityType: "submissions",
      recipientId: submission.studentId,
      title: "Resubmit dibuka",
    },
  ]);

  await writeAuditLog({
    action: "submissions.resubmit_allowed",
    entityId: parsed.data.submissionId,
    entityType: "submissions",
    metadata: {
      class_id: submission.classId,
    },
  });

  revalidatePath("/mahasiswa/dashboard");
  revalidatePath(`/mahasiswa/classes/${submission.classId}`);
  invalidateClassDataCache({ classId: submission.classId, lecturerId: profile.id, studentId: submission.studentId });
  redirect(
    getDosenModuleAssignmentsPath(
      { id: submission.classId, title: submission.classTitle },
      { id: submission.moduleId, title: submission.moduleTitle },
    ) + "?resubmit_allowed=1",
  );
}
