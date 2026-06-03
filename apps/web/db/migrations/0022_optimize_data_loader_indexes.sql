CREATE INDEX IF NOT EXISTS "submissions_assignment_submitted_at_idx" ON "submissions" USING btree ("assignment_id", "submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempts_quiz_started_at_idx" ON "quiz_attempts" USING btree ("quiz_id", "started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempts_student_started_at_idx" ON "quiz_attempts" USING btree ("student_id", "started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exam_mode_events_attempt_created_at_idx" ON "exam_mode_events" USING btree ("attempt_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificates_class_id_idx" ON "certificates" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exports_class_created_at_idx" ON "exports" USING btree ("class_id", "created_at");
