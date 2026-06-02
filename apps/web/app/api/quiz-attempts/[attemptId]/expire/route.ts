import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { quizAttempts } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

type ExpireAttemptRouteProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export async function POST(_request: Request, { params }: ExpireAttemptRouteProps) {
  const profile = await requireRole(["mahasiswa"]);
  const { attemptId } = await params;
  const attemptRows = await db
    .select({
      expiresAt: quizAttempts.expiresAt,
      id: quizAttempts.id,
      status: quizAttempts.status,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, profile.id)))
    .limit(1);
  const attempt = attemptRows[0] ?? null;

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.status !== "started") {
    return NextResponse.json({ expired: attempt.status === "expired", status: attempt.status });
  }

  if (attempt.expiresAt.getTime() > Date.now()) {
    return NextResponse.json({ expired: false, status: attempt.status });
  }

  await db
    .update(quizAttempts)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(quizAttempts.id, attemptId));

  await writeAuditLog({
    action: "quiz_attempts.expired",
    entityId: attemptId,
    entityType: "quiz_attempts",
  });

  return NextResponse.json({ expired: true, status: "expired" });
}
