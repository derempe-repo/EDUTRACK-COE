CREATE OR REPLACE FUNCTION private.student_has_prior_flagged_submission(
  p_class_id uuid,
  p_module_sort_order integer,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    JOIN public.module_steps ms ON ms.id = a.module_step_id
    JOIN public.modules m ON m.id = ms.module_id
    WHERE m.class_id = p_class_id
      AND m.sort_order < p_module_sort_order
      AND s.student_id = p_student_id
      AND s.plagiarism_status = 'flagged'
  );
$$;

REVOKE ALL ON FUNCTION private.student_has_prior_flagged_submission(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.student_has_prior_flagged_submission(uuid, integer, uuid) TO authenticated;

DROP POLICY IF EXISTS "materials_select_class_access" ON "materials";
CREATE POLICY "materials_select_class_access"
ON "materials" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "module_steps" ms
    JOIN "modules" m ON m.id = ms.module_id
    WHERE ms.id = module_step_id
      AND (
        private.can_manage_class(m.class_id)
        OR (
          private.can_read_class(m.class_id)
          AND m.is_locked = false
          AND NOT private.student_has_prior_flagged_submission(m.class_id, m.sort_order, (SELECT auth.uid()))
        )
      )
  )
);

DROP POLICY IF EXISTS "assignments_select_accessible" ON "assignments";
CREATE POLICY "assignments_select_accessible"
ON "assignments" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "module_steps" ms
    JOIN "modules" m ON m.id = ms.module_id
    JOIN "classes" c ON c.id = m.class_id
    WHERE ms.id = module_step_id
      AND (
        private.can_manage_class(c.id)
        OR (
          c.status = 'published'
          AND m.is_locked = false
          AND is_active = true
          AND NOT private.student_has_prior_flagged_submission(c.id, m.sort_order, (SELECT auth.uid()))
          AND EXISTS (
            SELECT 1 FROM "class_members" cm
            WHERE cm.class_id = c.id
              AND cm.profile_id = (SELECT auth.uid())
              AND cm.role = 'student'
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "submissions_insert_enrolled_students" ON "submissions";
CREATE POLICY "submissions_insert_enrolled_students"
ON "submissions" FOR INSERT TO authenticated
WITH CHECK (
  student_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM "assignments" a
    JOIN "module_steps" ms ON ms.id = a.module_step_id
    JOIN "modules" m ON m.id = ms.module_id
    JOIN "classes" c ON c.id = m.class_id
    JOIN "class_members" cm ON cm.class_id = c.id
    WHERE a.id = assignment_id
      AND a.is_active = true
      AND c.status = 'published'
      AND m.is_locked = false
      AND NOT private.student_has_prior_flagged_submission(c.id, m.sort_order, (SELECT auth.uid()))
      AND cm.profile_id = (SELECT auth.uid())
      AND cm.role = 'student'
  )
);

DROP POLICY IF EXISTS "quizzes_select_accessible" ON "quizzes";
CREATE POLICY "quizzes_select_accessible"
ON "quizzes" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "module_steps" ms
    JOIN "modules" m ON m.id = ms.module_id
    JOIN "classes" c ON c.id = m.class_id
    WHERE ms.id = module_step_id
      AND (
        private.can_manage_class(c.id)
        OR (
          c.status = 'published'
          AND m.is_locked = false
          AND is_active = true
          AND NOT private.student_has_prior_flagged_submission(c.id, m.sort_order, (SELECT auth.uid()))
          AND EXISTS (
            SELECT 1 FROM "class_members" cm
            WHERE cm.class_id = c.id
              AND cm.profile_id = (SELECT auth.uid())
              AND cm.role = 'student'
          )
        )
      )
  )
);
