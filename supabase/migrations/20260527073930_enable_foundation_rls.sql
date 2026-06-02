do $$
begin
  create type public.user_role as enum ('mahasiswa', 'dosen', 'admin', 'super_admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.user_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.class_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_role as enum ('student', 'lecturer', 'assistant');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.material_type as enum ('pdf', 'video', 'slide', 'link');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.progress_status as enum (
    'not_started',
    'in_progress',
    'submitted',
    'verified',
    'failed',
    'locked'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.submission_status as enum (
    'draft',
    'submitted',
    'under_review',
    'accepted',
    'rejected',
    'locked',
    'resubmit_allowed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.plagiarism_status as enum (
    'pending',
    'passed',
    'flagged',
    'rejected_permanent',
    'resubmit_allowed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.quiz_attempt_status as enum ('started', 'submitted', 'reset', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.certificate_status as enum ('draft', 'issued', 'revoked');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_status as enum ('unread', 'read');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.forum_thread_status as enum ('open', 'answered', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.export_status as enum ('pending', 'processing', 'completed', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key,
  name text not null,
  email text not null,
  role public.user_role not null,
  status public.user_status not null default 'active',
  avatar_url text,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index if not exists profiles_email_unique on public.profiles(email);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at);
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create unique index if not exists system_settings_key_unique on public.system_settings(key);
create index if not exists system_settings_is_public_idx on public.system_settings(is_public);
create index if not exists system_settings_updated_by_idx on public.system_settings(updated_by);

alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "system_settings_select_public"
on public.system_settings
for select
to anon, authenticated
using (is_public = true);
