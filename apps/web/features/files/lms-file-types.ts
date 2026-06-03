export const LMS_ALLOWED_FILE_DESCRIPTION =
  "PDF, Word, Excel, PowerPoint, TXT/MD, CSV, ZIP/RAR/7Z, gambar, dan file kode TI seperti HTML, CSS, JS, TS, PHP, Python, Java, C/C++, SQL, JSON, XML, YAML.";

export const LMS_FILE_ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".md",
  ".csv",
  ".zip",
  ".rar",
  ".7z",
  ".html",
  ".htm",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".xml",
  ".yml",
  ".yaml",
  ".sql",
  ".php",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".cs",
  ".go",
  ".rs",
  ".kt",
  ".swift",
  ".sh",
  ".bat",
  ".ps1",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/json",
  "application/xml",
  "application/javascript",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "image/png",
  "image/jpeg",
  "image/webp",
].join(",");

const allowedExtensions = new Set(
  LMS_FILE_ACCEPT.split(",").filter((item) => item.startsWith(".")),
);

const allowedMimeTypes = new Set(
  LMS_FILE_ACCEPT.split(",").filter((item) => !item.startsWith(".")),
);

export function getFileExtension(fileName: string) {
  return fileName.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase() ?? "";
}

export function isAllowedLmsFile(file: File) {
  return allowedMimeTypes.has(file.type) || allowedExtensions.has(getFileExtension(file.name));
}

export function getUploadContentType(file: File) {
  return file.type || "application/octet-stream";
}
