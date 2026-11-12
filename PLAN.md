# BluePeak Terminal — Implementation Plan

## Objective
Maintain the read-only market-analysis terminal while keeping protected customer access and the separate MFA-protected Admin Portal enforced by the Vercel gateway and Supabase Edge Functions.

## Current update: safer customer user management

The source update adds status-based customer account control:

- **Active → Disabled:** set profile access to revoked, revoke tracked application sessions, apply a Supabase Auth ban, write an admin audit event, and block sign-in/API access through profile/session checks.
- **Disabled → Active:** remove the Auth ban, restore approved status, clear revocation metadata, and preserve the account, password, profile, and customer records. Existing sessions are not revived; the customer signs in again.
- **Delete User:** one confirmed action immediately removes the Supabase Auth identity, profile, BluePeak active sessions, and Auth sessions. Nullable historical references become NULL; the audit row stores the username/email snapshot without a target FK. The user disappears from the table and identifiers are reusable.
- **Legacy collision cleanup:** on account creation, matching soft-deleted buyer profiles are permanently removed before retrying creation; active/admin/owner records are never purged as cleanup.
- No controls act on admin/owner identities. Server checks protect self, owner, and last active admin regardless of UI.

## Files and schema

- Updated `admin-users.html`, `admin-portal.js`, `admin-dashboard.html`, and `api/gateway.js`.
- Updated `supabase/functions/secure-bluepeak-admin/index.ts`; added colocated pure rules module `user-management-rules.mjs`.
- Existing status migration `20261112150000_add_safe_user_management_status.sql` is retained. Added `20261112152724_detach_admin_audit_actor_on_auth_delete.sql` to snapshot audit actor identity and change its FK to `ON DELETE SET NULL` so audit history cannot block deletion.
- Added `test-admin-user-management.js` and expanded `test-gateway-auth.js`.
- Updated `README.md`, `PLAN.md`, `ROADMAP.md`, and `PROJECT_STATUS.md`.

## Security and state design

1. Keep all profile/session/audit tables under existing RLS and service-role-only policy. Never put the service-role key in front-end or Vercel source.
2. Gateway `/api/admin` requires approved admin role and AAL2. Edge Function independently verifies Auth user, admin profile, AAL2 claim, active admin session, and target role.
3. Disabled status remains `revoked`; ordinary Delete User is no longer soft-delete and does not leave a Deleted row or a second purge action.
4. Every mutation requires an AAL2/live admin session and server-side protection checks. Self, owner name/email, administrator roles, and last-admin protections remain enforced.
5. The `DELETE <username>` confirmation is verified server-side. Audit events identify actor/time, snapshot the actor UUID/name/email, and retain deleted target identifiers as details with no target FK.
6. `auth.users` deletion cascades `bp_profiles` and `bp_active_sessions`; existing login-event/audit/access-request relations use `SET NULL` where configured. Hard deletion failure is returned without claiming success.

## Validation complete in the workspace

- Existing Node regression suites passed: gateway/auth, pattern scanner, asset scanner, V1.
- New rule and source-contract checks cover disable/re-enable preservation, direct deletion, hidden deleted rows, same-username/email reuse cleanup, owner/self/last-admin protections, exact confirmation, and FK behavior.
- Gateway regression checks confirm the new admin actions are accepted only through authorized admin paths and delegated to the secured function.
- The current feature change was covered by local Node policy/source-contract tests and the full repository test suite; these do not create accounts against production or constitute an authenticated Supabase integration test.
- These are mocked/local tests. No real admin credentials or TOTP were used. The specifically requested already-soft-deleted test identity was removed from production by a guarded SQL delete after matching its exact user ID, email, username, role, and deleted state; post-delete counts confirmed Auth/profile/application-session records are absent. This is not an authenticated admin acceptance test.

## Manual release sequence (do not skip)

1. Manually upload archive files to the existing GitHub repository; this agent will not push.
2. The audit-actor-detachment migration `20261112152724_detach_admin_audit_actor_on_auth_delete.sql` and prior status migration are applied in the linked project; verify migration history before using another environment.
3. `secure-bluepeak-admin` was deployed as ACTIVE version 5. Keep existing Supabase function secrets configured.
4. Wait for Vercel to deploy the manually uploaded frontend/gateway source.
5. Privately test signed-in admin workflows, same-identifier recreation on a disposable account, direct protected API denial, reactivation, session revocation, audit rows, and the customer scanner.

## Out of scope / caution

- The update does not reset or reveal user passwords.
- Delete User permanently removes the Auth/profile/session identity after confirmation; disable/enable is the reversible path.
- No physical-device or authenticated-production test is claimed. Do not test deletion on the owner/last administrator or on a real customer's account without authorization and a backup/recovery plan.
