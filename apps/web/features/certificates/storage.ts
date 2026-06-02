export const CERTIFICATES_BUCKET = "certificates";

export function buildCertificateStoragePath({
  certificateNumber,
  classId,
  studentId,
}: {
  certificateNumber: string;
  classId: string;
  studentId: string;
}) {
  return `${classId}/${studentId}/${certificateNumber}.pdf`;
}
