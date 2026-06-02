"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { certificates, classes, notifications } from "@/db/schema";
import { issueEligibleCertificate } from "@/features/certificates/issuer";
import { getMahasiswaClassDetail } from "@/features/classes/data";
import { getDosenClassReportsPath, getMahasiswaClassPath } from "@/features/classes/urls";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "@/lib/validators";

export async function syncCertificateEligibilityAction(formData: FormData) {
  const profile = await requireRole(["mahasiswa"]);
  const parsed = z.object({ classId: z.uuid() }).safeParse({
    classId: formData.get("classId"),
  });

  if (!parsed.success) {
    redirect("/mahasiswa/dashboard?error=class_required");
  }

  const data = await getMahasiswaClassDetail(profile.id, parsed.data.classId);

  if (!data) {
    redirect("/mahasiswa/dashboard?error=class_not_found");
  }

  const path = getMahasiswaClassPath(data.classItem);
  const result = await issueEligibleCertificate(profile.id, parsed.data.classId);

  if (!result.issued && result.reason !== "already_issued") {
    redirect(`${path}?error=certificate_not_ready`);
  }

  await writeAuditLog({
    action: "certificates.issue_requested",
    entityId: result.certificateId,
    entityType: "certificates",
    metadata: {
      class_id: parsed.data.classId,
      source: "student",
    },
  });

  revalidatePath(path);
  redirect(`${path}?certificate_issued=1`);
}

export async function issueCertificateAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      classId: z.uuid(),
      studentId: z.uuid(),
    })
    .safeParse({
      classId: formData.get("classId"),
      studentId: formData.get("studentId"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_certificate");
  }

  const classRows = await db
    .select({
      id: classes.id,
      title: classes.title,
    })
    .from(classes)
    .where(and(eq(classes.id, parsed.data.classId), eq(classes.createdBy, profile.id)))
    .limit(1);
  const classItem = classRows[0] ?? null;

  if (!classItem) {
    redirect("/dosen/dashboard?error=class_not_found");
  }

  const result = await issueEligibleCertificate(parsed.data.studentId, parsed.data.classId);
  const classPath = getDosenClassReportsPath(classItem);

  if (!result.issued && result.reason !== "already_issued") {
    redirect(`${classPath}?error=certificate_not_ready`);
  }

  await writeAuditLog({
    action: "certificates.issued",
    entityId: result.certificateId,
    entityType: "certificates",
    metadata: {
      class_id: parsed.data.classId,
      source: "lecturer",
      student_id: parsed.data.studentId,
    },
  });

  revalidatePath(classPath);
  redirect(`${classPath}?certificate_issued=1`);
}

export async function regenerateCertificatePdfAction(formData: FormData) {
  const profile = await requireRole(["dosen"]);
  const parsed = z
    .object({
      classId: z.uuid(),
      studentId: z.uuid(),
    })
    .safeParse({
      classId: formData.get("classId"),
      studentId: formData.get("studentId"),
    });

  if (!parsed.success) {
    redirect("/dosen/dashboard?error=invalid_certificate");
  }

  const classRows = await db
    .select({
      id: classes.id,
      title: classes.title,
    })
    .from(classes)
    .where(and(eq(classes.id, parsed.data.classId), eq(classes.createdBy, profile.id)))
    .limit(1);
  const classItem = classRows[0] ?? null;

  if (!classItem) {
    redirect("/dosen/dashboard?error=class_not_found");
  }

  const result = await issueEligibleCertificate(parsed.data.studentId, parsed.data.classId, {
    forceRegenerate: true,
  });
  const classPath = getDosenClassReportsPath(classItem);

  if (!result.issued) {
    redirect(`${classPath}?error=certificate_not_ready`);
  }

  await writeAuditLog({
    action: "certificates.pdf_regenerated",
    entityId: result.certificateId,
    entityType: "certificates",
    metadata: {
      class_id: parsed.data.classId,
      student_id: parsed.data.studentId,
    },
  });

  revalidatePath(classPath);
  redirect(`${classPath}?certificate_regenerated=1`);
}

export async function revokeCertificateAction(formData: FormData) {
  const profile = await requireRole(["admin", "super_admin"]);
  const parsed = z.object({ certificateId: z.uuid() }).safeParse({
    certificateId: formData.get("certificateId"),
  });

  if (!parsed.success) {
    redirect("/admin/dashboard?error=invalid_certificate");
  }

  const now = new Date();
  const rows = await db
    .update(certificates)
    .set({
      revokedAt: now,
      status: "revoked",
      updatedAt: now,
    })
    .where(eq(certificates.id, parsed.data.certificateId))
    .returning({
      id: certificates.id,
      studentId: certificates.studentId,
    });
  const certificate = rows[0] ?? null;

  if (!certificate) {
    redirect("/admin/dashboard?error=certificate_not_found");
  }

  await db.insert(notifications).values({
    body: "Sertifikat digital Anda dicabut oleh administrator. Hubungi pengelola LMS untuk informasi lebih lanjut.",
    entityId: certificate.id,
    entityType: "certificates",
    recipientId: certificate.studentId,
    title: "Sertifikat dicabut",
  });

  await writeAuditLog({
    action: "certificates.revoked",
    entityId: certificate.id,
    entityType: "certificates",
    metadata: {
      actor_role: profile.role,
    },
  });

  redirect("/admin/dashboard?certificate_revoked=1");
}
