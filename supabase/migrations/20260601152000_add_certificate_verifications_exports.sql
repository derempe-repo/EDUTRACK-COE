create table if not exists public.certificate_verifications (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references public.certificates(id) on delete set null,
  verification_token text not null,
  result text not null,
  ip_address text,
  user_agent text,
  verified_at timestamptz not null default now()
);

create index if not exists certificate_verifications_certificate_id_idx
on public.certificate_verifications(certificate_id);
create index if not exists certificate_verifications_verified_at_idx
on public.certificate_verifications(verified_at);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  format text not null,
  status public.export_status not null default 'pending',
  file_name text,
  file_storage_path text,
  error_message text,
  metadata jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exports_class_id_idx on public.exports(class_id);
create index if not exists exports_requested_by_idx on public.exports(requested_by);
create index if not exists exports_status_idx on public.exports(status);
create index if not exists exports_created_at_idx on public.exports(created_at);

alter table public.certificate_verifications enable row level security;
alter table public.exports enable row level security;

grant insert on public.certificate_verifications to anon, authenticated;
grant select, insert, update on public.exports to authenticated;

drop policy if exists "certificate_verifications_insert_public" on public.certificate_verifications;
create policy "certificate_verifications_insert_public"
on public.certificate_verifications for insert to anon, authenticated
with check (result in ('valid', 'revoked', 'not_found'));

drop policy if exists "exports_select_requester_or_class_managers" on public.exports;
create policy "exports_select_requester_or_class_managers"
on public.exports for select to authenticated
using (
  requested_by = (select auth.uid())
  or private.can_manage_class(class_id)
);

drop policy if exists "exports_insert_requester_for_managed_class" on public.exports;
create policy "exports_insert_requester_for_managed_class"
on public.exports for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and private.can_manage_class(class_id)
);

drop policy if exists "exports_update_requester_or_class_managers" on public.exports;
create policy "exports_update_requester_or_class_managers"
on public.exports for update to authenticated
using (
  requested_by = (select auth.uid())
  or private.can_manage_class(class_id)
)
with check (
  requested_by = (select auth.uid())
  or private.can_manage_class(class_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificates',
  'certificates',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exports',
  'exports',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "certificates_bucket_select_owner_or_class_managers" on storage.objects;
create policy "certificates_bucket_select_owner_or_class_managers"
on storage.objects for select to authenticated
using (
  bucket_id = 'certificates'
  and (
    (storage.foldername(name))[2] = (select auth.uid())::text
    or private.can_manage_class(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "certificates_bucket_insert_owner_or_class_managers" on storage.objects;
create policy "certificates_bucket_insert_owner_or_class_managers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'certificates'
  and (
    (storage.foldername(name))[2] = (select auth.uid())::text
    or private.can_manage_class(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "certificates_bucket_update_owner_or_class_managers" on storage.objects;
create policy "certificates_bucket_update_owner_or_class_managers"
on storage.objects for update to authenticated
using (
  bucket_id = 'certificates'
  and (
    (storage.foldername(name))[2] = (select auth.uid())::text
    or private.can_manage_class(((storage.foldername(name))[1])::uuid)
  )
)
with check (
  bucket_id = 'certificates'
  and (
    (storage.foldername(name))[2] = (select auth.uid())::text
    or private.can_manage_class(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "exports_bucket_select_owner" on storage.objects;
create policy "exports_bucket_select_owner"
on storage.objects for select to authenticated
using (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "exports_bucket_insert_owner" on storage.objects;
create policy "exports_bucket_insert_owner"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "exports_bucket_update_owner" on storage.objects;
create policy "exports_bucket_update_owner"
on storage.objects for update to authenticated
using (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
