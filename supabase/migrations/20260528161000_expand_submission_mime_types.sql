update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/javascript',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/octet-stream',
  'text/css',
  'text/html',
  'text/javascript',
  'text/markdown',
  'text/plain'
]
where id = 'submissions';
