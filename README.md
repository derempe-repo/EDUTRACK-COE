# Project LMS

Web LMS modular sesuai `PRD_Modular.md`.

## Runtime

- Node.js `>=24.15.0 <25`
- pnpm `11.3.0`
- Next.js `16.2.6`
- React `19.2.6`
- TypeScript `6.0.3`
- Supabase CLI `2.101.0`

Mesin lokal saat setup masih memakai Node `22.20.0`. Upgrade ke Node 24 LTS sebelum menjalankan project tanpa override engine.

## Commands

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm build
corepack pnpm typecheck
corepack pnpm lint
```

Jika pnpm belum tersedia sebagai command global di Windows, gunakan `corepack pnpm ...`.

## Environment

Salin `apps/web/.env.local.example` menjadi `apps/web/.env.local`, lalu isi:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
DATABASE_URL=
DATABASE_MIGRATION_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Hanya variable dengan prefix `NEXT_PUBLIC_` yang boleh dipakai browser.

## Database

```bash
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:studio
```

Supabase local config sudah dibuat di `supabase/config.toml` dengan Postgres major `17`.
