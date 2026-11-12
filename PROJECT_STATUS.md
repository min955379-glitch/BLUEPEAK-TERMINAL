# BluePeak Terminal — Project Status

## 1. Project Overview
BluePeak is a read-only crypto market terminal with an 18-asset public-data watchlist, charts, market monitor, historical pattern detection, and V1 trend-continuation analysis. It does not execute trades, handle funds, predict prices, or provide trading advice. Customer access is provisioned by an administrator; public sign-up is not offered.

## 2. Current Development Status
The local deployment package contains the server-side access gateway, separate customer and administrator routes, and dedicated admin dashboard/user pages. Username-or-email creation/login support, the session-independent `/login` route, mobile-compatible device ID creation, and narrow-screen dashboard containment are implemented locally. Migration `20261112124634_allow_email_identifiers` was applied successfully to the linked Supabase project after a zero-duplicate preflight; profile validation still reports two profiles and zero invalid identifiers. **The changed Vercel gateway/source is not yet deployed to production.** Supabase reports `secure-bluepeak-admin` version 2 active with email-identifier support, but the latest function listing still reports `secure-bluepeak-auth` version 1; its update is not confirmed. GitHub source/documentation synchronization is also local and has not been pushed. The designated owner is represented by the existing `admin` role; there are no distinct owner-only operations in the current app.

## 3. Completed Tasks
- Market terminal and 18-asset scanner, including historical pattern detection, uptrend criteria, and V1 trend continuation.
- Synthetic scanner/adapter/V1 tests pass.
- Supabase Edge Functions for username/password login, approved access/session tracking, owner bootstrap, TOTP admin auth, user operations, password reset, and revocation were previously deployed. The current Supabase listing reports `secure-bluepeak-admin` version 2 active (updated email-identifier admin flow) and `secure-bluepeak-auth` version 1 active (username-only); a live safe negative auth request returned the uniform expected 401. The new email-login path is therefore not confirmed active.
- Server gateway and Secure/HttpOnly session cookies are implemented in the local package.
- Local separate admin dashboard and users page check administrator role and AAL2 through the gateway and admin API.
- Local gateway authorization regression tests pass for signed-out/buyer/admin routing, the direct `/login` customer screen even during an admin session, customer redirects/denials, admin MFA/AAL2 route guards, unknown-role fail-closed behavior, silent access-token refresh, expired/revoked sessions, logout cookie clearing, token-cookie handling, and admin API authorization. Static assertions cover the identifier UI/function/migration wiring and reviewed admin navigation.
- Removed the `Admin panel` and `Sign out this device` controls and their duplicate customer-interface admin handler from `bluepeak-access-ui.js`; customer logout is available in the terminal's global top bar, and the dedicated Admin Portal keeps its navigation/logout controls. Both use `/api/logout`.
- Supabase Auth was previously observed with public signup disabled, TOTP enabled, and email/password authentication enabled. All six `bp_*` public tables had RLS enabled; no table policies were returned by the catalog check. No database policy was changed. The new identifier migration has been applied; profile count and identifier validity were checked after application.
- Preserved the four original migration files and added the email-identifier migration matching the live migration ledger version `20261112124634`; the new migration was applied through the Supabase migration tool.
- README, ROADMAP, PLAN, and this status document are synchronized in the local project package. `.gitignore` and a secrets-free `.env.example` are included.

## 4. In Progress
- The Vercel-linked project is available through the Vercel connector, but the local code changes have not yet been deployed. A real mobile-emulation check found and reproduced the `crypto.randomUUID` login blocker and 320px horizontal overflow; local fixes now pass Playwright mobile contexts.
- Reviewed source/docs are committed locally as `7a3038c` on branch `main` in `/home/user/bluepeak-github-worktree`; push was blocked (`fatal: could not read Username for 'https://github.com': No such device or address`). GitHub connector is unsupported, and this environment has no `gh` CLI/authentication. Remote `main` is unchanged.
- Deploy updated `secure-bluepeak-auth` and `secure-bluepeak-admin` functions, then deploy the Vercel gateway/package so live email identifiers and `/login` match the migrated schema.
- Preparing real-browser acceptance tests for actual customer/admin/owner accounts; these require the account holder to test privately and must not involve sharing credentials or MFA codes in chat.

## 5. Pending Tasks
- Deploy the updated Supabase functions and Vercel gateway/pages, then verify READY/PROMOTED and actual customer/admin flows.
- GitHub commit/push and remote verification; no GitHub connector or authenticated GitHub CLI is available so far.
- Incognito protected-response checks and authenticated admin/customer end-to-end tests after deployment.
- Verify user create/list/reset/revoke and session cap using real accounts; check browser console/network and sign-out behavior.
- Review old public Vercel deployment URLs after the new release is verified.

## 6. Next Steps (in order)
1. Authenticate to GitHub using the repository owner's local GitHub CLI or an enabled GitHub integration; clone/pull `main`, overlay reviewed source and docs, inspect `git status` and diff, then commit and push.
2. Deploy both updated Supabase auth/admin Edge Functions and Vercel gateway code against the applied schema; then confirm the Vercel production alias points to the new READY/PROMOTED release.
3. Confirm READY/PROMOTED and test `/`, `/admin`, `/admin/dashboard`, `/admin/users`, `/app`, and `/app/admin` in private and authenticated browsers.
4. Verify admin MFA and role restrictions, buyer denial, refresh/navigation, create/reset/revoke, logout, and customer scanner behavior.
5. Record production results here; remove old exposed deployment links only after the new production release passes checks.

