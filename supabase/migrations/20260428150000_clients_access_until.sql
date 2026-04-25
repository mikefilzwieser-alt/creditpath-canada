-- Retain dashboard access for cancelled subscriptions until billing period end.

alter table if exists public.clients
  add column if not exists access_until timestamptz;
