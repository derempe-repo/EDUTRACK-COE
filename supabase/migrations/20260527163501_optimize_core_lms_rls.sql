create index if not exists materials_created_by_idx on public.materials(created_by);

create or replace function private.current_profile_role()
returns public.user_role
language sql
security definer
stable
set search_path = public, private, pg_temp
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
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
        c.created_by = (select auth.uid())
        or private.current_profile_role() in ('admin', 'super_admin')
        or exists (
          select 1
          from public.class_members cm
          where cm.class_id = p_class_id
            and cm.profile_id = (select auth.uid())
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
        c.created_by = (select auth.uid())
        or private.current_profile_role() in ('admin', 'super_admin')
        or exists (
          select 1
          from public.class_members cm
          where cm.class_id = p_class_id
            and cm.profile_id = (select auth.uid())
            and cm.role in ('lecturer', 'assistant')
        )
      )
  )
$$;

drop policy if exists "classes_insert_lecturer_or_staff" on public.classes;
create policy "classes_insert_lecturer_or_staff"
on public.classes
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and private.current_profile_role() in ('dosen', 'admin', 'super_admin')
);

drop policy if exists "class_members_select_class_access" on public.class_members;
create policy "class_members_select_class_access"
on public.class_members
for select
to authenticated
using (private.can_read_class(class_id) or profile_id = (select auth.uid()));

drop policy if exists "class_members_insert_managers" on public.class_members;
create policy "class_members_insert_managers"
on public.class_members
for insert
to authenticated
with check (
  private.can_manage_class(class_id)
  or (
    profile_id = (select auth.uid())
    and role = 'lecturer'
    and exists (
      select 1
      from public.classes c
      where c.id = class_id
        and c.created_by = (select auth.uid())
    )
  )
);

drop policy if exists "materials_insert_class_managers" on public.materials;
create policy "materials_insert_class_managers"
on public.materials
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

drop policy if exists "materials_bucket_insert_class_managers" on storage.objects;
create policy "materials_bucket_insert_class_managers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'materials'
  and owner = (select auth.uid())
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.can_manage_class(((storage.foldername(name))[1])::uuid)
);
