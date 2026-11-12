# BluePeak Terminal — Project Status

## 1. Project Overview
BluePeak is a read-only crypto market terminal with an 18-asset public-data watchlist, charts, market monitor, historical pattern detection, and V1 trend-continuation analysis. It does not execute trades, handle funds, predict prices, or provide trading advice. Customer access is provisioned by an administrator; public sign-up is not offered.

## 2. Current Development Status
The local deployment package contains the server-side access gateway, separate customer and administrator routes, and dedicated admin dashboard/user pages. The latest routing correction and customer-interface button removal are implemented locally; the new gateway regression suite and existing scanner/syntax tests pass. **The live Vercel production deployment has not received these changes.** GitHub source/documentation synchronization is also still local and has not been pushed. The designated owner is represented by the existing `admin` role; there are no distinct owner-only operations in the current app.

## 3. Completed Tasks
- Market terminal and 18-asset scanner, including historical pattern detection, uptrend criteria, and V1 trend continuation.
- Synthetic scanner/adapter/V1 tests pass.
- Supabase Edge Functions for username/password login, approved access/session tracking, owner bootstrap, TOTP admin auth, user operations, password reset, and revocation are deployed. Negative/unauthorized smoke checks returned expected responses.
- Server gateway and Secure/HttpOnly session cookies are implemented in the local package.
- Local separate admin dashboard and users page check administrator role and AAL2 through the gateway and admin API.
- Local gateway authorization regression tests pass for signed-out route guards, customer redirects/denials, admin MFA/AAL2 route guards, unknown-role fail-closed behavior, silent access-token refresh, expired/revoked sessions, logout cookie clearing, token-cookie handling, and admin API authorization.
- Removed the `Admin panel` and `Sign out this device` controls and their duplicate customer-interface admin handler from `bluepeak-access-ui.js`; customer logout is available in the terminal's global top bar, and the dedicated Admin Portal keeps its navigation/logout controls. Both use `/api/logout`.
- Supabase Auth currently has public signup disabled, TOTP enabled, and email/password authentication enabled. All six `bp_*` public tables have RLS enabled; no table policies were returned by the catalog check. No database policy was changed.
- README, ROADMAP, PLAN, and this status document are synchronized in the local project package. `.gitignore` and a secrets-free `.env.example` are included.

## 4. In Progress
- Production deployment is blocked: the Vercel CLI is currently logged out, and the local routing/UI changes are not yet on the live site. Authenticate the CLI locally or use an authorized deployment route.
- Synchronizing the latest project source and documentation to GitHub `main`.
- Preparing real-browser acceptance tests for actual customer/admin/owner accounts; these require the account holder to test privately and must not involve sharing credentials or MFA codes in chat.

## 5. Pending Tasks
- Production deployment of the latest `api/gateway.js`, `bluepeak-access-ui.js`, `test-gateway-auth.js`, documentation, and existing admin portal package to Vercel.
- GitHub commit/push and remote verification. GitHub connector is unsupported here; no authenticated GitHub CLI/local credential is available in this workspace.
- Incognito protected-response checks and authenticated admin/customer end-to-end tests after deployment.
- Verify user create/list/reset/revoke and session cap using real accounts; check browser console/network and sign-out behavior.
- Review old public Vercel deployment URLs after the new release is verified.

## 6. Next Steps (in order)
1. Authenticate to GitHub using the repository owner's local GitHub CLI or an enabled GitHub integration; clone/pull `main`, overlay reviewed source and docs, inspect `git status` and diff, then commit and push.
2. Deploy the updated package to Vercel production (`npx --yes vercel deploy . --prod --yes`) using the existing project link.
3. Confirm READY/PROMOTED and test `/`, `/admin`, `/admin/dashboard`, `/admin/users`, `/app`, and `/app/admin` in private and authenticated browsers.
4. Verify admin MFA and role restrictions, buyer denial, refresh/navigation, create/reset/revoke, logout, and customer scanner behavior.
5. Record observed production results here; remove old exposed deployment links only after the new production release passes checks.

