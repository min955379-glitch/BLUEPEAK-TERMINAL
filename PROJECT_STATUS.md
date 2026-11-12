# BluePeak Terminal — Project Status

## Current request and constraints
Upgrade the institutional UI and backend workflows while preserving the native HTML/CSS/vanilla-JS, Node gateway, Supabase Auth/MFA/AAL2, RLS, and Edge Function architecture. Keep username/email reuse immediate after deletion, enforce protection server-side, do not expose secrets, and do not push to GitHub. Deliver a verified ZIP and distinguish authenticated production verification from source-level tests.

## Implemented in the current worktree
- Added `bluepeak-design-system.css` with navy/ivory/gold tokens, shared responsive components, local font faces, table/card/KPI/skeleton/toast/dialog styles, and terminal class mappings.
- Added `bluepeak-ui.js` with stacked accessible notifications, native confirmation dialogs with focus containment, password visibility toggles, and keyboard shortcuts.
- Restored and styled the existing customer terminal in `index.html`; wired the shared CSS and helper assets through public gateway routes while keeping the terminal route itself protected.
- Restyled `admin-dashboard.html` and `admin-users.html`; added KPI cards, provisioning password generation/copy/requirements, search/filter/counts, loading skeletons, and audit display.
- Reworked `admin-portal.js` for escaped text rendering, modal confirmations, immediate row removal and count refresh, user/audit loading, password reset, and 401/403 session handling.
- Updated `bluepeak-access-ui.js`, `pattern-scanner.js`, and `api/gateway.js` for tokenized scanner styles, positive gold states, expiry redirects, and public delivery of CSS/helper/font assets. Added `list-audit` to the AAL2-secured admin Edge Function.
- Added `supabase/migrations/20261112160047_purge_legacy_soft_deleted_buyers.sql`. Single-step deletion and create-time stale-record cleanup remain server-side. Owner, self, and last-active-admin protections remain enforced.
- Added a regression test for the legacy cleanup migration and a green-family color literal/name scan.

## Production backend and database
- Migration `purge_legacy_soft_deleted_buyers` version `20261112160047` is applied to Supabase project `ivpzznjunvxdfnpzggxp`. Preflight found zero soft-deleted buyers; post-migration counts confirm zero remaining.
- `secure-bluepeak-admin` is ACTIVE version 8. Unauthenticated access remains expected to fail; admin actions require AAL2, admin role, and a live server-side session.
- The previously requested production identity `saaaaaddKhan112` / `saaaaaddkhan112@users.bluepeak.invalid` remains absent from Auth/profile/linked active-session records. Audit snapshots are retained. No replacement account was created.
- No authenticated admin session was used. Production UI acceptance and actual same-identifier recreation are therefore unverified.

## Tests and checks
All pass in this worktree:

- `node test-gateway-auth.js`
- `node test-admin-user-management.js`
- `node test-pattern-scanner.js`
- `node test-asset-scanner.js`
- `node test-v1.js`
- `node --check api/gateway.js`, `bluepeak-ui.js`, `admin-portal.js`, `pattern-scanner.js`, `scan-watched-assets.js`, and `bluepeak-access-ui.js`
- `python3 -m json.tool vercel.json`
- `git diff --check`

The suites are local source-contract/mocked tests. They are not evidence of authenticated production use.

## Deployment and next steps
- The frontend/gateway source has not been pushed (repository owner uploads manually). Vercel's latest production deployment is READY/PROMOTED for prior commit `a33905cb60c18e78128bcf829e7d191bf05e4c93`; it does not include this worktree's upgrade.
- Complete and validate `BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip`, excluding `.env`, `.vercel`, and `node_modules`.
- After the repository owner uploads the files, verify Vercel is READY/PROMOTED. Then run authorized AAL2 UI acceptance on disposable identities; no deletion of the owner, last admin, or real customer.
