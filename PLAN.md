# BluePeak Terminal — Implementation Plan

## Objective
Maintain the read-only market-analysis terminal while keeping protected customer access and the separate MFA-protected Admin Portal enforced by the Vercel gateway and Supabase Edge Functions.

## Current update: safer customer user management

The source update adds status-based customer account control:

- **Active → Disabled:** set profile access to revoked, revoke tracked application sessions, apply a Supabase Auth ban, write an admin audit event, and block sign-in/API access through profile/session checks.
- **Disabled → Active:** remove the Auth ban, restore approved status, clear revocation metadata, and preserve the account, password, profile, and customer records. Existing sessions are not revived; the customer signs in again.
- **Delete User:** soft-delete the account (`access_status='deleted'`), Auth-ban it, revoke tracked sessions, and record who/when. Data stays recoverable and appears as Deleted.
- **Permanent purge:** separately available only to the designated owner, with AAL2/active-session checks and a typed confirmation. Supabase Auth deletion uses existing FK behavior for profile/sessions and historical records.
- No controls act on admin/owner identities. Server checks protect self, owner, and last active admin regardless of UI.

## Files and schema

- Updated `admin-users.html`, `admin-portal.js`, `admin-dashboard.html`, and `api/gateway.js`.
- Updated `supabase/functions/secure-bluepeak-admin/index.ts`; added colocated pure rules module `user-management-rules.mjs`.
- Added migration `20261112150000_add_safe_user_management_status.sql` for `deleted_at`, `deleted_by`, `deleted_reason`, and the `deleted` status. It is additive and does not alter RLS.
- Added `test-admin-user-management.js` and expanded `test-gateway-auth.js`.
- Updated `README.md`, `PLAN.md`, `ROADMAP.md`, and `PROJECT_STATUS.md`.

## Security and state design

1. Keep all profile/session/audit tables under existing RLS and service-role-only policy. Never put the service-role key in front-end or Vercel source.
2. Gateway `/api/admin` requires approved admin role and AAL2. Edge Function independently verifies Auth user, admin profile, AAL2 claim, active admin session, and target role.
3. Disabled status is stored as `revoked`; UI labels it Disabled. `deleted` is a separate soft-delete state and cannot be re-enabled with the ordinary Enable Access action.
4. Owner-only permanent purge requires the `owner` profile, a soft-deleted buyer, AAL2/live admin session, and exact `PURGE <username>` confirmation.
5. Audit events identify the acting admin and action. Soft-delete preserves target references; hard purge records a nullable target reference with identifier details after Auth deletion.
6. `auth.users` deletion cascades `bp_profiles` and `bp_active_sessions`; existing login-event/audit/access-request relations use `SET NULL` where configured. Hard deletion failure is returned without claiming success.

## Validation complete in the workspace

- Existing Node regression suites passed: gateway/auth, pattern scanner, asset scanner, V1.
- New pure transition checks cover preserved profile data, disable/re-enable/soft-delete states, owner/self/last-admin protections, and exact delete/purge confirmations.
- Gateway regression checks confirm the new admin actions are accepted only through authorized admin paths and delegated to the secured function.
- Browser emulation with mocked user rows exercised Active → Disabled → Active → Deleted → Purged, protected owner controls, and phone-width overflow containment.
- These are mocked/local tests. No real admin credentials, TOTP, or production account mutation was used; the Edge Function has not been run against production as part of this archive build.

## Manual release sequence (do not skip)

1. Manually upload archive files to the existing GitHub repository; this agent will not push.
2. Check Supabase migration history, then apply the additive migration with Supabase CLI (`supabase db push`).
3. Deploy `secure-bluepeak-admin` from `supabase/functions/secure-bluepeak-admin/` so the helper module is included. Confirm the existing function secrets remain configured.
4. Wait for Vercel to deploy GitHub's Vercel source changes.
5. Privately test signed-in owner/admin/customer workflows, direct protected API denial, reactivation with old credentials, session revocation, audit rows, and the customer scanner.

## Out of scope / caution

- The update does not reset or reveal user passwords.
- Soft delete keeps database profile and related data. Permanent purge is irreversible and owner-only.
- No physical-device or authenticated-production test is claimed. Do not test deletion on the owner/last administrator or on a real customer's account without authorization and a backup/recovery plan.
