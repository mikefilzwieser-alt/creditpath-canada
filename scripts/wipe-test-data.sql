-- =============================================================================
-- Wipe Supabase test data (public app tables + optional auth users)
-- Run in Supabase SQL Editor with a role that can modify auth.users (postgres).
-- Does NOT touch Stripe. Review before executing in production.
-- =============================================================================

-- 1) Public tables (child rows first if your FKs differ, adjust order)
delete from public.action_completions;
delete from public.monthly_plans;
delete from public.blueprints;
delete from public.clients;

-- 2) Optional: public.goals (only if this table exists in your project)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'goals'
  ) then
    execute 'delete from public.goals';
  end if;
end $$;

-- 3) Auth users — KEEP your admin account only (uncomment ONE option and edit before running)
--
-- Option A — keep a single user by id (from: select id, email from auth.users;)
-- delete from auth.users
-- where id <> 'PASTE-ADMIN-USER-UUID-HERE'::uuid;
--
-- Option B — keep every user whose email matches (exact match after lower/trim)
-- delete from auth.users
-- where lower(trim(email)) is distinct from lower(trim('your-admin@example.com')));
