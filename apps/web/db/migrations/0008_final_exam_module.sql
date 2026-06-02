ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "module_id" uuid;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "quiz_type" text DEFAULT 'step' NOT NULL;

ALTER TABLE "quizzes" ALTER COLUMN "module_step_id" DROP NOT NULL;

ALTER TABLE "quizzes"
  DROP CONSTRAINT IF EXISTS "quizzes_module_id_modules_id_fk";

ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_module_id_modules_id_fk"
  FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "quizzes"
  DROP CONSTRAINT IF EXISTS "quizzes_context_check";

ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_context_check"
  CHECK (
    ("quiz_type" = 'step' AND "module_step_id" IS NOT NULL AND "module_id" IS NULL)
    OR
    ("quiz_type" = 'final' AND "module_step_id" IS NULL AND "module_id" IS NOT NULL)
  );

DROP INDEX IF EXISTS "quizzes_active_step_unique";
CREATE UNIQUE INDEX "quizzes_active_step_unique"
  ON "quizzes" USING btree ("module_step_id")
  WHERE "quizzes"."is_active" = true AND "quizzes"."quiz_type" = 'step';

CREATE UNIQUE INDEX IF NOT EXISTS "quizzes_active_final_module_unique"
  ON "quizzes" USING btree ("module_id")
  WHERE "quizzes"."is_active" = true AND "quizzes"."quiz_type" = 'final';

CREATE INDEX IF NOT EXISTS "quizzes_module_id_idx" ON "quizzes" USING btree ("module_id");
CREATE INDEX IF NOT EXISTS "quizzes_quiz_type_idx" ON "quizzes" USING btree ("quiz_type");
