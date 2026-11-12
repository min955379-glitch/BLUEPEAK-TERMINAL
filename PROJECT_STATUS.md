# BluePeak Terminal — Project Status

## Current work
Implement a complete, server-enforced customer user-management workflow in the existing MFA-protected Admin Portal. The source package is based on remote `main` commit `2f6cdd5`. The changes are prepared locally for the repository owner to upload; this agent will not push to GitHub.

## Feature behavior
- **Disable Access:** only buyer accounts are targets. The server updates the profile to `revoked`, revokes all unrevoked `bp_active_sessions`, applies a long Supabase Auth ban, and writes an audit event. Existing protected routes/APIs independently re-check profile status and active session.
- **Enable Access:** only `revoked` buyers can be enabled. The Auth ban is removed; profile changes to `approved`, approval actor/time are refreshed, and revoke metadata is cleared. Existing sessions remain revoked; login with the current password creates a new session. No profile/customer records are deleted.
- **Delete User:** an explicit two-step confirmation soft-deletes a buyer (`access_status='deleted'`) and records deleted time, actor, and reason. It blocks login and protected access, revokes app sessions, applies an Auth ban, and retains the Auth/profile identity, related records, and audit history.
- **Permanent purge:** soft-deleted buyer only, designated profile `username='owner'` only, and separately protected by Auth user verification, AAL2, active admin session, and typed `PURGE <username>` confirmation. Supabase Auth deletion cascades profile and application session rows; configured historical references use `SET NULL`. This operation cannot be undone.
- Admin and owner profiles are never customer-management targets. Self, designated owner, and last-active-admin protections are checked server-side even if frontend controls are bypassed.
- User table shows username/name, email, role, Active/Disabled/Deleted/Pending status, registration date, and only relevant actions. The screen uses responsive contained table scrolling and status pills.

## Database inspection and migration
The linked Supabase project was inspected through its catalog. `bp_profiles.access_status` previously allowed `pending`, `approved`, and `revoked`; profile/session FKs cascade on Auth deletion; login-event and audit target references are nullable/set-null; RLS was enabled and no public table policies were returned. This change keeps the current RLS/privileges unchanged.

New migration: `supabase/migrations/20261112150000_add_safe_user_management_status.sql`. It adds `deleted_at`, `deleted_by`, and `deleted_reason`, permits the `deleted` status, and enforces a deleted-timestamp consistency check. It is additive and does not alter existing rows or delete user data. **It has not been applied to Supabase.** Apply after checking migration history.

## Files changed/added
Modified:
- `admin-dashboard.html`
- `admin-users.html`
- `admin-portal.js`
- `api/gateway.js`
- `supabase/functions/secure-bluepeak-admin/index.ts`
- `test-gateway-auth.js`
- `README.md`, `PLAN.md`, `ROADMAP.md`, `PROJECT_STATUS.md`

Added:
- `supabase/functions/secure-bluepeak-admin/user-management-rules.mjs`
- `supabase/migrations/20261112150000_add_safe_user_management_status.sql`
- `test-admin-user-management.js`

## Tests run
Passed locally on source based on `2f6cdd5`:
- `node test-gateway-auth.js`
- `node test-admin-user-management.js`
- `node test-pattern-scanner.js`
- `node test-asset-scanner.js`
- `node test-v1.js`
- Node syntax checks for gateway, admin UI, and test files; `git diff --check`.
- Playwright browser emulation at 390px with mocked account/API data: disable → enable → soft delete → owner purge; admin account controls protected; table stayed within viewport. User API responses were mocked.

The state/authorization checks are unit/source-contract tests and mocked browser flows—not a real authenticated Supabase integration test. No real customer account was changed, no admin password/TOTP was accessed, and no destructive production operation was executed. Deno/Supabase Edge Function runtime and the new migration have not yet been run against production.

## Deployment and manual configuration
- Existing Vercel production previously reported READY/PROMOTED from commit `2f6cdd5`; it does not include this new user-management implementation.
- Existing `secure-bluepeak-admin` Edge Function was previously reported ACTIVE v2; its deployed source does not yet include these new actions.
- Before enabling the feature: apply the new migration, deploy `secure-bluepeak-admin` from this package (including its colocated `.mjs` helper), and upload/push the Vercel frontend/gateway files through the owner's GitHub process. A Vercel Git deploy does not automatically deploy Supabase Functions or run SQL migrations unless an external CI workflow is configured.
- Existing Supabase server-side `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` must remain configured. The service-role key must never be exposed in the archive, Vercel client code, GitHub, or chat.

## Required private acceptance tests after deployment
1. Disable a disposable buyer and verify Auth ban/profile status/audit/session revocation.
2. Verify disabled login, existing session, and direct protected API are rejected.
3. Enable that buyer and sign in using existing credentials; check profile and customer data survived and old sessions were not reactivated.
4. Soft-delete a disposable buyer; verify it remains listed as Deleted but cannot sign in or use APIs.
5. Verify non-owner cannot purge; owner can purge with exact typed confirmation; inspect related FK cleanup/anonymization and audit.
6. Verify an administrator, owner, or last active administrator cannot be managed, and customers cannot call admin operations.
7. Recheck login, logout, password reset, account creation, mobile UI, scanners, and desktop behavior.

## Last updated
Admin user-management update prepared for manual GitHub upload. No GitHub push, Supabase migration/function deployment, or Vercel deployment was performed in this task.
