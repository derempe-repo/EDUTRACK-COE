import { NextResponse } from "next/server";

import { recordExamModeEvent } from "@/features/quizzes/actions";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { z } from "@/lib/validators";

type ExamModeEventRouteProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

const eventSchema = z.object({
  detail: z.string().trim().max(500).optional(),
  eventType: z.enum([
    "copy",
    "fullscreen_exit",
    "paste",
    "route_leave",
    "tab_hidden",
    "visibility_hidden",
  ]),
});

export async function POST(request: Request, { params }: ExamModeEventRouteProps) {
  const profile = await requireRole(["mahasiswa"]);
  const { attemptId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid exam mode event" }, { status: 400 });
  }

  const result = await recordExamModeEvent({
    attemptId,
    detail: parsed.data.detail,
    eventType: parsed.data.eventType,
    studentId: profile.id,
  });

  if (result.reset) {
    await writeAuditLog({
      action: "quiz_attempts.reset",
      entityId: attemptId,
      entityType: "quiz_attempts",
      metadata: {
        event_type: parsed.data.eventType,
        warning_count: result.warningCount,
      },
    });
  }

  return NextResponse.json(result);
}
