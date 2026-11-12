# BluePeak Terminal — Project Status

## Current request
Implement direct Delete User behavior with immediate username/email reuse, remove deleted rows from the Admin Users table, keep owner/self/last-active-admin safeguards, preserve Disable/Enable, update the project docs, deploy the Edge Function, clean up the specifically named old test account, and deliver a complete ZIP. The repository owner uploads the ZIP to GitHub; the assistant does not push.

## Implemented source changes
- **Delete User:** after one explicit confirmation that names the username/email and explains irreversibility, the server deletes the customer's Supabase Auth identity. Verified Auth FKs cascade-delete `bp_profiles`, `bp_active_sessions`, and Auth sessions; nullable historical references are detached. The audit snapshot stores username/email as details with a null target reference.
- **Immediate reuse:** when creating a user, the function checks both username and normalized email. A matching soft-deleted buyer identity is permanently cleaned up (Auth deletion cascades to its profile/sessions), cleanup is verified, then creation continues. Active records and owner/admin identities remain conflicts.
- **Admin table:** server and browser filters omit deleted profiles. The row is removed immediately after a successful response; there is no Deleted status row or Permanently purge button/action.
- **Security:** AAL2/MFA, approved admin role, active administrator session, server-side user checks, exact DELETE confirmation, owner username/email protection, self-protection, and admin/last-admin protections are retained. Disable/Enable behavior is unchanged.
- **Database:** `20261112152724_detach_admin_audit_actor_on_auth_delete.sql` is applied. It snapshots existing audit actors and makes the audit-actor FK nullable with `ON DELETE SET NULL`; the earlier status migration is also applied. Profile/session cascades and nullable historical references were verified.

## Production actions and deployment
- Updated `secure-bluepeak-admin` is **ACTIVE version 5** in Supabase project `ivpzznjunvxdfnpzggxp`.
- Anonymous POST probe to the function returned **401 — Admin authentication required**. No authenticated admin session was available; no authenticated feature action was exercised.
- The named production soft-deleted test account `saaaaaddKhan112` / `saaaaaddkhan112@users.bluepeak.invalid` was verified as a buyer soft-deleted profile, then removed with a guarded exact-ID/email/username/status SQL delete. Post-delete queries confirmed **0 Auth users, 0 profiles, and 0 application sessions** for that identity. The username/email are free. No replacement account was created.
- A database audit row (ID 14) records this one-off user-requested maintenance cleanup, its timestamp, target snapshot, and that it ran through the Supabase SQL connector rather than an authenticated app-admin session. Future UI deletions use the deployed AAL2 server handler and actor snapshot.
- The Vercel site is still on the prior user-pushed commit until the repository owner uploads these files and Vercel deploys them. This assistant made no GitHub push.

## Files updated for this request
- `admin-users.html`, `admin-portal.js`, `api/gateway.js`
- `supabase/functions/secure-bluepeak-admin/index.ts`
- `supabase/functions/secure-bluepeak-admin/user-management-rules.mjs`
- `test-admin-user-management.js`, `test-gateway-auth.js`
- `README.md`, `PLAN.md`, `ROADMAP.md`, `PROJECT_STATUS.md`
- Supporting source/deployment/upload documentation and inventory

The archive includes both schema migrations. Production history records the status migration as `20261112150559_add_safe_user_management_status` and the new audit-actor migration as `20261112152724_detach_admin_audit_actor_on_auth_delete`.

## Tests run locally
- `node test-admin-user-management.js`
- `node test-gateway-auth.js`
- `node test-pattern-scanner.js`
- `node test-asset-scanner.js`
- `node test-v1.js`
- Node syntax checks for gateway, admin UI, and test files
- esbuild Edge Function bundle and `node --check` on generated bundle
- `git diff --check`

All passed. Policy/source-contract tests include direct deletion, list filtering, soft-deleted collision cleanup, same-identifier reuse policy, session/FK semantics, MFA/AAL2, and owner/self/last-admin restrictions. They are local tests—not a real authenticated production integration test. No new account was created for a production reuse test.

## Delivery
Complete no-secrets archive: `/home/user/BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip`. It is prepared for manual upload to the existing GitHub repository. The required audit-actor migration is already applied, and the updated Supabase function is already deployed. After upload, wait for the Vercel deployment, then privately validate the UI with an authorized AAL2 admin and a disposable test customer.
