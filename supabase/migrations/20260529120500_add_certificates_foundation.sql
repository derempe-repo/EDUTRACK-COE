create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.certificate_status not null default 'draft',
  eligible_at timestamptz,
  issued_at timestamptz,
  revoked_at timestamptz,
  certificate_number text,
  verification_token text,
  pdf_storage_path text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certificates_class_student_unique unique (class_id, student_id)
);

create unique index if not exists certificates_verification_token_unique
on public.certificates(verification_token)
where verification_token is not null;

create index if not exists certificates_student_id_idx on public.certificates(student_id);
create index if not exists certificates_status_idx on public.certificates(status);

alter table public.certificates enable row level security;

grant select, insert, update on public.certificates to authenticated;

drop policy if exists "certificates_select_owner_or_class_managers" on public.certificates;
create policy "certificates_select_owner_or_class_managers"
on public.certificates for select to authenticated
using (
  student_id = (select auth.uid())
  or private.can_manage_class(class_id)
);

drop policy if exists "certificates_insert_owner_when_enrolled" on public.certificates;
create policy "certificates_insert_owner_when_enrolled"
on public.certificates for insert to authenticated
with check (
  (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.classes c
      join public.class_members cm on cm.class_id = c.id
      where c.id = class_id
        and c.status = 'published'
        and cm.profile_id = (select auth.uid())
        and cm.role = 'student'
    )
  )
  or private.can_manage_class(class_id)
);

drop policy if exists "certificates_update_owner_draft_or_class_managers" on public.certificates;
create policy "certificates_update_owner_draft_or_class_managers"
on public.certificates for update to authenticated
using (
  (
    student_id = (select auth.uid())
    and status = 'draft'
  )
  or private.can_manage_class(class_id)
)
with check (
  (
    student_id = (select auth.uid())
    and status = 'draft'
  )
  or private.can_manage_class(class_id)
);
