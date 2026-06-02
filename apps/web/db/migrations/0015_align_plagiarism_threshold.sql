UPDATE "system_settings"
SET
  "value" = '70'::jsonb,
  "description" = 'Ambang similarity untuk menandai submission agar ditinjau dosen saat plagiarism checker diaktifkan.',
  "updated_at" = now()
WHERE "key" = 'plagiarism_threshold_percent';
