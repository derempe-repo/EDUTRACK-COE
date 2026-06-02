create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  module_step_id uuid not null references public.module_steps(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamp with time zone,
  max_score integer not null default 100,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.submission_status not null default 'submitted',
  file_path text not null,
  file_name text not null,
  file_size integer not null,
  mime_type text not null,
  note text,
  score integer,
  feedback text,
  plagiarism_status public.plagiarism_status not null default 'pending',
  submitted_at timestamp with time zone not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint submissions_assignment_student_unique unique (assignment_id, student_id)
);

create table if not exists public.module_progress (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  module_step_id uuid not null references public.module_steps(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  status public.progress_status not null default 'not_started',
  score integer,
  submitted_at timestamp with time zone,
  verified_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint module_progress_step_student_unique unique (module_step_id, student_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  status public.notification_status not null default 'unread',
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamp with time zone not null default now(),
  read_at timestamp with time zone
);

create index if not exists assignments_module_step_id_idx on public.assignments(module_step_id);
create index if not exists assignments_created_by_idx on public.assignments(created_by);
create index if not exists assignments_due_at_idx on public.assignments(due_at);
create index if not exists assignments_is_active_idx on public.assignments(is_active);
create index if not exists submissions_assignment_id_idx on public.submissions(assignment_id);
create index if not exists submissions_student_id_idx on public.submissions(student_id);
create index if not exists submissions_status_idx on public.submissions(status);
create index if not exists submissions_reviewed_by_idx on public.submissions(reviewed_by);
create index if not exists module_progress_class_id_idx on public.module_progress(class_id);
create index if not exists module_progress_student_id_idx on public.module_progress(student_id);
create index if not exists module_progress_status_idx on public.module_progress(status);
create index if not exists module_progress_submission_id_idx on public.module_progress(submission_id);
create index if not exists notifications_recipient_id_idx on public.notifications(recipient_id);
create index if not exists notifications_status_idx on public.notifications(status);
create index if not exists notifications_created_at_idx on public.notifications(created_at);

alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.module_progress enable row level security;
alter table public.notifications enable row level security;

grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.submissions to authenticated;
grant select, insert, update, delete on public.module_progress to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

drop policy if exists "assignments_select_accessible" on public.assignments;
create policy "assignments_select_accessible"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    join public.classes c on c.id = m.class_id
    where ms.id = module_step_id
      and (
        private.can_manage_class(c.id)
        or (
          c.status = 'published'
          and m.is_locked = false
          and is_active = true
          and exists (
            select 1
            from public.class_members cm
            where cm.class_id = c.id
              and cm.profile_id = (select auth.uid())
              and cm.role = 'student'
          )
        )
      )
  )
);

drop policy if exists "assignments_insert_class_managers" on public.assignments;
create policy "assignments_insert_class_managers"
on public.assignments
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id
      and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "assignments_update_class_managers" on public.assignments;
create policy "assignments_update_class_managers"
on public.assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id
      and private.can_manage_class(m.class_id)
  )
)
with check (
  exists (
    select 1
    from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id
      and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "assignments_delete_class_managers" on public.assignments;
create policy "assignments_delete_class_managers"
on public.assignments
for delete
to authenticated
using (
  exists (
    select 1
    from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id
      and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "submissions_select_owner_or_class_managers" on public.submissions;
create policy "submissions_select_owner_or_class_managers"
on public.submissions
for select
to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.assignments a
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where a.id = assignment_id
      and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "submissions_insert_enrolled_students" on public.submissions;
create policy "submissions_insert_enrolled_students"
on public.submissions
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.assignments a
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    join public.classes c on c.id = m.class_id
    join public.class_members cm on cm.class_id = c.id
    where a.id = assignment_id
      and a.is_active = true
      and c.status = 'published'
      and m.is_locked = false
      and cm.profile_id = (select auth.uid())
      and cm.role = 'student'
  )
);

drop policy if exists "submissions_update_owner_or_class_managers" on public.submissions;
create policy "submissions_update_owner_or_class_managers"
on public.submissions
for update
to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.assignments a
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where a.id = assignment_id
      and private.can_manage_class(m.class_id)
  )
)
with check (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.assignments a
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where a.id = assignment_id
      and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "submissions_delete_class_managers" on public.submissions;
create policy "submissions_delete_class_managers"
on public.submissions
for delete
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    join public.module_steps ms on ms.id = a.module_step_id
    join public.modules m on m.id = ms.module_id
    where a.id = assignment_id
      and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "module_progress_select_owner_or_class_managers" on public.module_progress;
create policy "module_progress_select_owner_or_class_managers"
on public.module_progress
for select
to authenticated
using (student_id = (select auth.uid()) or private.can_manage_class(class_id));

drop policy if exists "module_progress_insert_owner_or_class_managers" on public.module_progress;
create policy "module_progress_insert_owner_or_class_managers"
on public.module_progress
for insert
to authenticated
with check (student_id = (select auth.uid()) or private.can_manage_class(class_id));

drop policy if exists "module_progress_update_owner_or_class_managers" on public.module_progress;
create policy "module_progress_update_owner_or_class_managers"
on public.module_progress
for update
to authenticated
using (student_id = (select auth.uid()) or private.can_manage_class(class_id))
with check (student_id = (select auth.uid()) or private.can_manage_class(class_id));

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (recipient_id = (select auth.uid()) or private.current_profile_role() in ('admin', 'super_admin'));

drop policy if exists "notifications_insert_own_or_staff" on public.notifications;
create policy "notifications_insert_own_or_staff"
on public.notifications
for insert
to authenticated
with check (recipient_id = (select auth.uid()) or private.current_profile_role() in ('dosen', 'admin', 'super_admin'));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  20971520,
  array[
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.rar',
    'application/x-rar-compressed',
    'application/octet-stream',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "submissions_bucket_select_owner_or_class_managers" on storage.objects;
create policy "submissions_bucket_select_owner_or_class_managers"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    ((storage.foldername(name))[3])::uuid = (select auth.uid())
    or private.can_manage_class(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "submissions_bucket_insert_owner" on storage.objects;
create policy "submissions_bucket_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'submissions'
  and owner = (select auth.uid())
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and ((storage.foldername(name))[3])::uuid = (select auth.uid())
  and private.can_read_class(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "submissions_bucket_delete_owner_or_class_managers" on storage.objects;
create policy "submissions_bucket_delete_owner_or_class_managers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    ((storage.foldername(name))[3])::uuid = (select auth.uid())
    or private.can_manage_class(((storage.foldername(name))[1])::uuid)
  )
);
