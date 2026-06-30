-- Tracks Month 2 scheduled emails so sends are idempotent.
alter table if exists public.clients
  add column if not exists month2_checkin_email_sent boolean default false;

alter table if exists public.clients
  add column if not exists month2_cards_email_sent boolean default false;
