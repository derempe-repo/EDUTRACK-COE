create table if not exists public.material_reads (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_reads_material_student_unique unique (material_id, student_id)
);

create index if not exists material_reads_material_id_idx on public.material_reads(material_id);
create index if not exists material_reads_student_id_idx on public.material_reads(student_id);

alter table public.material_reads enable row level security;

grant select, insert, update on public.material_reads to authenticated;

drop policy if exists "material_reads_select_owner_or_class_managers" on public.material_reads;
create policy "material_reads_select_owner_or_class_managers"
on public.material_reads for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.materials mat
    join public.module_steps ms on ms.id = mat.module_step_id
    join public.modules m on m.id = ms.module_id
    where mat.id = material_id
      and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "material_reads_insert_enrolled_student" on public.material_reads;
create policy "material_reads_insert_enrolled_student"
on public.material_reads for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.materials mat
    join public.module_steps ms on ms.id = mat.module_step_id
    join public.modules m on m.id = ms.module_id
    join public.classes c on c.id = m.class_id
    join public.class_members cm on cm.class_id = c.id
    where mat.id = material_id
      and cm.profile_id = (select auth.uid())
      and cm.role = 'student'
      and c.status = 'published'
      and m.is_locked = false
  )
);

drop policy if exists "material_reads_update_owner" on public.material_reads;
create policy "material_reads_update_owner"
on public.material_reads for update to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));
