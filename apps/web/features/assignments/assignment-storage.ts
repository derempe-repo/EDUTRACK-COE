import { sanitizeStorageFileName } from "../classes/material-storage";

export const ASSIGNMENT_ATTACHMENT_FILE_SIZE_LIMIT = 10 * 1024 * 1024;
export const ASSIGNMENT_ATTACHMENTS_BUCKET = "materials";

const allowedMimeTypes = new Set(["application/pdf"]);

export function buildAssignmentAttachmentStoragePath({
  classId,
  fileName,
  moduleId,
  token,
}: {
  classId: string;
  fileName: string;
  moduleId: string;
  token: string;
}) {
  return `${classId}/${moduleId}/assignments/${token}-${sanitizeStorageFileName(fileName)}`;
}

export function validateAssignmentAttachmentFile(file: File) {
  if (file.size <= 0) {
    return "File tugas kosong.";
  }

  if (file.size > ASSIGNMENT_ATTACHMENT_FILE_SIZE_LIMIT) {
    return "Ukuran file tugas maksimal 10 MB.";
  }

  if (!allowedMimeTypes.has(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Lampiran tugas harus berupa PDF.";
  }

  return null;
}
