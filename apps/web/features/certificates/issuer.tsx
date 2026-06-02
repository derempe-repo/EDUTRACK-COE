import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";

import {
  assignments,
  certificates,
  classes,
  grades,
  moduleSteps,
  modules,
  notifications,
  profiles,
  submissions,
} from "@/db/schema";
import { CertificateDocument } from "@/features/certificates/certificate-document";
import { evaluateCertificateRule } from "@/features/certificates/rules";
import {
  buildCertificateStoragePath,
  CERTIFICATES_BUCKET,
} from "@/features/certificates/storage";
import { getMahasiswaClassDetail } from "@/features/classes/data";
import { calculateWeightedClassScore } from "@/features/grades/class-score";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

function createCertificateNumber(certificateId: string, issuedAt: Date) {
  return `LMS-${issuedAt.getFullYear()}-${certificateId.slice(0, 8).toUpperCase()}`;
}

function getPublicAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export async function issueEligibleCertificate(
  studentId: string,
  classId: string,
  options?: { forceRegenerate?: boolean },
) {
  const data = await getMahasiswaClassDetail(studentId, classId);

  if (!data) {
    return { issued: false, reason: "class_not_found" } as const;
  }

  const [classRows, gradeRows, plagiarismRows, acceptedSubmissionRows, studentRows] = await Promise.all([
    db
      .select({
        assignmentWeight: classes.assignmentWeight,
        finalExamWeight: classes.finalExamWeight,
        quizWeight: classes.quizWeight,
      })
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1),
    db
      .select({
        maxScore: grades.maxScore,
        score: grades.score,
        sourceType: grades.sourceType,
      })
      .from(grades)
      .where(and(eq(grades.classId, classId), eq(grades.studentId, studentId))),
    db
      .select({
        plagiarismStatus: submissions.plagiarismStatus,
      })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(and(eq(modules.classId, classId), eq(submissions.studentId, studentId))),
    db
      .select({
        maxScore: assignments.maxScore,
        score: submissions.score,
      })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(moduleSteps, eq(moduleSteps.id, assignments.moduleStepId))
      .innerJoin(modules, eq(modules.id, moduleSteps.moduleId))
      .where(
        and(
          eq(modules.classId, classId),
          eq(submissions.studentId, studentId),
          eq(submissions.status, "accepted"),
        ),
      ),
    db
      .select({
        name: profiles.name,
      })
      .from(profiles)
      .where(eq(profiles.id, studentId))
      .limit(1),
  ]);
  const classItem = classRows[0] ?? null;
  const student = studentRows[0] ?? null;

  if (!classItem || !student) {
    return { issued: false, reason: "student_not_found" } as const;
  }
  const score = calculateWeightedClassScore({
    assignmentScores: acceptedSubmissionRows
      .filter((submission) => submission.score !== null)
      .map((submission) => ({ maxScore: submission.maxScore, score: Number(submission.score) })),
    assignmentWeight: classItem.assignmentWeight,
    finalExamScores: gradeRows
      .filter((grade) => grade.sourceType === "final_exam")
      .map((grade) => ({ maxScore: grade.maxScore, score: grade.score })),
    finalExamWeight: classItem.finalExamWeight,
    quizScores: gradeRows
      .filter((grade) => grade.sourceType === "quiz")
      .map((grade) => ({ maxScore: grade.maxScore, score: grade.score })),
    quizWeight: classItem.quizWeight,
  });
  const finalScore = score.finalScore;
  const rule = evaluateCertificateRule({
    finalScore,
    hasRejectedPermanentSubmission: plagiarismRows.some(
      (submission) => submission.plagiarismStatus === "rejected_permanent",
    ),
    progressPercent: data.classProgress.percent,
  });
  const now = new Date();
  const metadata = {
    checks: rule.checks,
    gradeBreakdown: score,
    gradeWeights: classItem,
    finalScore,
    modules: data.modules.map((moduleItem) => ({
      id: moduleItem.id,
      percent: moduleItem.completion.percent,
      title: moduleItem.title,
    })),
    progressPercent: data.classProgress.percent,
    syncedAt: now.toISOString(),
  };
  let certificate: {
    certificateNumber: string | null;
    id: string;
    pdfStoragePath: string | null;
    status: "draft" | "issued" | "revoked";
    verificationToken: string | null;
  } | null = data.certificate
    ? {
        certificateNumber: data.certificate.certificateNumber,
        id: data.certificate.id,
        pdfStoragePath: data.certificate.pdfStoragePath,
        status: data.certificate.status,
        verificationToken: data.certificate.verificationToken,
      }
    : null;

  if (!certificate) {
    const [createdCertificate] = await db
      .insert(certificates)
      .values({
        classId,
        eligibleAt: rule.isEligible ? now : null,
        metadata,
        status: "draft",
        studentId,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [certificates.classId, certificates.studentId],
      })
      .returning({
        certificateNumber: certificates.certificateNumber,
        id: certificates.id,
        pdfStoragePath: certificates.pdfStoragePath,
        status: certificates.status,
        verificationToken: certificates.verificationToken,
      });

    certificate =
      createdCertificate ??
      (
        await db
          .select({
            certificateNumber: certificates.certificateNumber,
            id: certificates.id,
            pdfStoragePath: certificates.pdfStoragePath,
            status: certificates.status,
            verificationToken: certificates.verificationToken,
          })
          .from(certificates)
          .where(and(eq(certificates.classId, classId), eq(certificates.studentId, studentId)))
          .limit(1)
      )[0] ??
      null;
  }

  if (!certificate || certificate.status === "revoked") {
    return { issued: false, reason: "certificate_revoked" } as const;
  }

  if (certificate.status === "issued" && !options?.forceRegenerate) {
    return { certificateId: certificate.id, issued: false, reason: "already_issued" } as const;
  }

  await db
    .update(certificates)
    .set({
      eligibleAt: rule.isEligible ? now : null,
      metadata,
      updatedAt: now,
    })
    .where(eq(certificates.id, certificate.id));

  if (!rule.isEligible) {
    return { certificateId: certificate.id, issued: false, reason: "requirements_not_met" } as const;
  }

  const wasAlreadyIssued = certificate.status === "issued";
  const certificateNumber = certificate.certificateNumber ?? createCertificateNumber(certificate.id, now);
  const verificationToken = certificate.verificationToken ?? randomUUID().replaceAll("-", "");
  const verificationUrl = `${getPublicAppUrl()}/verify-certificate/${verificationToken}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
  const pdfBuffer = await renderToBuffer(
    <CertificateDocument
      certificateNumber={certificateNumber}
      classTitle={data.classItem.title}
      issuedAt={now}
      qrDataUrl={qrDataUrl}
      studentName={student.name}
      verificationUrl={verificationUrl}
    />,
  );
  const storagePath = buildCertificateStoragePath({
    certificateNumber,
    classId,
    studentId,
  });
  const supabase = await createClient();
  const { error } = await supabase.storage.from(CERTIFICATES_BUCKET).upload(storagePath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    throw new Error(`Certificate upload failed: ${error.message}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(certificates)
      .set({
        certificateNumber,
        eligibleAt: now,
        issuedAt: now,
        metadata: {
          ...metadata,
          verificationUrl,
        },
        pdfStoragePath: storagePath,
        status: "issued",
        updatedAt: now,
        verificationToken,
      })
      .where(eq(certificates.id, certificate.id));

    if (!wasAlreadyIssued) {
      await tx.insert(notifications).values({
        body: `Sertifikat kelulusan kelas "${data.classItem.title}" sudah tersedia untuk diunduh.`,
        entityId: certificate.id,
        entityType: "certificates",
        recipientId: studentId,
        title: "Sertifikat diterbitkan",
      });
    }
  });

  return {
    certificateId: certificate.id,
    certificateNumber,
    issued: true,
  } as const;
}

export async function tryIssueEligibleCertificate(studentId: string, classId: string) {
  try {
    return await issueEligibleCertificate(studentId, classId);
  } catch (error) {
    console.error("Unable to issue certificate", {
      classId,
      error,
      studentId,
    });

    return { issued: false, reason: "issue_failed" } as const;
  }
}
