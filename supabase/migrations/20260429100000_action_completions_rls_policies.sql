-- Standardize action_completions RLS (matches Supabase SQL Editor snippet).
-- Removes legacy policy names from earlier migrations, then applies named policies.

drop policy if exists "action_completions_select_own" on public.action_completions;
drop policy if exists "action_completions_insert_own" on public.action_completions;
drop policy if exists "action_completions_update_own" on public.action_completions;
drop policy if exists "action_completions_delete_own" on public.action_completions;

drop policy if exists "Users can read own completions" on public.action_completions;
drop policy if exists "Users can insert own completions" on public.action_completions;
drop policy if exists "Users can update own completions" on public.action_completions;
drop policy if exists "Users can delete own completions" on public.action_completions;

create policy "Users can read own completions"
  on public.action_completions
  for select
  to authenticated
  using (auth.uid() = client_id);

create policy "Users can insert own completions"
  on public.action_completions
  for insert
  to authenticated
  with check (auth.uid() = client_id);

create policy "Users can update own completions"
  on public.action_completions
  for update
  to authenticated
  using (auth.uid() = client_id);

create policy "Users can delete own completions"
  on public.action_completions
  for delete
  to authenticated
  using (auth.uid() = client_id);
