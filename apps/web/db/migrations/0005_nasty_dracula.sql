ALTER TABLE "assignments" ADD COLUMN "attachment_storage_path" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "attachment_file_name" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "attachment_file_size" integer;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "attachment_mime_type" text;