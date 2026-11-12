-- Keep audit history while allowing an Auth identity with historical actor events to be deleted.
-- Existing actor UUID/name/email are copied into JSON details before the FK is detached.
BEGIN;

UPDATE public.bp_admin_audit AS audit
SET details = COALESCE(audit.details, '{}'::jsonb)
  || jsonb_build_object('actor_user_id_snapshot', audit.admin_user_id::text)
WHERE audit.admin_user_id IS NOT NULL
  AND NOT (COALESCE(audit.details, '{}'::jsonb) ? 'actor_user_id_snapshot');

UPDATE public.bp_admin_audit AS audit
SET details = COALESCE(audit.details, '{}'::jsonb)
  || jsonb_build_object('actor_username', profile.username, 'actor_email', profile.email)
FROM public.bp_profiles AS profile
WHERE profile.user_id = audit.admin_user_id
  AND audit.admin_user_id IS NOT NULL;

ALTER TABLE public.bp_admin_audit
  ALTER COLUMN admin_user_id DROP NOT NULL;

ALTER TABLE public.bp_admin_audit
  DROP CONSTRAINT IF EXISTS bp_admin_audit_admin_user_id_fkey;

ALTER TABLE public.bp_admin_audit
  ADD CONSTRAINT bp_admin_audit_admin_user_id_fkey
  FOREIGN KEY (admin_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

COMMIT;
