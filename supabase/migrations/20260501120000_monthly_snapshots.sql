-- Monthly momentum snapshots: one persisted row per client per program month.
create table if not exists public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  blueprint_id uuid not null references public.blueprints (id) on delete cascade,
  program_month integer not null,
  on_track boolean not null default false,
  streak_count integer not null default 0,
  actions_completed_total integer not null default 0,
  months_clean integer not null default 0,
  equifax_score integer,
  created_at timestamptz not null default now(),
  unique (client_id, program_month)
);

create index if not exists monthly_snapshots_client_id_idx
  on public.monthly_snapshots (client_id);

create index if not exists monthly_snapshots_blueprint_id_idx
  on public.monthly_snapshots (blueprint_id);

alter table public.monthly_snapshots enable row level security;

drop policy if exists "Users can read own monthly snapshots" on public.monthly_snapshots;
create policy "Users can read own monthly snapshots"
  on public.monthly_snapshots
  for select
  to authenticated
  using (auth.uid() = client_id);

grant select on table public.monthly_snapshots to authenticated;
grant select, insert, update, delete on table public.monthly_snapshots to service_role;
