CREATE TABLE IF NOT EXISTS "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "certificate_status" DEFAULT 'draft' NOT NULL,
	"eligible_at" timestamp with time zone,
	"issued_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"certificate_number" text,
	"verification_token" text,
	"pdf_storage_path" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certificates" DROP CONSTRAINT IF EXISTS "certificates_class_id_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "certificates" DROP CONSTRAINT IF EXISTS "certificates_student_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_class_student_unique" ON "certificates" USING btree ("class_id","student_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_verification_token_unique" ON "certificates" USING btree ("verification_token") WHERE "certificates"."verification_token" is not null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificates_student_id_idx" ON "certificates" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificates_status_idx" ON "certificates" USING btree ("status");
