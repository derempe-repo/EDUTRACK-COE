create schema if not exists private;

create or replace function private.write_audit_log(
  p_action text,
  p_actor_id uuid default auth.uid(),
  p_actor_role text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_ip_address text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_audit_log_id uuid;
  v_actor_role text;
begin
  if p_action is null or btrim(p_action) = '' then
    raise exception 'Audit action is required';
  end if;

  v_actor_role := p_actor_role;

  if v_actor_role is null and p_actor_id is not null then
    select role::text
    into v_actor_role
    from public.profiles
    where id = p_actor_id;
  end if;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address,
    user_agent
  )
  values (
    p_actor_id,
    v_actor_role,
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb),
    p_ip_address,
    p_user_agent
  )
  returning id into v_audit_log_id;

  return v_audit_log_id;
end;
$$;

create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_ip_address text default null,
  p_user_agent text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.write_audit_log(
    p_action,
    auth.uid(),
    null,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_ip_address,
    p_user_agent
  );
$$;

grant usage on schema private to anon, authenticated;
grant execute on function private.write_audit_log(text, uuid, text, text, uuid, jsonb, text, text) to anon, authenticated;
grant execute on function public.log_audit_event(text, text, uuid, jsonb, text, text) to anon, authenticated;

create policy "audit_logs_no_direct_select"
on public.audit_logs
for select
to anon, authenticated
using (false);

create policy "audit_logs_no_direct_insert"
on public.audit_logs
for insert
to anon, authenticated
with check (false);
