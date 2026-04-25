-- Action completions for blueprint top actions (client + blueprint + index unique).
-- Run via Supabase CLI `supabase db push` or paste into the SQL editor.

create table if not exists public.action_completions (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references auth.users (id) on delete cascade,
  blueprint_id uuid not null references public.blueprints (id) on delete cascade,
  action_index integer not null,
  action_text text,
  completed_at timestamptz default now(),
  unique (client_id, blueprint_id, action_index)
);

create index if not exists action_completions_client_blueprint_idx
  on public.action_completions (client_id, blueprint_id);

alter table public.action_completions enable row level security;

drop policy if exists "action_completions_select_own" on public.action_completions;
create policy "action_completions_select_own"
  on public.action_completions
  for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists "action_completions_insert_own" on public.action_completions;
create policy "action_completions_insert_own"
  on public.action_completions
  for insert
  to authenticated
  with check (client_id = auth.uid());

drop policy if exists "action_completions_update_own" on public.action_completions;
create policy "action_completions_update_own"
  on public.action_completions
  for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
