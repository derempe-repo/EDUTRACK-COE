export type CertificateEligibilityInput = {
  completed: number;
  modulePercents: number[];
  total: number;
};

export type CertificateEligibilityResult = {
  isEligible: boolean;
  missingCount: number;
  percent: number;
  total: number;
};

export function getCertificateEligibility({
  completed,
  modulePercents,
  total,
}: CertificateEligibilityInput): CertificateEligibilityResult {
  const normalizedCompleted = Math.max(0, completed);
  const normalizedTotal = Math.max(0, total);
  const missingCount = Math.max(0, normalizedTotal - normalizedCompleted);
  const percent =
    normalizedTotal > 0 ? Math.min(100, Math.round((normalizedCompleted / normalizedTotal) * 100)) : 0;

  return {
    isEligible:
      normalizedTotal > 0 &&
      missingCount === 0 &&
      modulePercents.length > 0 &&
      modulePercents.every((modulePercent) => modulePercent >= 100),
    missingCount,
    percent,
    total: normalizedTotal,
  };
}
