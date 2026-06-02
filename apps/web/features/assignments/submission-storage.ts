export const SUBMISSIONS_BUCKET = "submissions";
export const SUBMISSION_FILE_SIZE_LIMIT = 20 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/javascript",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/octet-stream",
  "text/css",
  "text/html",
  "text/javascript",
  "text/markdown",
  "text/plain",
]);

const allowedExtensions = new Set([
  ".pdf",
  ".zip",
  ".rar",
  ".txt",
  ".md",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".html",
  ".css",
  ".json",
]);

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
    return "Ukuran file submission maksimal 20 MB.";
  }

  const fileName = file.name.toLowerCase();
  const hasAllowedExtension = [...allowedExtensions].some((extension) =>
    fileName.endsWith(extension),
  );

  if (!allowedMimeTypes.has(file.type) && !hasAllowedExtension) {
    return "Gunakan file PDF, ZIP/RAR, TXT/MD, atau file source code web.";
  }

  return null;
}
