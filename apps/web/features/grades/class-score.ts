export type GradeWeights = {
  assignmentWeight: number;
  finalExamWeight: number;
  quizWeight: number;
};

export type ScoreItem = {
  maxScore: number;
  score: number;
};

export type WeightedClassScoreInput = GradeWeights & {
  assignmentScores: ScoreItem[];
  finalExamScores: ScoreItem[];
  quizScores: ScoreItem[];
};

function averageNormalizedScore(scores: ScoreItem[]) {
  const validScores = scores.filter((item) => item.maxScore > 0);

  if (validScores.length === 0) {
    return 0;
  }

  const total = validScores.reduce((sum, item) => {
    return sum + (item.score / item.maxScore) * 100;
  }, 0);

  return Math.round(total / validScores.length);
}

export function gradeWeightsTotal(weights: GradeWeights) {
  return weights.assignmentWeight + weights.quizWeight + weights.finalExamWeight;
}

export function calculateWeightedClassScore({
  assignmentScores,
  assignmentWeight,
  finalExamScores,
  finalExamWeight,
  quizScores,
  quizWeight,
}: WeightedClassScoreInput) {
  const assignmentAverage = averageNormalizedScore(assignmentScores);
  const quizAverage = averageNormalizedScore(quizScores);
  const finalExamAverage = averageNormalizedScore(finalExamScores);
  const finalScore = Math.round(
    (assignmentAverage * assignmentWeight +
      quizAverage * quizWeight +
      finalExamAverage * finalExamWeight) /
      100,
  );

  return {
    assignmentAverage,
    finalExamAverage,
    finalScore,
    quizAverage,
  };
}
