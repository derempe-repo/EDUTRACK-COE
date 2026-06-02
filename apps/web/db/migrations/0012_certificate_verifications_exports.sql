CREATE TABLE IF NOT EXISTS "certificate_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" uuid,
	"verification_token" text NOT NULL,
	"result" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"format" text NOT NULL,
	"status" "export_status" DEFAULT 'pending' NOT NULL,
	"file_name" text,
	"file_storage_path" text,
	"error_message" text,
	"metadata" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certificate_verifications" ADD CONSTRAINT "certificate_verifications_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificate_verifications_certificate_id_idx" ON "certificate_verifications" USING btree ("certificate_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificate_verifications_verified_at_idx" ON "certificate_verifications" USING btree ("verified_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exports_class_id_idx" ON "exports" USING btree ("class_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exports_requested_by_idx" ON "exports" USING btree ("requested_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exports_status_idx" ON "exports" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exports_created_at_idx" ON "exports" USING btree ("created_at");
