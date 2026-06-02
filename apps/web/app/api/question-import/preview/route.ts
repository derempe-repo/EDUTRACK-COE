import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { classes, modules, moduleSteps, questions } from "@/db/schema";
import {
  addExistingQuestionErrors,
  MAX_QUESTION_IMPORT_FILE_SIZE,
  parseQuestionImportWorkbook,
} from "@/features/quizzes/question-import";
import { getCurrentProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "@/lib/validators";

const spreadsheetMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (profile.role !== "dosen") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const parsed = z.object({ stepId: z.uuid() }).safeParse({
    stepId: formData.get("stepId"),
  });
  const file = formData.get("file");

  if (!parsed.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Pilih step dan file Excel terlebih dahulu." }, { status: 400 });
  }

  if (
    file.size <= 0 ||
    file.size > MAX_QUESTION_IMPORT_FILE_SIZE ||
    (!file.name.toLowerCase().endsWith(".xlsx") && file.type !== spreadsheetMimeType)
  ) {
    return NextResponse.json({ error: "Gunakan file .xlsx maksimal 2 MB." }, { status: 400 });
  }

  const stepRows = await db
    .select({ id: moduleSteps.id })
    .from(moduleSteps)
    .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
    .innerJoin(classes, eq(classes.id, modules.classId))
    .where(and(eq(moduleSteps.id, parsed.data.stepId), eq(classes.createdBy, profile.id)))
    .limit(1);

  if (!stepRows[0]) {
    return NextResponse.json({ error: "Step tidak ditemukan." }, { status: 404 });
  }

  const existingQuestions = await db
    .select({ questionText: questions.questionText })
    .from(questions)
    .where(eq(questions.moduleStepId, parsed.data.stepId));
  const preview = await parseQuestionImportWorkbook(Buffer.from(await file.arrayBuffer()));

  return NextResponse.json(
    addExistingQuestionErrors(
      preview,
      existingQuestions.map((question) => question.questionText),
    ),
  );
}
