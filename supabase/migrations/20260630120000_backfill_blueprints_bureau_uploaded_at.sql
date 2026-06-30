-- Backfill bureau_uploaded_at for blueprints created before the column was populated.
update public.blueprints
set bureau_uploaded_at = created_at
where bureau_uploaded_at is null
  and created_at is not null;
