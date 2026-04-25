-- Monthly program: blueprint progress columns, monthly_plans, action_completions.program_month

alter table public.blueprints
  add column if not exists current_month integer not null default 1;

alter table public.blueprints
  add column if not exists month_unlocked_at timestamptz;

-- Backfill: treat existing blueprints as month 1 started at creation time
update public.blueprints
set month_unlocked_at = coalesce(month_unlocked_at, created_at)
where month_unlocked_at is null;

alter table public.blueprints
  alter column month_unlocked_at set default now();

alter table public.action_completions
  add column if not exists program_month integer not null default 1;

alter table public.action_completions
  drop constraint if exists action_completions_client_id_blueprint_id_action_index_key;

drop index if exists action_completions_client_blueprint_action_unique;

create unique index if not exists action_completions_client_blueprint_program_action_idx
  on public.action_completions (client_id, blueprint_id, program_month, action_index);

create table if not exists public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users (id) on delete cascade,
  blueprint_id uuid not null references public.blueprints (id) on delete cascade,
  month_number integer not null,
  theme text,
  actions jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  unlocked_at timestamptz not null default now(),
  unique (client_id, blueprint_id, month_number)
);

create index if not exists monthly_plans_blueprint_month_idx
  on public.monthly_plans (blueprint_id, month_number);

alter table public.monthly_plans enable row level security;

drop policy if exists "Users can read own monthly plans" on public.monthly_plans;
create policy "Users can read own monthly plans"
  on public.monthly_plans
  for select
  to authenticated
  using (auth.uid() = client_id);

drop policy if exists "Users can insert own monthly plans" on public.monthly_plans;
create policy "Users can insert own monthly plans"
  on public.monthly_plans
  for insert
  to authenticated
  with check (auth.uid() = client_id);

drop policy if exists "Users can update own monthly plans" on public.monthly_plans;
create policy "Users can update own monthly plans"
  on public.monthly_plans
  for update
  to authenticated
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);
