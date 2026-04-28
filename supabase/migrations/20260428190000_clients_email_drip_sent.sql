-- Tracks transactional drip emails (day 3 / day 7) so sends are idempotent.
alter table if exists public.clients
  add column if not exists email_drip_brandon_day3_sent_at timestamptz;

alter table if exists public.clients
  add column if not exists email_drip_eq_day7_sent_at timestamptz;
