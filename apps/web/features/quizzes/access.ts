export type QuizAttemptStatus = "expired" | "reset" | "started" | "submitted";

export type QuizContextInput = {
  classStatus: "archived" | "draft" | "published";
  moduleIsLocked: boolean;
  quizIsActive: boolean;
  studentIsEnrolled: boolean;
};

export type QuestionOptionInput = {
  isCorrect: boolean;
};

export type QuestionBankInput = {
  isActive: boolean;
  options: QuestionOptionInput[];
};

export function canStudentAccessQuiz({
  classStatus,
  moduleIsLocked,
  quizIsActive,
  studentIsEnrolled,
}: QuizContextInput) {
  return classStatus === "published" && !moduleIsLocked && quizIsActive && studentIsEnrolled;
}

export function canSubmitQuizAttempt({
  expiresAt,
  now = new Date(),
  status,
}: {
  expiresAt: Date;
  now?: Date;
  status: QuizAttemptStatus;
}) {
  return status === "started" && expiresAt.getTime() > now.getTime();
}

export function shouldResetAttempt(warningCount: number, warningLimit = 3) {
  return warningCount >= warningLimit;
}

export function isQuestionUsableForQuiz(question: QuestionBankInput) {
  const correctOptions = question.options.filter((option) => option.isCorrect);
  return question.isActive && question.options.length >= 2 && correctOptions.length === 1;
}
