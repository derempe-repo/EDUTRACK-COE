ALTER TABLE "quiz_attempt_questions"
DROP CONSTRAINT IF EXISTS "quiz_attempt_questions_question_id_fkey";

ALTER TABLE "quiz_attempt_questions"
ADD CONSTRAINT "quiz_attempt_questions_question_id_fkey"
FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE;
