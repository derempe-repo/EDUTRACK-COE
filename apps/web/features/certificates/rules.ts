export type CertificateRuleInput = {
  finalScore: number;
  hasRejectedPermanentSubmission: boolean;
  progressPercent: number;
};

export function evaluateCertificateRule({
  finalScore,
  hasRejectedPermanentSubmission,
  progressPercent,
}: CertificateRuleInput) {
  const checks = {
    finalScorePassed: finalScore >= 70,
    plagiarismPassed: !hasRejectedPermanentSubmission,
    progressCompleted: progressPercent >= 100,
  };

  return {
    checks,
    isEligible: checks.progressCompleted && checks.finalScorePassed && checks.plagiarismPassed,
  };
}
