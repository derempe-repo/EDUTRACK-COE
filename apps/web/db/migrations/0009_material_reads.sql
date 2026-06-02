CREATE TABLE IF NOT EXISTS "material_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "material_reads" DROP CONSTRAINT IF EXISTS "material_reads_material_id_materials_id_fk";
--> statement-breakpoint
ALTER TABLE "material_reads" DROP CONSTRAINT IF EXISTS "material_reads_student_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "material_reads" ADD CONSTRAINT "material_reads_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "material_reads" ADD CONSTRAINT "material_reads_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "material_reads_material_student_unique" ON "material_reads" USING btree ("material_id","student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_reads_material_id_idx" ON "material_reads" USING btree ("material_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_reads_student_id_idx" ON "material_reads" USING btree ("student_id");
