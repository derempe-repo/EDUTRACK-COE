CREATE INDEX IF NOT EXISTS "profiles_created_at_idx" ON "profiles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_role_created_at_idx" ON "audit_logs" USING btree ("actor_role", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_created_at_idx" ON "notifications" USING btree ("recipient_id", "created_at");
