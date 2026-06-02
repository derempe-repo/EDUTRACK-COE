import { NextResponse } from "next/server";

import { buildQuestionImportTemplate } from "@/features/quizzes/question-import-template";
import { getCurrentProfile } from "@/lib/auth";

export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (profile.role !== "dosen") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse(await buildQuestionImportTemplate(), {
    headers: {
      "Content-Disposition": 'attachment; filename="template-import-bank-soal.xlsx"',
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

export const dynamic = "force-dynamic";
