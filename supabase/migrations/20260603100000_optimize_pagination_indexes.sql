create index if not exists profiles_created_at_idx
on public.profiles using btree (created_at);

create index if not exists audit_logs_actor_role_created_at_idx
on public.audit_logs using btree (actor_role, created_at);

create index if not exists notifications_recipient_created_at_idx
on public.notifications using btree (recipient_id, created_at);
