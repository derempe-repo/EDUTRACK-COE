create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.class_status not null default 'draft',
  created_by uuid not null references public.profiles(id) on delete restrict,
  published_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null,
  joined_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint class_members_class_profile_unique unique (class_id, profile_id)
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_locked boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.module_steps (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  module_step_id uuid not null references public.module_steps(id) on delete cascade,
  title text not null,
  type public.material_type not null default 'link',
  url text,
  storage_path text,
  description text,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists classes_created_by_idx on public.classes(created_by);
create index if not exists classes_status_idx on public.classes(status);
create index if not exists class_members_class_id_idx on public.class_members(class_id);
create index if not exists class_members_profile_id_idx on public.class_members(profile_id);
create index if not exists class_members_role_idx on public.class_members(role);
create index if not exists modules_class_id_idx on public.modules(class_id);
create index if not exists modules_sort_order_idx on public.modules(sort_order);
create index if not exists module_steps_module_id_idx on public.module_steps(module_id);
create index if not exists module_steps_sort_order_idx on public.module_steps(sort_order);
create index if not exists materials_module_step_id_idx on public.materials(module_step_id);
create index if not exists materials_type_idx on public.materials(type);
create index if not exists materials_sort_order_idx on public.materials(sort_order);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.modules enable row level security;
alter table public.module_steps enable row level security;
alter table public.materials enable row level security;

grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.class_members to authenticated;
grant select, insert, update, delete on public.modules to authenticated;
grant select, insert, update, delete on public.module_steps to authenticated;
grant select, insert, update, delete on public.materials to authenticated;

create or replace function private.current_profile_role()
returns public.user_role
language sql
security definer
stable
set search_path = public, private, pg_temp
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function private.can_read_class(p_class_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and (
        c.created_by = auth.uid()
        or private.current_profile_role() in ('admin', 'super_admin')
        or exists (
          select 1
          from public.class_members cm
          where cm.class_id = p_class_id
            and cm.profile_id = auth.uid()
        )
      )
  )
$$;

create or replace function private.can_manage_class(p_class_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and (
        c.created_by = auth.uid()
        or private.current_profile_role() in ('admin', 'super_admin')
        or exists (
          select 1
          from public.class_members cm
          where cm.class_id = p_class_id
            and cm.profile_id = auth.uid()
            and cm.role in ('lecturer', 'assistant')
        )
      )
  )
$$;

grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.can_read_class(uuid) to authenticated;
grant execute on function private.can_manage_class(uuid) to authenticated;

create policy "classes_select_accessible"
on public.classes
for select
to authenticated
using (private.can_read_class(id));

create policy "classes_insert_lecturer_or_staff"
on public.classes
for insert
to authenticated
with check (
  created_by = auth.uid()
  and private.current_profile_role() in ('dosen', 'admin', 'super_admin')
);

create policy "classes_update_managers"
on public.classes
for update
to authenticated
using (private.can_manage_class(id))
with check (private.can_manage_class(id));

create policy "classes_delete_managers"
on public.classes
for delete
to authenticated
using (private.can_manage_class(id));

create policy "class_members_select_class_access"
on public.class_members
for select
to authenticated
using (private.can_read_class(class_id) or profile_id = auth.uid());

create policy "class_members_insert_managers"
on public.class_members
for insert
to authenticated
with check (
  private.can_manage_class(class_id)
  or (
    profile_id = auth.uid()
    and role = 'lecturer'
    and exists (
      select 1
      from public.classes c
      where c.id = class_id
        and c.created_by = auth.uid()
    )
  )
);

create policy "class_members_update_managers"
on public.class_members
for update
to authenticated
using (private.can_manage_class(class_id))
with check (private.can_manage_class(class_id));

create policy "class_members_delete_managers"
on public.class_members
for delete
to authenticated
using (private.can_manage_class(class_id));

create policy "modules_select_class_access"
on public.modules
for select
to authenticated
using (private.can_read_class(class_id));

create policy "modules_insert_class_managers"
on public.modules
for insert
to authenticated
with check (private.can_manage_class(class_id));

create policy "modules_update_class_managers"
on public.modules
for update
to authenticated
using (private.can_manage_class(class_id))
with check (private.can_manage_class(class_id));

create policy "modules_delete_class_managers"
on public.modules
for delete
to authenticated
using (private.can_manage_class(class_id));

create policy "module_steps_select_class_access"
on public.module_steps
for select
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and private.can_read_class(m.class_id)
  )
);

create policy "module_steps_insert_class_managers"
on public.module_steps
for insert
to authenticated
with check (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and private.can_manage_class(m.class_id)
  )
);

create policy "module_steps_update_class_managers"
on public.module_steps
for update
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and private.can_manage_class(m.class_id)
  )
)
with check (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and private.can_manage_class(m.class_id)
  )
);

create policy "module_steps_delete_class_managers"
on public.module_steps
for delete
to authenticated
using (
  exists (
    select 1
    from public.modules m
    where m.id = module_id
      and private.can_manage_class(m.class_id)
  )
);

create policy "materials_select_class_access"
on public.materials
for select
to authenticated
using (
  exists (
    select 1
    from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id
      and private.can_read_class(m.class_id)
  )
);

create policy "materials_insert_class_managers"
on public.materials
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id
      and private.can_manage_class(m.class_id)
  )
);

create policy "materials_update_class_managers"
on public.materials
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

create policy "materials_delete_class_managers"
on public.materials
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  10485760,
  array[
    'application/pdf',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'image/png',
    'image/jpeg',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "materials_bucket_select_class_access"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.can_read_class(((storage.foldername(name))[1])::uuid)
);

create policy "materials_bucket_insert_class_managers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'materials'
  and owner = auth.uid()
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.can_manage_class(((storage.foldername(name))[1])::uuid)
);

create policy "materials_bucket_update_class_managers"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.can_manage_class(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.can_manage_class(((storage.foldername(name))[1])::uuid)
);

create policy "materials_bucket_delete_class_managers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.can_manage_class(((storage.foldername(name))[1])::uuid)
);
