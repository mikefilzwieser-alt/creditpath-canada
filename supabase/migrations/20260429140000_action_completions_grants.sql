-- If action_completions was created without default API grants, PostgREST can reject requests.
-- Safe to re-run.
--
-- 400 Bad Request on every verb often means the PostgREST schema cache references a column
-- the DB does not have (e.g. missing program_month from 20260427120000_monthly_progression.sql).
-- In Supabase SQL Editor: select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'action_completions';

grant select, insert, update, delete on table public.action_completions to authenticated;
grant select, insert, update, delete on table public.action_completions to service_role;
