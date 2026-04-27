-- First-login onboarding: show modal until client dismisses it.
alter table if exists public.clients
  add column if not exists first_login_seen boolean not null default false;

comment on column public.clients.first_login_seen is 'When true, the first-login welcome modal has been dismissed.';

-- Allow authenticated users to update their own row (e.g. first_login_seen after onboarding modal).
drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
  on public.clients
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
