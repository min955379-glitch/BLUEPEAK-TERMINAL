# BluePeak Terminal — Roadmap

## Current release: Admin user-management controls

### Implemented in this source package
- Access status labels Active, Disabled, and Pending; deleted accounts are omitted from the table.
- Disable Access revokes tracked BluePeak sessions, sets profile status to revoked, applies a Supabase Auth ban, and records the admin action.
- Enable Access removes the ban and restores the existing user's approved profile without deleting data or changing their password. Old sessions remain revoked.
- Delete User is one confirmed permanent deletion of the Auth identity, profile, and active sessions; nullable historical foreign keys are detached and an audit snapshot records the removed identity.
- Legacy soft-deleted buyer records matching a username/email are automatically cleaned up before account creation, enabling immediate identifier reuse.
- Server-side authorization rechecks Auth user, admin role, AAL2, active administrator session, protected target roles, self/owner/last-admin guards, and confirmation strings.
- Responsive user table displays username/name, email, role, access state, registration date, and role/state-appropriate controls.
- Node transition/security contract tests and mocked browser workflow tests added.

### Required before production use
1. Upload the ZIP contents to the existing GitHub repository (manual action by repository owner).
2. Verify both existing migrations are applied, including `20261112152724_detach_admin_audit_actor_on_auth_delete.sql`, which snapshots audit actors and prevents audit FKs from blocking deletion.
3. `secure-bluepeak-admin` was updated and deployed to Supabase as ACTIVE version 5; existing server-side secrets remain server-only.
4. Wait for the Vercel deployment after manual GitHub upload and privately test deleting/recreating a disposable account with the exact same identifiers. Do not use a real customer account.

## Platform maintenance
- Continue read-only market-scanner maintenance and regression testing.
- Keep the mobile scanner in view near the top on phones and preserve `/admin` at small viewport widths.
- Keep docs, migrations, and deployment status aligned with the exact commit actually running in each service.

## Security and data policy
- Preserve Supabase RLS and service-role-only database access.
- Never manage admin/owner accounts through buyer controls; never self-disable or remove the last active administrator.
- Disable/Enable is the reversible suspension path; Delete User is irreversible after confirmation. Owner/self/last-admin protections remain mandatory.
- No service-role keys, passwords, TOTP codes, environment files, or customer secrets in GitHub or release archives.

## Acceptance gates
- Admin access actions work end-to-end with an authorized AAL2 session and create audit records.
- Disabled users cannot sign in or use an existing BluePeak session/API; re-enabled users can authenticate with existing credentials and retain profile/data.
- Deleted users never appear in the admin table; their Auth/profile/session rows are removed and identifiers can be reused; historical rows retain no dangling user FK.
- Buyer and unauthenticated calls cannot use admin endpoints; admin/owner protections remain effective.
- Existing sign-in, logout, account creation, password reset, scanner, mobile layout, and market-data features continue to pass regression tests.
