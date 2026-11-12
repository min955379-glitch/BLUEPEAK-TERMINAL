# BluePeak Terminal — Roadmap

## Current release: Admin user-management controls

### Implemented in this source package
- Access status labels Active, Disabled, Deleted, and Pending.
- Disable Access revokes tracked BluePeak sessions, sets profile status to revoked, applies a Supabase Auth ban, and records the admin action.
- Enable Access removes the ban and restores the existing user's approved profile without deleting data or changing their password. Old sessions remain revoked.
- Delete User is a confirmed soft delete; it blocks access, retains profile/related records, and records the acting administrator.
- Designated owner can permanently purge a previously soft-deleted customer using a separate confirmed owner-only operation.
- Server-side authorization rechecks Auth user, admin role, AAL2, active administrator session, protected target roles, self/owner/last-admin guards, and confirmation strings.
- Responsive user table displays username/name, email, role, access state, registration date, and role/state-appropriate controls.
- Node transition/security contract tests and mocked browser workflow tests added.

### Required before production use
1. Upload the ZIP contents to the existing GitHub repository (manual action by repository owner).
2. Apply `supabase/migrations/20261112150000_add_safe_user_management_status.sql` to the existing Supabase project after checking migration history.
3. Deploy `secure-bluepeak-admin` including `user-management-rules.mjs` and confirm server-side Supabase secrets are configured.
4. Wait for Vercel deployment and run authenticated owner/admin/customer acceptance tests privately.

## Platform maintenance
- Continue read-only market-scanner maintenance and regression testing.
- Keep the mobile scanner in view near the top on phones and preserve `/admin` at small viewport widths.
- Keep docs, migrations, and deployment status aligned with the exact commit actually running in each service.

## Security and data policy
- Preserve Supabase RLS and service-role-only database access.
- Never manage admin/owner accounts through buyer controls; never self-disable or remove the last active administrator.
- Soft deletion is the routine Delete User behavior. Permanent purge is irreversible and owner-only.
- No service-role keys, passwords, TOTP codes, environment files, or customer secrets in GitHub or release archives.

## Acceptance gates
- Admin access actions work end-to-end with an authorized AAL2 session and create audit records.
- Disabled users cannot sign in or use an existing BluePeak session/API; re-enabled users can authenticate with existing credentials and retain profile/data.
- Soft-deleted users cannot access the terminal; non-owners cannot permanently purge; related records follow declared FK rules.
- Buyer and unauthenticated calls cannot use admin endpoints; admin/owner protections remain effective.
- Existing sign-in, logout, account creation, password reset, scanner, mobile layout, and market-data features continue to pass regression tests.
