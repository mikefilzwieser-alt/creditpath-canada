-- Stripe + subscription columns on clients (idempotent).
alter table if exists public.clients
  add column if not exists subscription_status text default 'trial';

alter table if exists public.clients
  add column if not exists stripe_customer_id text;

-- Authenticated users can read their own client row (dashboard paywall + profile).
alter table if exists public.clients enable row level security;

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
  on public.clients
  for select
  to authenticated
  using (id = auth.uid());
