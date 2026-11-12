-- Add soft-deletion metadata and status without deleting or rewriting existing accounts.
-- Existing disabled accounts remain access_status='revoked'; only new Delete User actions
-- set access_status='deleted'. RLS and existing privileges are unchanged.

ALTER TABLE public.bp_profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

ALTER TABLE public.bp_profiles
  DROP CONSTRAINT IF EXISTS bp_profiles_access_status_check;

ALTER TABLE public.bp_profiles
  ADD CONSTRAINT bp_profiles_access_status_check
  CHECK (access_status IN ('pending', 'approved', 'revoked', 'deleted'));

ALTER TABLE public.bp_profiles
  DROP CONSTRAINT IF EXISTS bp_profiles_deleted_metadata_check;

ALTER TABLE public.bp_profiles
  ADD CONSTRAINT bp_profiles_deleted_metadata_check
  CHECK ((access_status = 'deleted') = (deleted_at IS NOT NULL));

CREATE INDEX IF NOT EXISTS bp_profiles_deleted_at_idx
  ON public.bp_profiles (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;
