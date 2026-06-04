import { and, eq, ne } from "drizzle-orm";

import {
  notifications,
  plagiarismChecks,
  plagiarismMatches,
  submissions,
  systemSettings,
} from "@/db/schema";
import { db } from "@/lib/db";

import { compareSubmissionAgainstCandidates } from "./detector";
import { extractSubmissionContent } from "./extractor";
import { hashFileContent, hashTextContent } from "./hashing";
import { normalizeSubmissionText } from "./similarity";

const DEFAULT_THRESHOLD_PERCENT = 70;

type RunPlagiarismCheckInput = {
  assignmentId: string;
  assignmentTitle: string;
  file: File;
  lecturerId: string;
  note: string | null;
  studentId: string;
  studentName: string;
  statusWhenNotFlagged?: "keep" | "submitted";
  submissionId: string;
};

function readThreshold(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
    ? value
    : DEFAULT_THRESHOLD_PERCENT;
}

export async function getPlagiarismThresholdPercent() {
  const rows = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "plagiarism_threshold_percent"))
    .limit(1);

  return readThreshold(rows[0]?.value);
}

export async function runPlagiarismCheck({
  assignmentId,
  assignmentTitle,
  file,
  lecturerId,
  note,
  studentId,
  studentName,
  statusWhenNotFlagged = "submitted",
  submissionId,
}: RunPlagiarismCheckInput) {
  const [extraction, thresholdPercent] = await Promise.all([
    extractSubmissionContent(file, note),
    getPlagiarismThresholdPercent(),
  ]);
  const fileHash = await hashFileContent(file);
  const submissionText = normalizeSubmissionText(extraction.text);
  const textHash = hashTextContent(submissionText);
  const candidates = await db
    .select({
      fileHash: submissions.fileHash,
      id: submissions.id,
      submissionText: submissions.submissionText,
      textHash: submissions.textHash,
    })
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), ne(submissions.id, submissionId)));
  const { detectionMethod, matches, similarityScore, status } =
    compareSubmissionAgainstCandidates({
      candidates,
      extractionStatus: extraction.status,
      fileHash,
      submissionText,
      textHash,
      thresholdPercent,
    });
  const now = new Date();
  const submissionUpdate = {
    fileHash,
    plagiarismStatus: status,
    submissionText,
    textHash,
    updatedAt: now,
    ...(status === "flagged"
      ? { status: "locked" as const }
      : statusWhenNotFlagged === "submitted"
        ? { status: "submitted" as const }
        : {}),
  };

  await db
    .update(submissions)
    .set(submissionUpdate)
    .where(eq(submissions.id, submissionId));

  const [check] = await db
    .insert(plagiarismChecks)
    .values({
      checkedAt: now,
      extractionError: extraction.error,
      extractionStatus: extraction.status,
      detectionMethod,
      similarityScore,
      status,
      submissionId,
      thresholdPercent,
    })
    .onConflictDoUpdate({
      target: plagiarismChecks.submissionId,
      set: {
        checkedAt: now,
        extractionError: extraction.error,
        extractionStatus: extraction.status,
        detectionMethod,
        similarityScore,
        status,
        thresholdPercent,
        updatedAt: now,
      },
    })
    .returning({ id: plagiarismChecks.id });

  await db.delete(plagiarismMatches).where(eq(plagiarismMatches.checkId, check.id));

  if (matches.length > 0) {
    await db.insert(plagiarismMatches).values(
      matches.map((match) => ({
        checkId: check.id,
        ...match,
      })),
    );
  }

  if (status === "flagged") {
    await db.insert(notifications).values([
      {
        body: `Submission tugas "${assignmentTitle}" memiliki similarity ${similarityScore}% dan perlu ditinjau dosen.`,
        entityId: submissionId,
        entityType: "plagiarism_checks",
        recipientId: studentId,
        title: "Submission perlu ditinjau",
      },
      {
        body: `Submission ${studentName} untuk "${assignmentTitle}" terdeteksi memiliki similarity ${similarityScore}%.`,
        entityId: submissionId,
        entityType: "plagiarism_checks",
        recipientId: lecturerId,
        title: "Similarity tugas terdeteksi",
      },
    ]);
  } else if (status === "needs_review") {
    await db.insert(notifications).values([
      {
        body: `Submission tugas "${assignmentTitle}" belum bisa diekstrak penuh dan perlu cek manual dosen.`,
        entityId: submissionId,
        entityType: "plagiarism_checks",
        recipientId: lecturerId,
        title: "Submission perlu cek manual",
      },
    ]);
  }

  return {
    checkId: check.id,
    detectionMethod,
    extractionStatus: extraction.status,
    fileHash,
    similarityScore,
    status,
    textHash,
    thresholdPercent,
  };
}
