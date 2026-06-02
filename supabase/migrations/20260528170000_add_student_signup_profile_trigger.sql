create or replace function private.handle_new_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  profile_name text;
begin
  if new.email is null then
    return new;
  end if;

  profile_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, name, email, role, status)
  values (new.id, profile_name, lower(new.email), 'mahasiswa', 'active')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_student_profile on auth.users;
create trigger on_auth_user_created_create_student_profile
after insert on auth.users
for each row execute function private.handle_new_student_profile();

grant execute on function private.handle_new_student_profile() to supabase_auth_admin;
