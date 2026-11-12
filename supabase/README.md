# Supabase project source and release notes

This directory contains four Supabase Edge Function sources, CLI configuration, and schema migrations. SQL files contain schema/metadata migrations only, not credentials or user passwords.

## Edge Functions

- `bluepeak-access` — session/status enforcement and protected operations.
- `secure-bluepeak-auth` — username/email login, administrator TOTP verification, session limits, and login/account controls.
- `secure-bluepeak-admin` — AAL2-protected administrator operations: create/list/reset, disable/enable, direct confirmed permanent deletion, and cleanup of matching legacy soft-deleted buyer records during identifier reuse.
- `secure-bluepeak-admin/user-management-rules.mjs` — colocated status, owner/self/admin protection, list filtering, and confirmation rules imported by the admin function.
- `secure-bluepeak-bootstrap` — one-time first-owner bootstrap.

`verify_jwt = false` is intentional because some functions handle sign-in. Each function performs its own server-side Auth verification. Admin user operations independently require a valid Auth user, approved admin profile, `aal2` claim, and unrevoked `bp_active_sessions` row. Preserve these checks.

## Migrations

The production project already has the original `bp_*` schema, email identifier migration, and safe-user-status migration. Current migration history includes:

- `20261112150000_add_safe_user_management_status.sql` (recorded as `20261112150559`) — legacy soft-delete fields/status. Existing `deleted` rows are hidden from the UI and matching buyer rows are purged during reuse.
- `20261112152724_detach_admin_audit_actor_on_auth_delete.sql` — snapshots existing audit actor UUID/name/email into JSON details, makes `admin_user_id` nullable, and changes that FK to `ON DELETE SET NULL`. This preserves audit history and prevents old actor references from blocking an authorized account deletion.

The audit-actor migration is applied in production and its constraint was verified. Profile and active-session FKs cascade on Auth deletion; nullable historical references use `SET NULL`. For a different environment, inspect migration history before applying the included migrations:

```sh
supabase link --project-ref ivpzznjunvxdfnpzggxp
supabase migration list
supabase db push
supabase migration list
```

## User-state semantics

- `approved`: active; login/status checks permit access only when the session record is active.
- `revoked`: Disabled. Existing app sessions are revoked, profile/status checks deny new and existing requests, and the Auth account is banned. Enabling restores the same account/password but not prior sessions.
- Legacy `deleted` profile rows are never included in the Existing users list. During account creation, exact matching soft-deleted buyer identities are removed before creating a replacement with the same username/email.

Current Delete User uses one explicit confirmation and calls `auth.admin.deleteUser` only after server-side AAL2/admin/session/target/owner/self/confirmation checks. Auth deletion cascades profile and app sessions; historical target refs detach, while audit actor snapshots remain in JSON with the FK set NULL. There is no separate Permanently purge workflow.

RLS remains enabled; direct public/authenticated table access is still revoked. All mutations use the service-role client only inside the Edge Function. Do not put `SUPABASE_SERVICE_ROLE_KEY` in GitHub, Vercel client source, this archive, or chat.

## Deployment status

`secure-bluepeak-admin` is deployed to project `ivpzznjunvxdfnpzggxp` as ACTIVE version 5. If it needs a later update, deploy the function folder so the `.mjs` helper is included:

```sh
supabase functions deploy secure-bluepeak-admin
```

Confirm existing Supabase function secrets remain configured. Do not create or expose secrets in project source.