## 7. Known Bugs / Issues
- **Live admin routing and email-identifier support are unverified/not deployed.** Current live checks show the deployed login generates device IDs with unguarded `crypto.randomUUID`; the live `/login` returns 404; signed-out HTML `/app` redirects to `/`, `/admin/dashboard` and `/admin/users` redirect to `/admin`, and `/app/admin` redirects to `/admin`. Vercel reports production deployment `dpl_HQUCwb5STJ2Sz9ayFQ5V6bcumk8P` READY/PROMOTED on GitHub main commit `bd0c291b00547c774260bce3c29edb824b090324`; it does not contain the local `/login` and email-identifier fixes. This is a source mismatch, not a CDN cache response. Local source now includes those protected routes, a direct `/login` landing path, and username/email support. The schema migration is applied; the admin function shows version 2 active, the auth function still shows version 1, and the Vercel source remains undeployed. Playwright mobile tests found old narrow-screen intrinsic overflow and the missing-`randomUUID` login failure; both are fixed locally.
- The Vercel connector rejected a deployment upload request before creating a deployment; production remained unchanged.
- GitHub push has not occurred because GitHub connector is unsupported and there is no authenticated GitHub CLI in this workspace.
- Live checks and a dummy credential probe do not verify real buyer/admin sessions or a successful login. The newly applied migration is verified by the Supabase migration ledger and aggregate profile checks. Mobile tests used emulated devices, mocked auth, and mocked market data; no physical device was tested. No authenticated post-fix browser testing has been performed.

## 8. Recent Changes
- Added a separate `/admin/dashboard` and `/admin/users` experience with dashboard navigation and user-management UI.
- Admin login now redirects to `/admin/dashboard`; root routing is role-aware; `/login` is a direct customer-login alias that stays visible despite a valid admin session; `/app/admin` is a compatibility redirect. The admin 'Return to user login' link uses `/login` to avoid the root redirect loop.
- Added explicit fail-closed handling for unknown roles, customer redirection away from `/admin`, admin-only routing for admin assets, and correct AAL2 redirects for admin pages.
- Removed the two requested buttons and duplicate customer-interface admin panel; customer sign-out is available in the main terminal top bar and admin sign-out remains inside the portal. Both still use `/api/logout`.
- Added `test-gateway-auth.js` to exercise mocked HTTP handler requests across signed-out, buyer, admin/AAL2, unknown-role, expired-session, logout, login-cookie, and `/login` session scenarios. The test includes static assertions for username/email UI/backend/migration wiring; it does not run a real Supabase function or DB.
- Updated deployment package documentation and included `.gitignore` and a non-secret `.env.example`.

## 9. Technical Information
- Front end: static HTML/CSS/vanilla JavaScript; no React/Next.js framework.
- Hosting/routing: Vercel with a Node.js serverless gateway and a catch-all `vercel.json` route.
- Identity/data authorization: Supabase Auth and Edge Functions (`bluepeak-access`, `secure-bluepeak-auth`, `secure-bluepeak-admin`, `secure-bluepeak-bootstrap`).
- Market feeds: public Binance REST/WebSocket; optional public Blockscout lookups.
- Sessions: Secure, HttpOnly cookies; active-session cap defaults to two; admin requires TOTP AAL2. Supabase Auth owns password hashes; RLS has not been weakened for the routing/identifier changes. The new identifier migration is applied successfully; no rows were modified or rejected.
- The gateway requires `SUPABASE_ANON_KEY`; earlier checks recorded it configured as an encrypted variable for production, preview, and development. This is the Supabase anon/publishable key, not a service-role credential. For local linked development, pull it to ignored `.env.local` with `npx --yes vercel env pull .env.local`. Never commit `.env`, service-role credentials, passwords, or tokens.

## 10. Important Files
- `index.html` — customer terminal interface.
- `pattern-scanner.js` — pattern and V1 analysis rules.
- `scan-watched-assets.js` — watched-asset data adapter.
- `bluepeak-access-ui.js` — scanner interface and customer session status.
- `api/gateway.js` — request routing, server-side session checks, role-aware redirects, and protected asset/API delivery.
- `admin-dashboard.html`, `admin-users.html`, `admin-portal.js` — separate MFA-protected admin experience.
- `vercel.json` — catch-all routing and function file inclusion.
- `supabase/functions/**/index.ts` — Edge Function source; local create/login code now supports exact username-or-email identifiers.
- `supabase/migrations/20261112124634_allow_email_identifiers.sql` — applied schema constraint/index migration; profile preflight found zero conflicts and post-check found 2 profiles, 0 invalid identifiers.
- `LINK-AND-IDENTIFIER-AUDIT.md` — local link/action destination matrix, verification results, and limitations.
- `test-gateway-auth.js` — mocked gateway authorization and session regression suite.
- `test-pattern-scanner.js`, `test-asset-scanner.js`, `test-v1.js` — synthetic scanner checks.
- `README.md`, `ROADMAP.md`, `PLAN.md`, `SECURE-ACCESS-REWRITE.md` — project and security documentation.

## 11. Deployment Status
- Production URL: https://bluepeak-terminal.vercel.app/
- Latest known Vercel production deployment: `dpl_CP5dkNKUeFV42RzC3t5saHbR6xMt`, READY/PROMOTED when queried. It is an earlier package and currently shows the admin-routing bug described above.
- Latest admin route fix exists only in the local deployment package and has not been promoted. Do not claim the admin portal works in production until the new deployment and browser tests pass.

## 12. Last Updated
2026-11-10 (Asia/Karachi). Local username/email and link-audit changes/tests recorded; function/Vercel deployment and real-user/mobile browser verification remain pending.
