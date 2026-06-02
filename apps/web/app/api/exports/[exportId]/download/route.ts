import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { classes, exports } from "@/db/schema";
import { EXPORTS_BUCKET } from "@/features/exports/storage";
import { getCurrentProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type ExportDownloadRouteContext = {
  params: Promise<{
    exportId: string;
  }>;
};

export async function GET(_request: Request, context: ExportDownloadRouteContext) {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { exportId } = await context.params;
  const rows = await db
    .select({
      classOwnerId: classes.createdBy,
      fileName: exports.fileName,
      fileStoragePath: exports.fileStoragePath,
      requestedBy: exports.requestedBy,
      status: exports.status,
    })
    .from(exports)
    .innerJoin(classes, eq(classes.id, exports.classId))
    .where(eq(exports.id, exportId))
    .limit(1);
  const exportItem = rows[0] ?? null;

  if (
    !exportItem ||
    exportItem.status !== "completed" ||
    !exportItem.fileStoragePath ||
    !exportItem.fileName
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDownload =
    exportItem.requestedBy === profile.id ||
    exportItem.classOwnerId === profile.id ||
    profile.role === "admin" ||
    profile.role === "super_admin";

  if (!canDownload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(exportItem.fileStoragePath, 300, {
      download: exportItem.fileName,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to create signed URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
