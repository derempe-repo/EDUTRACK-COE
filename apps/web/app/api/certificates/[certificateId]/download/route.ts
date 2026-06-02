import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { certificates, classes } from "@/db/schema";
import { CERTIFICATES_BUCKET } from "@/features/certificates/storage";
import { getCurrentProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type CertificateDownloadRouteContext = {
  params: Promise<{
    certificateId: string;
  }>;
};

export async function GET(_request: Request, context: CertificateDownloadRouteContext) {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { certificateId } = await context.params;
  const rows = await db
    .select({
      certificateNumber: certificates.certificateNumber,
      classOwnerId: classes.createdBy,
      pdfStoragePath: certificates.pdfStoragePath,
      status: certificates.status,
      studentId: certificates.studentId,
    })
    .from(certificates)
    .innerJoin(classes, eq(classes.id, certificates.classId))
    .where(eq(certificates.id, certificateId))
    .limit(1);
  const certificate = rows[0] ?? null;

  if (!certificate || !certificate.pdfStoragePath || !certificate.certificateNumber) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDownload =
    certificate.studentId === profile.id ||
    certificate.classOwnerId === profile.id ||
    profile.role === "admin" ||
    profile.role === "super_admin";

  if (!canDownload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CERTIFICATES_BUCKET)
    .createSignedUrl(certificate.pdfStoragePath, 300, {
      download: `${certificate.certificateNumber}.pdf`,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to create signed URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
