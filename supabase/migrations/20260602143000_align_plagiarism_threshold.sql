update public.system_settings
set
  value = '70'::jsonb,
  description = 'Ambang similarity untuk menandai submission agar ditinjau dosen saat plagiarism checker diaktifkan.',
  updated_at = now()
where key = 'plagiarism_threshold_percent';
