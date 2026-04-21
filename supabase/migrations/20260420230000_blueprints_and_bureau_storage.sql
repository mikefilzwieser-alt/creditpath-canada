-- Blueprints (parsed bureau JSON). Service role bypasses RLS for API routes.
create table if not exists public.blueprints (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  month_number integer not null default 1,
  status text not null default 'processing',
  raw_parse_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, month_number)
);

alter table public.blueprints enable row level security;

drop policy if exists "Users read own blueprints" on public.blueprints;
create policy "Users read own blueprints"
  on public.blueprints
  for select
  to authenticated
  using (client_id = auth.uid());

-- Storage policies for existing `bureaus` bucket (create the bucket in Supabase dashboard if needed).

drop policy if exists "Bureaus insert own prefix" on storage.objects;
drop policy if exists "Bureaus select own prefix" on storage.objects;
drop policy if exists "Bureaus update own prefix" on storage.objects;
drop policy if exists "Bureaus delete own prefix" on storage.objects;

create policy "Bureaus insert own prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'bureaus'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Bureaus select own prefix"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'bureaus'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Bureaus update own prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'bureaus'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Bureaus delete own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'bureaus'
    and (storage.foldername (name))[1] = auth.uid()::text
  );
