ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "submission_text" text;

CREATE TABLE IF NOT EXISTS "plagiarism_checks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "submission_id" uuid NOT NULL REFERENCES "submissions"("id") ON DELETE cascade,
  "status" "plagiarism_status" DEFAULT 'pending' NOT NULL,
  "similarity_score" integer DEFAULT 0 NOT NULL,
  "threshold_percent" integer DEFAULT 70 NOT NULL,
  "extraction_status" text DEFAULT 'pending' NOT NULL,
  "extraction_error" text,
  "checked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "plagiarism_checks_submission_id_unique" UNIQUE("submission_id")
);

CREATE TABLE IF NOT EXISTS "plagiarism_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "check_id" uuid NOT NULL REFERENCES "plagiarism_checks"("id") ON DELETE cascade,
  "matched_submission_id" uuid NOT NULL REFERENCES "submissions"("id") ON DELETE cascade,
  "similarity_score" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "plagiarism_matches_check_submission_unique" UNIQUE("check_id", "matched_submission_id")
);

CREATE TABLE IF NOT EXISTS "plagiarism_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "check_id" uuid NOT NULL REFERENCES "plagiarism_checks"("id") ON DELETE cascade,
  "submission_id" uuid NOT NULL REFERENCES "submissions"("id") ON DELETE cascade,
  "action" text NOT NULL CHECK ("action" IN ('reject_permanent', 'allow_resubmit')),
  "reason" text NOT NULL,
  "actor_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "plagiarism_checks_status_idx" ON "plagiarism_checks" ("status");
CREATE INDEX IF NOT EXISTS "plagiarism_checks_similarity_score_idx" ON "plagiarism_checks" ("similarity_score");
CREATE INDEX IF NOT EXISTS "plagiarism_checks_checked_at_idx" ON "plagiarism_checks" ("checked_at");
CREATE INDEX IF NOT EXISTS "plagiarism_matches_check_id_idx" ON "plagiarism_matches" ("check_id");
CREATE INDEX IF NOT EXISTS "plagiarism_matches_matched_submission_id_idx" ON "plagiarism_matches" ("matched_submission_id");
CREATE INDEX IF NOT EXISTS "plagiarism_matches_similarity_score_idx" ON "plagiarism_matches" ("similarity_score");
CREATE INDEX IF NOT EXISTS "plagiarism_overrides_check_id_idx" ON "plagiarism_overrides" ("check_id");
CREATE INDEX IF NOT EXISTS "plagiarism_overrides_submission_id_idx" ON "plagiarism_overrides" ("submission_id");
CREATE INDEX IF NOT EXISTS "plagiarism_overrides_actor_id_idx" ON "plagiarism_overrides" ("actor_id");
CREATE INDEX IF NOT EXISTS "plagiarism_overrides_created_at_idx" ON "plagiarism_overrides" ("created_at");

ALTER TABLE "plagiarism_checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plagiarism_matches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plagiarism_overrides" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON "plagiarism_checks" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plagiarism_matches" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "plagiarism_overrides" TO authenticated;

DROP POLICY IF EXISTS "plagiarism_checks_select_owner_or_class_managers" ON "plagiarism_checks";
CREATE POLICY "plagiarism_checks_select_owner_or_class_managers"
ON "plagiarism_checks" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id
      AND (s.student_id = (SELECT auth.uid()) OR private.can_manage_class(m.class_id))
  )
);

DROP POLICY IF EXISTS "plagiarism_checks_manage_class_managers" ON "plagiarism_checks";
CREATE POLICY "plagiarism_checks_manage_class_managers"
ON "plagiarism_checks" FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id AND private.can_manage_class(m.class_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id AND private.can_manage_class(m.class_id)
  )
);

DROP POLICY IF EXISTS "plagiarism_matches_select_class_managers" ON "plagiarism_matches";
CREATE POLICY "plagiarism_matches_select_class_managers"
ON "plagiarism_matches" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "plagiarism_checks" pc
    JOIN "submissions" s ON s.id = pc.submission_id
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE pc.id = check_id AND private.can_manage_class(m.class_id)
  )
);

DROP POLICY IF EXISTS "plagiarism_matches_manage_class_managers" ON "plagiarism_matches";
CREATE POLICY "plagiarism_matches_manage_class_managers"
ON "plagiarism_matches" FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "plagiarism_checks" pc
    JOIN "submissions" s ON s.id = pc.submission_id
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE pc.id = check_id AND private.can_manage_class(m.class_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "plagiarism_checks" pc
    JOIN "submissions" s ON s.id = pc.submission_id
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE pc.id = check_id AND private.can_manage_class(m.class_id)
  )
);

DROP POLICY IF EXISTS "plagiarism_overrides_select_owner_or_class_managers" ON "plagiarism_overrides";
CREATE POLICY "plagiarism_overrides_select_owner_or_class_managers"
ON "plagiarism_overrides" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id
      AND (s.student_id = (SELECT auth.uid()) OR private.can_manage_class(m.class_id))
  )
);

DROP POLICY IF EXISTS "plagiarism_overrides_manage_class_managers" ON "plagiarism_overrides";
CREATE POLICY "plagiarism_overrides_manage_class_managers"
ON "plagiarism_overrides" FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id AND private.can_manage_class(m.class_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id AND private.can_manage_class(m.class_id)
  )
);
