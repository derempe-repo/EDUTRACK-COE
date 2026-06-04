import { NextResponse } from "next/server";

import { isMaintenanceJobAuthorized } from "@/features/jobs/maintenance-auth";
import { runLightMaintenanceJob } from "@/features/jobs/maintenance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const isAuthorized = isMaintenanceJobAuthorized({
    authorizationHeader: request.headers.get("authorization"),
    configuredSecret: process.env.TRIGGER_SECRET_KEY,
    dryRun,
    nodeEnv: process.env.NODE_ENV,
    secretHeader: request.headers.get("x-job-secret"),
  });

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized maintenance job request" }, { status: 401 });
  }

  const result = await runLightMaintenanceJob({ dryRun });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
