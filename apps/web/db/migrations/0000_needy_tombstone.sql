CREATE TYPE "public"."certificate_status" AS ENUM('draft', 'issued', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."class_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."forum_thread_status" AS ENUM('open', 'answered', 'closed');--> statement-breakpoint
CREATE TYPE "public"."material_type" AS ENUM('pdf', 'video', 'slide', 'link');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('student', 'lecturer', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('unread', 'read');--> statement-breakpoint
CREATE TYPE "public"."plagiarism_status" AS ENUM('pending', 'passed', 'flagged', 'rejected_permanent', 'resubmit_allowed');--> statement-breakpoint
CREATE TYPE "public"."progress_status" AS ENUM('not_started', 'in_progress', 'submitted', 'verified', 'failed', 'locked');--> statement-breakpoint
CREATE TYPE "public"."quiz_attempt_status" AS ENUM('started', 'submitted', 'reset', 'expired');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'locked', 'resubmit_allowed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('mahasiswa', 'dosen', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"avatar_url" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_unique" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_key_unique" ON "system_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "system_settings_is_public_idx" ON "system_settings" USING btree ("is_public");