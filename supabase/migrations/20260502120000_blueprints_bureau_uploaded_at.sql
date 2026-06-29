alter table public.blueprints
  add column if not exists bureau_uploaded_at timestamptz;
