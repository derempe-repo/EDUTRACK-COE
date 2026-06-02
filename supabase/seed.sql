-- Demo users for Learning MVP.
-- Password for all demo accounts: DemoPass123!

with demo_users(id, email, name, app_role) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'mahasiswa.demo@lms.test', 'Mahasiswa Demo', 'mahasiswa'::user_role),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'dosen.demo@lms.test', 'Dosen Demo', 'dosen'::user_role),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'admin.demo@lms.test', 'Admin Demo', 'admin'::user_role),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'superadmin.demo@lms.test', 'Super Admin Demo', 'super_admin'::user_role)
),
upsert_auth_users as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_anonymous
  )
  select
    '00000000-0000-0000-0000-000000000000'::uuid,
    id,
    'authenticated',
    'authenticated',
    email,
    crypt('DemoPass123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', name),
    now(),
    now(),
    false
  from demo_users
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '',
    email_change_token_current = '',
    reauthentication_token = '',
    updated_at = now(),
    deleted_at = null,
    banned_until = null
  returning id
),
upsert_identities as (
  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    id::text,
    id,
    jsonb_build_object(
      'sub', id::text,
      'email', email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  from demo_users
  on conflict (provider_id, provider) do update set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now()
  returning user_id
)
insert into public.profiles (
  id,
  name,
  email,
  role,
  status,
  created_at,
  updated_at
)
select
  id,
  name,
  email,
  app_role,
  'active'::user_status,
  now(),
  now()
from demo_users
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into public.classes (
  id,
  title,
  description,
  status,
  created_by,
  published_at,
  created_at,
  updated_at
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    'Pemrograman Web Dasar',
    'Kelas demo untuk alur LMS: materi, modul, tugas, dan kuis bertahap.',
    'published'::class_status,
    '22222222-2222-4222-8222-222222222222'::uuid,
    now(),
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid,
    'Basis Data Terapan',
    'Kelas draft untuk menyusun materi SQL, relasi, dan perancangan schema.',
    'draft'::class_status,
    '22222222-2222-4222-8222-222222222222'::uuid,
    null,
    now(),
    now()
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  created_by = excluded.created_by,
  published_at = excluded.published_at,
  updated_at = now();

insert into public.class_members (
  id,
  class_id,
  profile_id,
  role,
  joined_at,
  created_at,
  updated_at
)
values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    'lecturer'::member_role,
    now(),
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'student'::member_role,
    now(),
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    'lecturer'::member_role,
    now(),
    now(),
    now()
  )
on conflict (class_id, profile_id) do update set
  role = excluded.role,
  updated_at = now();

insert into public.modules (
  id,
  class_id,
  title,
  description,
  sort_order,
  is_locked,
  created_at,
  updated_at
)
values
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    'Pengenalan HTML dan CSS',
    'Struktur halaman, semantic markup, dan dasar styling.',
    1,
    false,
    now(),
    now()
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    'Interaktivitas dengan JavaScript',
    'Event, DOM, dan validasi form sederhana.',
    2,
    false,
    now(),
    now()
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_locked = excluded.is_locked,
  updated_at = now();

insert into public.module_steps (
  id,
  module_id,
  title,
  description,
  sort_order,
  is_required,
  created_at,
  updated_at
)
values
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'::uuid,
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,
    'Membaca materi HTML',
    'Pelajari elemen dasar, heading, link, gambar, dan form.',
    1,
    true,
    now(),
    now()
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'::uuid,
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,
    'Latihan layout CSS',
    'Bangun layout responsif sederhana memakai CSS modern.',
    2,
    true,
    now(),
    now()
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd3'::uuid,
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid,
    'Event dan DOM',
    'Kenali event listener dan manipulasi DOM dasar.',
    1,
    true,
    now(),
    now()
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_required = excluded.is_required,
  updated_at = now();

insert into public.materials (
  id,
  module_step_id,
  title,
  type,
  url,
  storage_path,
  description,
  sort_order,
  created_by,
  created_at,
  updated_at
)
values
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'::uuid,
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'::uuid,
    'Referensi HTML MDN',
    'link'::material_type,
    'https://developer.mozilla.org/docs/Web/HTML',
    null,
    'Dokumentasi rujukan untuk elemen HTML.',
    1,
    '22222222-2222-4222-8222-222222222222'::uuid,
    now(),
    now()
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2'::uuid,
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'::uuid,
    'Referensi CSS Layout',
    'link'::material_type,
    'https://developer.mozilla.org/docs/Learn/CSS/CSS_layout',
    null,
    'Materi pendamping untuk latihan layout.',
    1,
    '22222222-2222-4222-8222-222222222222'::uuid,
    now(),
    now()
  )
on conflict (id) do update set
  title = excluded.title,
  type = excluded.type,
  url = excluded.url,
  storage_path = excluded.storage_path,
  description = excluded.description,
  sort_order = excluded.sort_order,
  created_by = excluded.created_by,
  updated_at = now();
