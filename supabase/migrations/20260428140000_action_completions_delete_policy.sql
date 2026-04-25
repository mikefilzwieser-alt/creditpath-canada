-- Allow clients to delete their own action completion rows (e.g. uncheck on Blueprint).

drop policy if exists "action_completions_delete_own" on public.action_completions;

create policy "action_completions_delete_own"
  on public.action_completions
  for delete
  to authenticated
  using (client_id = auth.uid());
