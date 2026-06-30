-- Tracks Day 25 KOHO scheduled email so sends are idempotent.
alter table if exists public.clients
  add column if not exists day25_koho_email_sent boolean default false;
