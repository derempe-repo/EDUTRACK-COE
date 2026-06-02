insert into public.system_settings (key, value, description, is_public)
values
  ('registrations_enabled', 'true'::jsonb, 'Mengizinkan pendaftaran akun mahasiswa baru dari halaman registrasi.', false),
  ('plagiarism_threshold_percent', '30'::jsonb, 'Ambang similarity untuk menandai submission saat plagiarism checker diaktifkan.', false),
  ('audit_retention_days', '90'::jsonb, 'Target retensi audit log dalam hari untuk kebijakan operasional.', false)
on conflict (key) do nothing;
