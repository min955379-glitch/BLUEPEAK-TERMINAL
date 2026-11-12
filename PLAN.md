# BluePeak Terminal — Implementation Plan

## Objective

Keep the read-only market-analysis terminal and existing static HTML/CSS/vanilla-JS, Node gateway, Supabase Auth/MFA/AAL2, RLS, and Edge Function architecture. Upgrade the user experience to an institutional deep-navy, warm-ivory, muted-gold design and retain server-enforced access protections.

## Current implementation

- Shared high-contrast Dark/Light navy-ivory-gold tokens, local Inter/JetBrains Mono, persistent theme preference/toggles, theme-aware chart colors, and explicit control/select/option/placeholder styling; positive states remain non-green and are checked by `test-theme-contrast.js`.
- Sign-in remains on the existing gateway-managed customer/admin auth endpoints; password controls preserve the existing MFA/AAL2 gates.
- Admin dashboard now shows four user KPIs and links to the management workspace. User management includes add-user, strong password generation, credential copy, live requirement pills, search/filter counts, skeleton rows, toast feedback, destructive confirmations, and recent audit activity.
- `bluepeak-ui.js` implements shared toasts, keyboard-trapped confirmation dialogs, password visibility controls, and `/`, Ctrl/Cmd+K, and Escape behaviors. Customer scanner access redirects on expired 401 sessions.
- Admin `list-audit` is served only through the existing AAL2-verified `secure-bluepeak-admin` Edge Function.
- Delete remains immediate and permanent after an explicit confirmation. Supabase Auth deletion cascades profile and active-session data; audit snapshots are preserved with nullable references. UI removes the row and updates counts; there is no intermediate Deleted/Permanently purge workflow.
- User creation clears matching legacy soft-deleted buyer profiles before creation retry. Owner, self, and last-active-admin safeguards remain server-enforced.

## Backend/database and production execution

- Added `supabase/migrations/20261112160047_purge_legacy_soft_deleted_buyers.sql`; applied in the linked production Supabase project as migration `purge_legacy_soft_deleted_buyers` (version `20261112160047`). Preflight and post-migration queries found zero soft-deleted buyer/Auth identities to clean.
- Updated the `secure-bluepeak-admin` Edge Function with AAL2-only `list-audit`; production is ACTIVE version 8. Previous permanent deletion flow and owner/self/last-admin protections remain in place.
- The named legacy identity `saaaaaddKhan112` / `saaaaaddkhan112@users.bluepeak.invalid` remains absent from production Auth/profile/session tables. Earlier cleanup and audit history are preserved.
- The audit actor FK migration `20261112152724_detach_admin_audit_actor_on_auth_delete` and status migration are also applied. Service-role credentials remain server-only.

## Verification

Passed in the current worktree:

1. `node test-gateway-auth.js`
2. `node test-admin-user-management.js` — includes immediate deletion/reuse/policy contracts, owner/self/last-admin protection, migration, and zero-green source color audit.
3. `node test-pattern-scanner.js`
4. `node test-asset-scanner.js`
5. `node test-v1.js`
6. `node test-theme-contrast.js` — token contrast pairs, theme controls, form/dropdown styling, and green-family source audit.
7. `node --check` for the modified JavaScript files, `python -m json.tool vercel.json`, and `git diff --check`.

These tests are local mocks/source-contract checks, not an authenticated production UI test. No AAL2 admin session was used, and no replacement identity was created for the prior production purge test.

## Deployment and remaining acceptance

- The repository owner's prior source revision is on GitHub at commit `d2fdc3b27b67b7a4710274b324bc44bf2dde27c1`, and Vercel deployment `dpl_AbXrMpuxXipHTCfSF8GPtf118EeL` is READY/PROMOTED for it. The current dual-theme/contrast changes are newer local work and are not yet on GitHub or in that deployment; this agent does not push.
- Unauthenticated production smoke checks: `/` and public design assets load; `/admin/users` and `/admin/dashboard` redirect to `/admin`; `/app` redirects to `/`; `POST /api/admin` returns 401.
- The refreshed archive `BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip` includes this local theme update and is integrity-checked. The repository owner remains responsible for any GitHub upload; this agent does not push.
- Supabase `secure-bluepeak-admin` is ACTIVE version 8; deploy the stricter email-validation change in the current source before considering the backend fully current.
- With an authorized AAL2 admin session, privately test list/audit access and create/disable/enable/delete/recreate on disposable accounts. This has not been performed; avoid the owner, last admin, and real customers.
