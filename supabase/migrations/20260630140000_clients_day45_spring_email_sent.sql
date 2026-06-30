-- Tracks Day 45 Spring Financial scheduled email so sends are idempotent.
alter table if exists public.clients
  add column if not exists day45_spring_email_sent boolean default false;
