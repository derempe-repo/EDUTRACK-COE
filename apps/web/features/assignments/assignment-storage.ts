import { sanitizeStorageFileName } from "../classes/material-storage";
import { isAllowedLmsFile } from "../files/lms-file-types";

export const ASSIGNMENT_ATTACHMENT_FILE_SIZE_LIMIT = 25 * 1024 * 1024;
export const ASSIGNMENT_ATTACHMENTS_BUCKET = "materials";

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
    return "Ukuran file tugas maksimal 25 MB.";
  }

  if (!isAllowedLmsFile(file)) {
    return "Format lampiran tugas belum didukung.";
  }

  return null;
}
