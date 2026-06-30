-- CASL marketing opt-out timestamp (null = still subscribed to promotional emails).
alter table if exists public.clients
  add column if not exists unsubscribed_at timestamptz default null;
