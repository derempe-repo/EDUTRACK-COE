CREATE INDEX IF NOT EXISTS "quiz_attempts_student_quiz_started_at_idx"
ON "quiz_attempts" ("student_id", "quiz_id", "started_at");
