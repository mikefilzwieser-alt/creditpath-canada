-- Soft-delete: VA admin deactivation retains client data but blocks portal access.
alter table if exists public.clients
  add column if not exists deactivated_at timestamptz default null;

comment on column public.clients.deactivated_at is
  'When set, the client is deactivated by VA admin; dashboard access is blocked and subscription should be cancelled.';
