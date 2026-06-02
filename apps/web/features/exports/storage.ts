export const EXPORTS_BUCKET = "exports";

export function buildExportStoragePath({
  exportId,
  fileName,
  requesterId,
}: {
  exportId: string;
  fileName: string;
  requesterId: string;
}) {
  return `${requesterId}/${exportId}/${fileName}`;
}