## 7. Known Bugs / Issues
- **Live admin routing is currently incomplete.** HTTP checks on 2026-11-12 found live `/admin/dashboard`, `/admin/users`, and `/app/admin` return 404. The updated local gateway routes and protects these pages, including redirecting an authenticated customer away from `/admin`, but the correction is not deployed.
- The Vercel connector rejected a deployment upload request before creating a deployment; production remained unchanged.
- GitHub push has not occurred because GitHub connector is unsupported and there is no authenticated GitHub CLI in this workspace.
- Live HTTP checks were performed while signed out on 2026-11-12; this confirmed the production login shells and customer redirects, but production still returns 404 for `/admin/dashboard`, `/admin/users`, and `/app/admin` because it has not been redeployed. No authenticated post-fix browser testing has been performed.

## 8. Recent Changes
- Added a separate `/admin/dashboard` and `/admin/users` experience with dashboard navigation and user-management UI.
- Admin login now redirects to `/admin/dashboard`; root routing is role-aware; `/app/admin` is a compatibility redirect.
- Added explicit fail-closed handling for unknown roles, customer redirection away from `/admin`, admin-only routing for admin assets, and correct AAL2 redirects for admin pages.
- Removed the two requested buttons and duplicate customer-interface admin panel; customer sign-out is available in the main terminal top bar and admin sign-out remains inside the portal. Both still use `/api/logout`.
- Added `test-gateway-auth.js` to exercise mocked HTTP handler requests across anonymous, buyer, admin/AAL2, unknown-role, expired-session, logout, and login-cookie scenarios.
- Updated deployment package documentation and included `.gitignore` and a non-secret `.env.example`.

## 9. Technical Information
- Front end: static HTML/CSS/vanilla JavaScript; no React/Next.js framework.
- Hosting/routing: Vercel with a Node.js serverless gateway and a catch-all `vercel.json` route.
- Identity/data authorization: Supabase Auth and Edge Functions (`bluepeak-access`, `secure-bluepeak-auth`, `secure-bluepeak-admin`, `secure-bluepeak-bootstrap`).
- Market feeds: public Binance REST/WebSocket; optional public Blockscout lookups.
- Sessions: Secure, HttpOnly cookies; active-session cap defaults to two; admin requires TOTP AAL2. Supabase Auth owns password hashes; RLS has not been weakened for this routing fix.
- The gateway requires `SUPABASE_ANON_KEY`; Vercel has it configured as an encrypted variable for production, preview, and development. This is the Supabase anon/publishable key, not a service-role credential. For local linked development, pull it to ignored `.env.local` with `npx --yes vercel env pull .env.local`. Never commit `.env`, service-role credentials, passwords, or tokens.

## 10. Important Files
- `index.html` — customer terminal interface.
- `pattern-scanner.js` — pattern and V1 analysis rules.
- `scan-watched-assets.js` — watched-asset data adapter.
- `bluepeak-access-ui.js` — scanner interface and customer session status.
- `api/gateway.js` — request routing, server-side session checks, role-aware redirects, and protected asset/API delivery.
- `admin-dashboard.html`, `admin-users.html`, `admin-portal.js` — separate MFA-protected admin experience.
- `vercel.json` — catch-all routing and function file inclusion.
- `supabase/functions/**/index.ts` — Edge Function source.
- `test-gateway-auth.js` — mocked gateway authorization and session regression suite.
- `test-pattern-scanner.js`, `test-asset-scanner.js`, `test-v1.js` — synthetic scanner checks.
- `README.md`, `ROADMAP.md`, `PLAN.md`, `SECURE-ACCESS-REWRITE.md` — project and security documentation.

## 11. Deployment Status
- Production URL: https://bluepeak-terminal.vercel.app/
- Latest known Vercel production deployment: `dpl_CP5dkNKUeFV42RzC3t5saHbR6xMt`, READY/PROMOTED when queried. It is an earlier package and currently shows the admin-routing bug described above.
- Latest admin route fix exists only in the local deployment package and has not been promoted. Do not claim the admin portal works in production until the new deployment and browser tests pass.

## 12. Last Updated
2026-11-12 (Asia/Karachi). Exact clock time is not available in this workspace.
