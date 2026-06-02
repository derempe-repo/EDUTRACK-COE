export type GradeableQuizAnswer = {
  isCorrect: boolean;
  weight: number;
};

export function calculateQuizScore(answers: GradeableQuizAnswer[]) {
  const totalWeight = answers.reduce((sum, answer) => sum + answer.weight, 0);
  const correctWeight = answers.reduce(
    (sum, answer) => sum + (answer.isCorrect ? answer.weight : 0),
    0,
  );
  const score = totalWeight > 0 ? Math.round((correctWeight / totalWeight) * 100) : 0;

  return {
    correctWeight,
    score,
    totalWeight,
  };
}
