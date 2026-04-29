alter table if exists public.clients
  add column if not exists goal_selected boolean default false;
