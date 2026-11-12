# Supabase project source and release notes

This directory contains four Supabase Edge Function sources, CLI configuration, and schema migrations. SQL files contain schema only—not user rows, passwords, or credentials. The feature archive includes the new safe user-management migration, which has **not** yet been applied.

## Edge Functions

- `bluepeak-access` — session/status enforcement and legacy protected operations.
- `secure-bluepeak-auth` — username/email login, admin TOTP verification, session limits, and login/account controls.
- `secure-bluepeak-admin` — AAL2-protected administrator operations; updated source supports disable, enable, soft-delete, owner-only permanent purge, and existing account operations.
- `secure-bluepeak-admin/user-management-rules.mjs` — colocated status-transition/confirmation/protected-target rules imported by the admin function.
- `secure-bluepeak-bootstrap` — one-time first-owner bootstrap.

`verify_jwt = false` is intentional because some functions handle sign-in. Each function performs its own server-side Auth verification. Admin user operations independently require a valid Auth user, approved admin profile, `aal2` claim, and unrevoked `bp_active_sessions` row. Preserve these checks.

## Migrations

The existing project has the original `bp_*` schema and email identifier migration. The archive adds:

- `migrations/20261112150000_add_safe_user_management_status.sql` — adds soft-delete metadata and permits profile status `deleted`. It does not remove data, disable RLS, or add client policies.

Check migration history before applying. The project previously had the earlier migrations recorded/applied; this newest migration is pending. With the correct project linked:

```sh
supabase link --project-ref ivpzznjunvxdfnpzggxp
supabase migration list
supabase db push
supabase migration list
```

Review the proposed migration before confirmation. It only adds nullable columns/checks/index; it is designed to preserve existing profiles.

## User-state semantics

- `approved`: active; custom login/status checks permit access only when the session record is active.
- `revoked`: Disabled. Existing app sessions are revoked, profile/status checks deny new and existing requests, and the Auth account is banned. Enabling restores the same account/password but not prior sessions.
- `deleted`: soft-deleted and denied; existing profile/data/audit references remain. A separately protected permanent purge is available only to the designated `owner` profile after exact confirmation.

Soft deletion is the default Delete User action. Permanent purge uses `auth.admin.deleteUser` only after server-side owner/AAL2/session/status/confirmation checks. Existing FK relationships cascade profile/application session rows, while nullable historical references are set to NULL. Audit metadata records the purged identifier.

RLS remains enabled, with direct public/authenticated table access still revoked. All mutations use the service-role client only inside the Edge Function. Do not put `SUPABASE_SERVICE_ROLE_KEY` in GitHub, Vercel client source, this archive, or chat.

## Deploy updated Edge Function

After the migration is applied, deploy the function folder—not just the single `index.ts`, so the helper file is bundled:

```sh
supabase functions deploy secure-bluepeak-admin
```

Confirm the existing Supabase function secrets are present in the Supabase dashboard. Do not create or expose secrets in project source. Verify deployment status after publish.

## Auth settings

The existing project uses email/password Auth, disabled public signup, and TOTP MFA. These hosted Auth settings are not changed by the new migration. Keep those settings and service-role credentials private.
