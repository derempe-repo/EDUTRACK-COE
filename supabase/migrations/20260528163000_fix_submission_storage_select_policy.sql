drop policy if exists "submissions_bucket_select_owner_or_class_managers" on storage.objects;
create policy "submissions_bucket_select_owner_or_class_managers"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    ((storage.foldername(name))[3])::uuid = (select auth.uid())
    or private.can_manage_class(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "submissions_bucket_delete_owner_or_class_managers" on storage.objects;
create policy "submissions_bucket_delete_owner_or_class_managers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'submissions'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    ((storage.foldername(name))[3])::uuid = (select auth.uid())
    or private.can_manage_class(((storage.foldername(name))[1])::uuid)
  )
);
