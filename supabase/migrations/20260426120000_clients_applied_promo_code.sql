-- Promo code persisted when CCVIP2026 (or similar) is applied; paywall allows dashboard when set.
alter table if exists public.clients
  add column if not exists applied_promo_code text;
