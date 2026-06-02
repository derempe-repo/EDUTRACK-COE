CREATE TABLE "class_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "class_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_step_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "material_type" DEFAULT 'link' NOT NULL,
	"url" text,
	"storage_path" text,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_module_step_id_module_steps_id_fk" FOREIGN KEY ("module_step_id") REFERENCES "public"."module_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_steps" ADD CONSTRAINT "module_steps_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_members_class_profile_unique" ON "class_members" USING btree ("class_id","profile_id");--> statement-breakpoint
CREATE INDEX "class_members_class_id_idx" ON "class_members" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_members_profile_id_idx" ON "class_members" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "class_members_role_idx" ON "class_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX "classes_created_by_idx" ON "classes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "classes_status_idx" ON "classes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "materials_module_step_id_idx" ON "materials" USING btree ("module_step_id");--> statement-breakpoint
CREATE INDEX "materials_type_idx" ON "materials" USING btree ("type");--> statement-breakpoint
CREATE INDEX "materials_sort_order_idx" ON "materials" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "module_steps_module_id_idx" ON "module_steps" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "module_steps_sort_order_idx" ON "module_steps" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "modules_class_id_idx" ON "modules" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "modules_sort_order_idx" ON "modules" USING btree ("sort_order");