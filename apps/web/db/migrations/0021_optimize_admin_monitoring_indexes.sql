CREATE INDEX IF NOT EXISTS "submissions_plagiarism_status_idx" ON "submissions" USING btree ("plagiarism_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plagiarism_checks_status_checked_at_idx" ON "plagiarism_checks" USING btree ("status", "checked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exam_mode_events_created_at_idx" ON "exam_mode_events" USING btree ("created_at");
