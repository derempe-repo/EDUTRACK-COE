import { isAllowedLmsFile } from "../files/lms-file-types";

export const MATERIALS_BUCKET = "materials";
export const MATERIAL_FILE_SIZE_LIMIT = 4 * 1024 * 1024;

const allowedMimeTypesByType = {
  pdf: new Set(["application/pdf"]),
  slide: new Set([
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]),
  file: null,
} as const;

export type UploadableMaterialType = keyof typeof allowedMimeTypesByType;

export function sanitizeStorageFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return normalized.length > 0 ? normalized.slice(0, 120) : "materi";
}

export function buildMaterialStoragePath({
  classId,
  moduleId,
  fileName,
  token,
}: {
  classId: string;
  moduleId: string;
  fileName: string;
  token: string;
}) {
  return `${classId}/${moduleId}/${token}-${sanitizeStorageFileName(fileName)}`;
}

export function buildMaterialDownloadFileName({
  storagePath,
  title,
}: {
  storagePath: string;
  title: string;
}) {
  const storageFileName = storagePath.split("/").pop() ?? "";
  const extension = storageFileName.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase() ?? "";
  const sanitizedTitle = sanitizeStorageFileName(title);

  if (!extension) {
    return sanitizedTitle;
  }

  if (sanitizedTitle.toLowerCase().endsWith(extension)) {
    return sanitizedTitle;
  }

  const titleWithoutExtension = sanitizedTitle.replace(/\.[a-z0-9]{1,10}$/i, "") || "materi";

  return `${titleWithoutExtension}${extension}`;
}

export function validateMaterialFile({
  file,
  type,
}: {
  file: File;
  type: UploadableMaterialType;
}) {
  if (file.size <= 0) {
    return "File materi kosong.";
  }

  if (file.size > MATERIAL_FILE_SIZE_LIMIT) {
    return "Ukuran file materi maksimal 4 MB.";
  }

  if (type === "file") {
    if (!isAllowedLmsFile(file)) {
      return "Format file materi belum didukung.";
    }

    return null;
  }

  if (!allowedMimeTypesByType[type].has(file.type)) {
    return type === "pdf"
      ? "Materi PDF harus memakai file PDF."
      : "Materi slide harus memakai file PDF, PPT, atau PPTX.";
  }

  return null;
}
