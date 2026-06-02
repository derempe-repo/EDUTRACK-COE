alter table public.assignments
  add column if not exists attachment_storage_path text,
  add column if not exists attachment_file_name text,
  add column if not exists attachment_file_size integer,
  add column if not exists attachment_mime_type text;
