drop policy if exists "plagiarism_checks_manage_class_managers" on public.plagiarism_checks;
drop policy if exists "plagiarism_matches_manage_class_managers" on public.plagiarism_matches;
drop policy if exists "plagiarism_overrides_manage_class_managers" on public.plagiarism_overrides;

create policy "plagiarism_checks_insert_class_managers"
on public.plagiarism_checks for insert to authenticated
with check (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id and private.can_manage_class(m.class_id)
  )
);
create policy "plagiarism_checks_update_class_managers"
on public.plagiarism_checks for update to authenticated
using (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id and private.can_manage_class(m.class_id)
  )
)
with check (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id and private.can_manage_class(m.class_id)
  )
);
create policy "plagiarism_checks_delete_class_managers"
on public.plagiarism_checks for delete to authenticated
using (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id and private.can_manage_class(m.class_id)
  )
);

create policy "plagiarism_matches_insert_class_managers"
on public.plagiarism_matches for insert to authenticated
with check (
  exists (
    select 1 from public.plagiarism_checks pc
    join public.submissions s on s.id = pc.submission_id
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where pc.id = check_id and private.can_manage_class(m.class_id)
  )
);
create policy "plagiarism_matches_update_class_managers"
on public.plagiarism_matches for update to authenticated
using (
  exists (
    select 1 from public.plagiarism_checks pc
    join public.submissions s on s.id = pc.submission_id
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where pc.id = check_id and private.can_manage_class(m.class_id)
  )
)
with check (
  exists (
    select 1 from public.plagiarism_checks pc
    join public.submissions s on s.id = pc.submission_id
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where pc.id = check_id and private.can_manage_class(m.class_id)
  )
);
create policy "plagiarism_matches_delete_class_managers"
on public.plagiarism_matches for delete to authenticated
using (
  exists (
    select 1 from public.plagiarism_checks pc
    join public.submissions s on s.id = pc.submission_id
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where pc.id = check_id and private.can_manage_class(m.class_id)
  )
);

create policy "plagiarism_overrides_insert_class_managers"
on public.plagiarism_overrides for insert to authenticated
with check (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id and private.can_manage_class(m.class_id)
  )
);
create policy "plagiarism_overrides_update_class_managers"
on public.plagiarism_overrides for update to authenticated
using (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id and private.can_manage_class(m.class_id)
  )
)
with check (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id and private.can_manage_class(m.class_id)
  )
);
create policy "plagiarism_overrides_delete_class_managers"
on public.plagiarism_overrides for delete to authenticated
using (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id and private.can_manage_class(m.class_id)
  )
);
