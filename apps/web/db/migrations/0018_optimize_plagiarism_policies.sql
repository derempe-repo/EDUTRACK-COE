DROP POLICY IF EXISTS "plagiarism_checks_manage_class_managers" ON "plagiarism_checks";
DROP POLICY IF EXISTS "plagiarism_matches_manage_class_managers" ON "plagiarism_matches";
DROP POLICY IF EXISTS "plagiarism_overrides_manage_class_managers" ON "plagiarism_overrides";

CREATE POLICY "plagiarism_checks_insert_class_managers"
ON "plagiarism_checks" FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id AND private.can_manage_class(m.class_id)
  )
);
CREATE POLICY "plagiarism_checks_update_class_managers"
ON "plagiarism_checks" FOR UPDATE TO authenticated
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
CREATE POLICY "plagiarism_checks_delete_class_managers"
ON "plagiarism_checks" FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id AND private.can_manage_class(m.class_id)
  )
);

CREATE POLICY "plagiarism_matches_insert_class_managers"
ON "plagiarism_matches" FOR INSERT TO authenticated
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
CREATE POLICY "plagiarism_matches_update_class_managers"
ON "plagiarism_matches" FOR UPDATE TO authenticated
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
CREATE POLICY "plagiarism_matches_delete_class_managers"
ON "plagiarism_matches" FOR DELETE TO authenticated
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

CREATE POLICY "plagiarism_overrides_insert_class_managers"
ON "plagiarism_overrides" FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id AND private.can_manage_class(m.class_id)
  )
);
CREATE POLICY "plagiarism_overrides_update_class_managers"
ON "plagiarism_overrides" FOR UPDATE TO authenticated
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
CREATE POLICY "plagiarism_overrides_delete_class_managers"
ON "plagiarism_overrides" FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "submissions" s
    JOIN "assignments" a ON a.id = s.assignment_id
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    WHERE s.id = submission_id AND private.can_manage_class(m.class_id)
  )
);
