# Supabase project source

This directory contains the four Edge Function sources, Supabase CLI project configuration, four migrations previously recorded in the linked project, and the username/email migration `20261112124634`, which is now applied. The SQL files contain schema only, not user records or credentials.

## Edge Functions

- `bluepeak-access` — access/session status and revocation plus legacy protected operations.
- `secure-bluepeak-auth` — local source supports buyer username-or-email/password sign-in, admin TOTP verification, session limits, and legacy admin account operations. The deployed function has not been updated.
- `secure-bluepeak-admin` — server-verified admin user-management operations.
- `secure-bluepeak-bootstrap` — one-time first-owner bootstrap.

The functions are configured with `verify_jwt = false` because they expose both sign-in and protected actions. Each function must retain its own server-side JWT, profile-role, active-session, and (for admin operations) AAL2 checks. Do not remove or bypass those checks.

## Migrations

The original project migration versions are retained in `migrations/`:

1. `20261112063225_create_bluepeak_access_tables.sql`
2. `20261112063503_add_coarse_login_location.sql`
3. `20261112063826_add_access_control_settings.sql`
4. `20261112064007_remove_duplicate_pending_index.sql`

They create the six `bp_*` tables, enable RLS, restrict direct table access to `service_role`, create indexes/constraints, and add coarse location/session settings. The migrations do not create RLS policies. Do not weaken RLS or grant direct client access as a routing workaround.

### Applied email-identifier migration

`migrations/20261112124634_allow_email_identifiers.sql` expands the `bp_profiles.username` constraint and adds case-insensitive uniqueness. A preflight found zero case-insensitive duplicate profile identifiers. After application, two profiles remained and zero identifiers violated the new constraint. It does not alter the `bp_access_requests` username check.

## Local CLI workflow

After installing the Supabase CLI and authenticating locally (never put credentials in this archive or chat):

```sh
supabase link --project-ref ivpzznjunvxdfnpzggxp
supabase migration list
supabase functions deploy bluepeak-access
supabase functions deploy secure-bluepeak-auth
supabase functions deploy secure-bluepeak-admin
supabase functions deploy secure-bluepeak-bootstrap
```

Before applying migrations to any existing database, compare migration history first. The current linked project was previously confirmed to have the four original listed versions applied. The additional email-identifier migration is applied as version `20261112124634`. Keep `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and especially `SUPABASE_SERVICE_ROLE_KEY` in Supabase's server-side function secrets. Never commit actual secret values or `.env` files.

## Auth dashboard settings

Supabase Auth is configured with email/password authentication, public signup disabled, and TOTP MFA enabled. These hosted Auth settings are not represented by a local SQL migration; verify them in the Supabase dashboard when setting up a different project.
