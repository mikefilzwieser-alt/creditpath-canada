alter table if exists public.goals
  add column if not exists goal_detail text;

alter table if exists public.goals
  add column if not exists goal_motivation text;
