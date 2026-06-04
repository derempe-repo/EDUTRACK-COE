import { calculateJaccardSimilarity } from "./similarity";

const MIN_RECORDED_MATCH_PERCENT = 1;
const MAX_RECORDED_MATCHES = 10;

export type PlagiarismDetectionMethod =
  | "exact_file"
  | "exact_text"
  | "extraction_failed"
  | "none"
  | "text_similarity";

export type PlagiarismCheckStatus = "flagged" | "needs_review" | "passed";

export type CandidateSubmission = {
  fileHash: string | null;
  id: string;
  submissionText: string | null;
  textHash: string | null;
};

export function compareSubmissionAgainstCandidates({
  candidates,
  extractionStatus,
  fileHash,
  submissionText,
  textHash,
  thresholdPercent,
}: {
  candidates: CandidateSubmission[];
  extractionStatus: "extracted" | "failed" | "fallback";
  fileHash: string;
  submissionText: string;
  textHash: string | null;
  thresholdPercent: number;
}) {
  const matchBySubmissionId = new Map<
    string,
    {
      detectionMethod: PlagiarismDetectionMethod;
      matchedSubmissionId: string;
      similarityScore: number;
    }
  >();

  for (const candidate of candidates) {
    const exactFileMatch = candidate.fileHash && candidate.fileHash === fileHash;
    const exactTextMatch = textHash && candidate.textHash && candidate.textHash === textHash;
    const similarityScore =
      submissionText && candidate.submissionText
        ? calculateJaccardSimilarity(submissionText, candidate.submissionText)
        : 0;
    const scoredMatches = [
      exactFileMatch
        ? ({
            detectionMethod: "exact_file" as const,
            matchedSubmissionId: candidate.id,
            similarityScore: 100,
          })
        : null,
      exactTextMatch
        ? ({
            detectionMethod: "exact_text" as const,
            matchedSubmissionId: candidate.id,
            similarityScore: 100,
          })
        : null,
      similarityScore >= MIN_RECORDED_MATCH_PERCENT
        ? ({
            detectionMethod: "text_similarity" as const,
            matchedSubmissionId: candidate.id,
            similarityScore,
          })
        : null,
    ].filter((match) => match !== null);
    const bestMatch = scoredMatches.sort(
      (left, right) => right.similarityScore - left.similarityScore,
    )[0];

    if (bestMatch) {
      matchBySubmissionId.set(candidate.id, bestMatch);
    }
  }

  const matches = [...matchBySubmissionId.values()]
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, MAX_RECORDED_MATCHES);
  const similarityScore = matches[0]?.similarityScore ?? 0;
  const detectionMethod: PlagiarismDetectionMethod =
    matches[0]?.detectionMethod ??
    (extractionStatus === "extracted" ? "none" : "extraction_failed");
  const status: PlagiarismCheckStatus =
    similarityScore >= thresholdPercent
      ? "flagged"
      : extractionStatus === "extracted"
        ? "passed"
        : "needs_review";

  return {
    detectionMethod,
    matches,
    similarityScore,
    status,
  };
}
