-- Remove lingering legacy soft-deleted customer identities left by the former two-step workflow.
-- Auth deletion cascades the profile and application sessions; historical login/audit records retain
-- their snapshots and nullable user references. This migration deliberately does not touch active accounts.
BEGIN;

DO $$
DECLARE
  stale record;
  purged integer := 0;
BEGIN
  FOR stale IN
    SELECT profile.user_id, profile.username, profile.email
    FROM public.bp_profiles AS profile
    WHERE profile.role = 'buyer'
      AND (profile.access_status = 'deleted' OR profile.deleted_at IS NOT NULL)
  LOOP
    UPDATE public.bp_admin_audit AS audit
    SET details = COALESCE(audit.details, '{}'::jsonb)
      || jsonb_build_object(
        'deleted_username_snapshot', stale.username,
        'deleted_email_snapshot', stale.email,
        'legacy_cleanup_at', now()
      )
    WHERE audit.target_user_id = stale.user_id;

    DELETE FROM auth.users AS auth_user
    WHERE auth_user.id = stale.user_id;

    purged := purged + 1;
  END LOOP;

  RAISE NOTICE 'Purged % legacy soft-deleted customer account(s); audit snapshots preserved.', purged;
END;
$$;

COMMIT;
