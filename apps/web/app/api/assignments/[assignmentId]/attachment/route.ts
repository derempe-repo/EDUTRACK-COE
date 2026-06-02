import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { assignments, classes, classMembers, moduleSteps, modules } from "@/db/schema";
import { ASSIGNMENT_ATTACHMENTS_BUCKET } from "@/features/assignments/assignment-storage";
import { canViewAssignment } from "@/features/assignments/access";
import { hasPriorFlaggedSubmission } from "@/features/plagiarism/access";
import { getCurrentProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type AssignmentAttachmentRouteContext = {
  params: Promise<{
    assignmentId: string;
  }>;
};

export async function GET(_request: Request, context: AssignmentAttachmentRouteContext) {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId } = await context.params;
  const rows = await db
    .select({
      attachmentFileName: assignments.attachmentFileName,
      attachmentStoragePath: assignments.attachmentStoragePath,
      classId: classes.id,
      classOwnerId: classes.createdBy,
      classStatus: classes.status,
      isActive: assignments.isActive,
      moduleIsLocked: modules.isLocked,
      moduleId: modules.id,
    })
    .from(assignments)
    .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  const assignment = rows[0] ?? null;

  if (!assignment || !assignment.attachmentStoragePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasGlobalAccess = profile.role === "admin" || profile.role === "super_admin";
  const isClassOwner = assignment.classOwnerId === profile.id;
  let isClassMember = false;

  if (!hasGlobalAccess && !isClassOwner) {
    const memberRows = await db
      .select({ id: classMembers.id })
      .from(classMembers)
      .where(and(eq(classMembers.classId, assignment.classId), eq(classMembers.profileId, profile.id)))
      .limit(1);

    isClassMember = Boolean(memberRows[0]);
  }

  const canAccess = canViewAssignment({
    assignmentIsActive: assignment.isActive,
    classStatus: assignment.classStatus,
    isClassMember,
    isClassOwner,
    moduleIsLocked: assignment.moduleIsLocked,
    profileRole: profile.role,
  });

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    profile.role === "mahasiswa" &&
    (await hasPriorFlaggedSubmission({
      classId: assignment.classId,
      moduleId: assignment.moduleId,
      studentId: profile.id,
    }))
  ) {
    return NextResponse.json({ error: "Temporarily locked by plagiarism review" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(ASSIGNMENT_ATTACHMENTS_BUCKET)
    .createSignedUrl(assignment.attachmentStoragePath, 300, {
      download: assignment.attachmentFileName ?? "tugas.pdf",
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to create signed URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
