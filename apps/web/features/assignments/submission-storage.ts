import { isAllowedLmsFile } from "../files/lms-file-types";

export const SUBMISSIONS_BUCKET = "submissions";
export const SUBMISSION_FILE_SIZE_LIMIT = 50 * 1024 * 1024;

export function sanitizeSubmissionFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return normalized.length > 0 ? normalized.slice(0, 120) : "submission";
}

export function buildSubmissionStoragePath({
  assignmentId,
  classId,
  fileName,
  studentId,
  token,
}: {
  assignmentId: string;
  classId: string;
  fileName: string;
  studentId: string;
  token: string;
}) {
  return `${classId}/${assignmentId}/${studentId}/${token}-${sanitizeSubmissionFileName(fileName)}`;
}

export function validateSubmissionFile(file: File) {
  if (file.size <= 0) {
    return "File submission kosong.";
  }

  if (file.size > SUBMISSION_FILE_SIZE_LIMIT) {
    return "Ukuran file submission maksimal 50 MB.";
  }

  if (!isAllowedLmsFile(file)) {
    return "Format file submission belum didukung.";
  }

  return null;
}
