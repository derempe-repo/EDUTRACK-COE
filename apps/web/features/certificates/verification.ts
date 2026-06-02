import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import {
  certificates,
  certificateVerifications,
  classes,
  profiles,
} from "@/db/schema";
import { db } from "@/lib/db";

export async function verifyCertificateToken(token: string) {
  const normalizedToken = token.trim().slice(0, 128);
  const rows = normalizedToken
    ? await db
        .select({
          certificateNumber: certificates.certificateNumber,
          classTitle: classes.title,
          id: certificates.id,
          issuedAt: certificates.issuedAt,
          revokedAt: certificates.revokedAt,
          status: certificates.status,
          studentName: profiles.name,
        })
        .from(certificates)
        .innerJoin(classes, eq(classes.id, certificates.classId))
        .innerJoin(profiles, eq(profiles.id, certificates.studentId))
        .where(eq(certificates.verificationToken, normalizedToken))
        .limit(1)
    : [];
  const certificate = rows[0] ?? null;
  const result = certificate
    ? certificate.status === "revoked"
      ? "revoked"
      : certificate.status === "issued"
        ? "valid"
        : "not_found"
    : "not_found";
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  await db.insert(certificateVerifications).values({
    certificateId: certificate?.id ?? null,
    ipAddress: forwardedFor?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip"),
    result,
    userAgent: headerStore.get("user-agent"),
    verificationToken: normalizedToken || "-",
  });

  return {
    certificate,
    result,
  };
}
