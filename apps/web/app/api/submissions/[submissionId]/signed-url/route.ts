import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  assignments,
  classes,
  moduleSteps,
  modules,
  submissions,
} from "@/db/schema";
import { SUBMISSIONS_BUCKET } from "@/features/assignments/submission-storage";
import { canReviewSubmission } from "@/features/assignments/access";
import { getCurrentProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type SignedUrlRouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

export async function GET(_request: Request, context: SignedUrlRouteContext) {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = await context.params;
  const rows = await db
    .select({
      classId: classes.id,
      classOwnerId: classes.createdBy,
      fileName: submissions.fileName,
      filePath: submissions.filePath,
      studentId: submissions.studentId,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(eq(submissions.id, submissionId))
    .limit(1);

  const submission = rows[0] ?? null;

  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = submission.studentId === profile.id;
  const canReview = canReviewSubmission({
    isClassOwner: submission.classOwnerId === profile.id,
    profileRole: profile.role,
  });

  if (!isOwner && !canReview) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(SUBMISSIONS_BUCKET)
    .createSignedUrl(submission.filePath, 300, {
      download: submission.fileName,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to create signed URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
