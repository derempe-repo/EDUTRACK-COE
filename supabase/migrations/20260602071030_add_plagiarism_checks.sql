alter table public.submissions add column if not exists submission_text text;

create table if not exists public.plagiarism_checks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  status public.plagiarism_status not null default 'pending',
  similarity_score integer not null default 0,
  threshold_percent integer not null default 70,
  extraction_status text not null default 'pending',
  extraction_error text,
  checked_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint plagiarism_checks_submission_id_unique unique (submission_id)
);

create table if not exists public.plagiarism_matches (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.plagiarism_checks(id) on delete cascade,
  matched_submission_id uuid not null references public.submissions(id) on delete cascade,
  similarity_score integer not null,
  created_at timestamp with time zone not null default now(),
  constraint plagiarism_matches_check_submission_unique unique (check_id, matched_submission_id)
);

create table if not exists public.plagiarism_overrides (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.plagiarism_checks(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  action text not null check (action in ('reject_permanent', 'allow_resubmit')),
  reason text not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now()
);

create index if not exists plagiarism_checks_status_idx on public.plagiarism_checks(status);
create index if not exists plagiarism_checks_similarity_score_idx on public.plagiarism_checks(similarity_score);
create index if not exists plagiarism_checks_checked_at_idx on public.plagiarism_checks(checked_at);
create index if not exists plagiarism_matches_check_id_idx on public.plagiarism_matches(check_id);
create index if not exists plagiarism_matches_matched_submission_id_idx on public.plagiarism_matches(matched_submission_id);
create index if not exists plagiarism_matches_similarity_score_idx on public.plagiarism_matches(similarity_score);
create index if not exists plagiarism_overrides_check_id_idx on public.plagiarism_overrides(check_id);
create index if not exists plagiarism_overrides_submission_id_idx on public.plagiarism_overrides(submission_id);
create index if not exists plagiarism_overrides_actor_id_idx on public.plagiarism_overrides(actor_id);
create index if not exists plagiarism_overrides_created_at_idx on public.plagiarism_overrides(created_at);

alter table public.plagiarism_checks enable row level security;
alter table public.plagiarism_matches enable row level security;
alter table public.plagiarism_overrides enable row level security;

grant select, insert, update, delete on public.plagiarism_checks to authenticated;
grant select, insert, update, delete on public.plagiarism_matches to authenticated;
grant select, insert, update, delete on public.plagiarism_overrides to authenticated;

drop policy if exists "plagiarism_checks_select_owner_or_class_managers" on public.plagiarism_checks;
create policy "plagiarism_checks_select_owner_or_class_managers"
on public.plagiarism_checks for select to authenticated
using (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id
      and (s.student_id = (select auth.uid()) or private.can_manage_class(m.class_id))
  )
);

drop policy if exists "plagiarism_checks_manage_class_managers" on public.plagiarism_checks;
create policy "plagiarism_checks_manage_class_managers"
on public.plagiarism_checks for all to authenticated
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

drop policy if exists "plagiarism_matches_select_class_managers" on public.plagiarism_matches;
create policy "plagiarism_matches_select_class_managers"
on public.plagiarism_matches for select to authenticated
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

drop policy if exists "plagiarism_matches_manage_class_managers" on public.plagiarism_matches;
create policy "plagiarism_matches_manage_class_managers"
on public.plagiarism_matches for all to authenticated
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

drop policy if exists "plagiarism_overrides_select_owner_or_class_managers" on public.plagiarism_overrides;
create policy "plagiarism_overrides_select_owner_or_class_managers"
on public.plagiarism_overrides for select to authenticated
using (
  exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where s.id = submission_id
      and (s.student_id = (select auth.uid()) or private.can_manage_class(m.class_id))
  )
);

drop policy if exists "plagiarism_overrides_manage_class_managers" on public.plagiarism_overrides;
create policy "plagiarism_overrides_manage_class_managers"
on public.plagiarism_overrides for all to authenticated
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
