ALTER TABLE "classes" ADD COLUMN "assignment_weight" integer DEFAULT 30 NOT NULL;
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "quiz_weight" integer DEFAULT 30 NOT NULL;
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "final_exam_weight" integer DEFAULT 40 NOT NULL;
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_grade_weights_range_check" CHECK (
  "assignment_weight" between 0 and 100
  and "quiz_weight" between 0 and 100
  and "final_exam_weight" between 0 and 100
);
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_grade_weights_total_check" CHECK (
  "assignment_weight" + "quiz_weight" + "final_exam_weight" = 100
);
