ALTER TYPE "public"."plagiarism_status" ADD VALUE IF NOT EXISTS 'needs_review';

ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "file_hash" text;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "text_hash" text;
ALTER TABLE "plagiarism_checks" ADD COLUMN IF NOT EXISTS "detection_method" text DEFAULT 'none' NOT NULL;

CREATE INDEX IF NOT EXISTS "submissions_assignment_file_hash_idx"
  ON "submissions" USING btree ("assignment_id", "file_hash")
  WHERE "file_hash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "submissions_assignment_text_hash_idx"
  ON "submissions" USING btree ("assignment_id", "text_hash")
  WHERE "text_hash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "plagiarism_checks_detection_method_idx"
  ON "plagiarism_checks" USING btree ("detection_method");
