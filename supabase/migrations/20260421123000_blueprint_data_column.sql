alter table public.blueprints
  add column if not exists blueprint_data jsonb;
