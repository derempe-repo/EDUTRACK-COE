import { and, eq, isNotNull, ne } from "drizzle-orm";

import {
  notifications,
  plagiarismChecks,
  plagiarismMatches,
  submissions,
  systemSettings,
} from "@/db/schema";
import { db } from "@/lib/db";

import { extractSubmissionContent } from "./extractor";
import { calculateJaccardSimilarity, normalizeSubmissionText } from "./similarity";

const DEFAULT_THRESHOLD_PERCENT = 70;
const MIN_RECORDED_MATCH_PERCENT = 1;
const MAX_RECORDED_MATCHES = 10;

type RunPlagiarismCheckInput = {
  assignmentId: string;
  assignmentTitle: string;
  file: File;
  lecturerId: string;
  note: string | null;
  studentId: string;
  studentName: string;
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
  submissionId,
}: RunPlagiarismCheckInput) {
  const [extraction, thresholdPercent] = await Promise.all([
    extractSubmissionContent(file, note),
    getPlagiarismThresholdPercent(),
  ]);
  const submissionText = normalizeSubmissionText(extraction.text);
  const candidates = submissionText
    ? await db
        .select({
          id: submissions.id,
          submissionText: submissions.submissionText,
        })
        .from(submissions)
        .where(
          and(
            eq(submissions.assignmentId, assignmentId),
            ne(submissions.id, submissionId),
            isNotNull(submissions.submissionText),
          ),
        )
    : [];
  const matches = candidates
    .map((candidate) => ({
      matchedSubmissionId: candidate.id,
      similarityScore: calculateJaccardSimilarity(submissionText, candidate.submissionText ?? ""),
    }))
    .filter((match) => match.similarityScore >= MIN_RECORDED_MATCH_PERCENT)
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, MAX_RECORDED_MATCHES);
  const similarityScore = matches[0]?.similarityScore ?? 0;
  const status = similarityScore >= thresholdPercent ? "flagged" : "passed";
  const now = new Date();

  await db
    .update(submissions)
    .set({
      plagiarismStatus: status,
      status: status === "flagged" ? "locked" : "submitted",
      submissionText,
      updatedAt: now,
    })
    .where(eq(submissions.id, submissionId));

  const [check] = await db
    .insert(plagiarismChecks)
    .values({
      checkedAt: now,
      extractionError: extraction.error,
      extractionStatus: extraction.status,
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
  }

  return {
    checkId: check.id,
    extractionStatus: extraction.status,
    similarityScore,
    status,
    thresholdPercent,
  };
}
