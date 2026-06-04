export type ProgressActivityCounts = {
  acceptedAssignments?: number;
  failedAssignments?: number;
  failedFinalExams?: number;
  failedQuizzes?: number;
  passedFinalExams?: number;
  passedQuizzes?: number;
  readMaterials?: number;
  requiredAssignments?: number;
  requiredFinalExams?: number;
  requiredMaterials?: number;
  requiredQuizzes?: number;
  submittedAssignments?: number;
  submittedFinalExams?: number;
  submittedQuizzes?: number;
};

export type ProgressSummary = {
  completed: number;
  failed: number;
  percent: number;
  submitted: number;
  total: number;
  verified: number;
};

function normalized(value: number | undefined) {
  return Math.max(0, value ?? 0);
}

export function getProgressSummary(counts: ProgressActivityCounts): ProgressSummary {
  const total =
    normalized(counts.requiredMaterials) +
    normalized(counts.requiredAssignments) +
    normalized(counts.requiredQuizzes) +
    normalized(counts.requiredFinalExams);
  const completed =
    normalized(counts.readMaterials) +
    normalized(counts.acceptedAssignments) +
    normalized(counts.passedQuizzes) +
    normalized(counts.passedFinalExams);
  const submitted =
    normalized(counts.submittedAssignments) +
    normalized(counts.submittedQuizzes) +
    normalized(counts.submittedFinalExams);
  const failed =
    normalized(counts.failedAssignments) +
    normalized(counts.failedQuizzes) +
    normalized(counts.failedFinalExams);

  return {
    completed,
    failed,
    percent: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
    submitted,
    total,
    verified: completed,
  };
}

export function combineProgressSummaries(summaries: ProgressSummary[]): ProgressSummary {
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const completed = summaries.reduce((sum, summary) => sum + summary.completed, 0);
  const submitted = summaries.reduce((sum, summary) => sum + summary.submitted, 0);
  const failed = summaries.reduce((sum, summary) => sum + summary.failed, 0);

  return {
    completed,
    failed,
    percent: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
    submitted,
    total,
    verified: completed,
  };
}
