import { NextResponse } from "next/server";

import { profiles } from "@/db/schema";
import { getMahasiswaClassDetail } from "@/features/classes/data";
import { extractIdFromSlugParam } from "@/features/classes/urls";
import { isMaintenanceJobAuthorized } from "@/features/jobs/maintenance-auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isAuthorized = isMaintenanceJobAuthorized({
    authorizationHeader: request.headers.get("authorization"),
    configuredSecret: process.env.TRIGGER_SECRET_KEY,
    dryRun: false,
    nodeEnv: process.env.NODE_ENV,
    secretHeader: request.headers.get("x-job-secret"),
  });

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized debug request" }, { status: 401 });
  }

  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const classParam = url.searchParams.get("classId")?.trim();

  if (!email || !classParam) {
    return NextResponse.json({ error: "Missing email or classId" }, { status: 400 });
  }

  const profile = (
    await db
      .select({ id: profiles.id, role: profiles.role, status: profiles.status })
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1)
  )[0];

  if (!profile) {
    return NextResponse.json({ ok: false, reason: "profile_not_found" }, { status: 404 });
  }

  const classId = extractIdFromSlugParam(classParam);
  const data = await getMahasiswaClassDetail(profile.id, classId);

  return NextResponse.json({
    ok: true,
    classFound: Boolean(data),
    classId,
    moduleCount: data?.modules.length ?? 0,
    modules: data?.modules.map((moduleItem) => ({
      finalExam: Boolean(moduleItem.finalExam),
      id: moduleItem.id,
      isLocked: moduleItem.isLocked,
      stepCount: moduleItem.steps.length,
      title: moduleItem.title,
    })),
    profile,
    progress: data?.classProgress ?? null,
  });
}
