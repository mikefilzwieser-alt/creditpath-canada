-- Trial window start (used for dashboard trial-end display).
alter table if exists public.clients
  add column if not exists trial_start timestamptz;
