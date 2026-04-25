-- Optional columns for VA-created clients (safe if table already has them).
alter table if exists public.clients
  add column if not exists assigned_va text;

alter table if exists public.clients
  add column if not exists free_trial boolean not null default false;

alter table if exists public.clients
  add column if not exists created_at timestamptz not null default now();
