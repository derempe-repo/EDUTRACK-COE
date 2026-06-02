CREATE TABLE "exam_mode_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"option_text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_step_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_question_id" uuid NOT NULL,
	"selected_option_id" uuid,
	"is_correct" boolean DEFAULT false NOT NULL,
	"weight_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "quiz_attempt_status" DEFAULT 'started' NOT NULL,
	"score" integer,
	"total_weight" integer DEFAULT 0 NOT NULL,
	"correct_weight" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_step_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"question_count" integer DEFAULT 5 NOT NULL,
	"passing_score" integer DEFAULT 70 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_mode_events" ADD CONSTRAINT "exam_mode_events_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_mode_events" ADD CONSTRAINT "exam_mode_events_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_module_step_id_module_steps_id_fk" FOREIGN KEY ("module_step_id") REFERENCES "public"."module_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_attempt_question_id_quiz_attempt_questions_id_fk" FOREIGN KEY ("attempt_question_id") REFERENCES "public"."quiz_attempt_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_selected_option_id_question_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."question_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt_questions" ADD CONSTRAINT "quiz_attempt_questions_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt_questions" ADD CONSTRAINT "quiz_attempt_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_module_step_id_module_steps_id_fk" FOREIGN KEY ("module_step_id") REFERENCES "public"."module_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_mode_events_attempt_id_idx" ON "exam_mode_events" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "exam_mode_events_student_id_idx" ON "exam_mode_events" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "exam_mode_events_event_type_idx" ON "exam_mode_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "grades_student_source_unique" ON "grades" USING btree ("student_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "grades_class_id_idx" ON "grades" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "grades_student_id_idx" ON "grades" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "question_options_question_id_idx" ON "question_options" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_options_question_label_unique" ON "question_options" USING btree ("question_id","label");--> statement-breakpoint
CREATE INDEX "questions_module_step_id_idx" ON "questions" USING btree ("module_step_id");--> statement-breakpoint
CREATE INDEX "questions_created_by_idx" ON "questions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "questions_difficulty_idx" ON "questions" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "questions_is_active_idx" ON "questions" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_answers_attempt_question_unique" ON "quiz_answers" USING btree ("attempt_question_id");--> statement-breakpoint
CREATE INDEX "quiz_answers_selected_option_id_idx" ON "quiz_answers" USING btree ("selected_option_id");--> statement-breakpoint
CREATE INDEX "quiz_attempt_questions_attempt_id_idx" ON "quiz_attempt_questions" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "quiz_attempt_questions_question_id_idx" ON "quiz_attempt_questions" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempt_questions_attempt_question_unique" ON "quiz_attempt_questions" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_quiz_id_idx" ON "quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_student_id_idx" ON "quiz_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_status_idx" ON "quiz_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quizzes_module_step_id_idx" ON "quizzes" USING btree ("module_step_id");--> statement-breakpoint
CREATE INDEX "quizzes_created_by_idx" ON "quizzes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "quizzes_is_active_idx" ON "quizzes" USING btree ("is_active");