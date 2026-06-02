create or replace function private.student_has_prior_flagged_submission(
  p_class_id uuid,
  p_module_sort_order integer,
  p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where m.class_id = p_class_id
      and m.sort_order < p_module_sort_order
      and s.student_id = p_student_id
      and s.plagiarism_status = 'flagged'
  );
$$;

revoke all on function private.student_has_prior_flagged_submission(uuid, integer, uuid) from public;
grant execute on function private.student_has_prior_flagged_submission(uuid, integer, uuid) to authenticated;

drop policy if exists "materials_select_class_access" on public.materials;
create policy "materials_select_class_access"
on public.materials for select to authenticated
using (
  exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id
      and (
        private.can_manage_class(m.class_id)
        or (
          private.can_read_class(m.class_id)
          and m.is_locked = false
          and not private.student_has_prior_flagged_submission(m.class_id, m.sort_order, (select auth.uid()))
        )
      )
  )
);

drop policy if exists "assignments_select_accessible" on public.assignments;
create policy "assignments_select_accessible"
on public.assignments for select to authenticated
using (
  exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    join public.classes c on c.id = m.class_id
    where ms.id = module_step_id
      and (
        private.can_manage_class(c.id)
        or (
          c.status = 'published'
          and m.is_locked = false
          and is_active = true
          and not private.student_has_prior_flagged_submission(c.id, m.sort_order, (select auth.uid()))
          and exists (
            select 1 from public.class_members cm
            where cm.class_id = c.id
              and cm.profile_id = (select auth.uid())
              and cm.role = 'student'
          )
        )
      )
  )
);

drop policy if exists "submissions_insert_enrolled_students" on public.submissions;
create policy "submissions_insert_enrolled_students"
on public.submissions for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.assignments a
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    join public.classes c on c.id = m.class_id
    join public.class_members cm on cm.class_id = c.id
    where a.id = assignment_id
      and a.is_active = true
      and c.status = 'published'
      and m.is_locked = false
      and not private.student_has_prior_flagged_submission(c.id, m.sort_order, (select auth.uid()))
      and cm.profile_id = (select auth.uid())
      and cm.role = 'student'
  )
);

drop policy if exists "quizzes_select_accessible" on public.quizzes;
create policy "quizzes_select_accessible"
on public.quizzes for select to authenticated
using (
  exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    join public.classes c on c.id = m.class_id
    where ms.id = module_step_id
      and (
        private.can_manage_class(c.id)
        or (
          c.status = 'published'
          and m.is_locked = false
          and is_active = true
          and not private.student_has_prior_flagged_submission(c.id, m.sort_order, (select auth.uid()))
          and exists (
            select 1 from public.class_members cm
            where cm.class_id = c.id
              and cm.profile_id = (select auth.uid())
              and cm.role = 'student'
          )
        )
      )
  )
);
