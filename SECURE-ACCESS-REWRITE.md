# BluePeak server-enforced access rewrite

> This document describes the secure-access baseline. For current deployment state and the new user-management rollout, see `PROJECT_STATUS.md` and `README.md`. The current user-management release uses direct confirmed deletion (not a lingering soft-delete/purge workflow); consult PROJECT_STATUS.md for live deployment state.

## Architecture

- `vercel.json` routes **every request** through `api/gateway.js` before file serving. The gateway has a small allowlist of protected dashboard assets; it serves none of them until Supabase verifies the HttpOnly session cookie and the existing access service confirms the account is approved and that its session has not been revoked.
- Signed-out `GET /` returns a small self-contained customer login/landing document. It contains username-or-email/password, no registration action, brief feature bullets, 1,000 PKR and WhatsApp links. `/login` serves that buyer login page directly without applying the root path’s role-aware session redirect. The login document does not contain the dashboard HTML, scanner source, watchlist/chart results, or app API data.
- `POST /api/auth` calls the Supabase Edge Function and places access/refresh tokens only in `Secure; HttpOnly; SameSite=Lax` cookies. Tokens are not returned in JSON or put in browser storage. `POST /api/protected` validates the session server-side before proxying app/admin actions. `POST /api/logout` revokes the current server session and clears the cookies. Customers use the terminal top-bar sign-out control; admins use the dedicated portal sign-out control.
- Supabase functions: `bluepeak-access` (active-session status and revocation), `secure-bluepeak-auth` (buyer username-or-email login, session cap, separate admin MFA), `secure-bluepeak-admin` (create/list/reset/disable/enable and directly delete customer users with AAL2 authorization), and `secure-bluepeak-bootstrap` (first-admin setup restricted to the verified designated owner). Their service-role secret stays in Supabase, never in browser code or the Vercel bundle.
- The current profile roles are `buyer` and `admin`; the designated owner is provisioned as the first `admin` and receives the same current admin-portal permissions. The designated owner is identified by the bootstrap profile username `owner`; owner name/email remain protected. Disable/enable/delete actions are limited to buyer profiles, and server code blocks self, owner, and administrator targets. Authorization uses the server-verified profile, never a role supplied by the browser. Unknown roles fail closed.
- Supabase Auth handles password hashing. The app creates accounts through the admin-only server function and does not store/recover plaintext passwords. Reset generates a one-time random password and revokes the user's active app sessions.

## Important rollout status

The four Supabase Edge Functions were previously deployed; unauthenticated signup is disabled in Supabase Auth and TOTP verification is enabled. The six `bp_*` public tables have RLS enabled; no database policies were modified. The updated Vercel package is prepared locally, but **the production site is not yet changed**. The last recorded signed-out HTTP checks found `/admin/dashboard`, `/admin/users`, and `/app/admin` return 404 on the current deployment. Old public deployments and copies already fetched by visitors cannot be recalled by a new release.

## Deploy the package

From PowerShell, after unzipping `bluepeak-deploy-package.zip` and changing to that directory, use the same token-safe flow previously used for this Vercel project:

```powershell
$env:VERCEL_TOKEN = Read-Host "Vercel token"
npx --yes vercel deploy . --prod --yes --token $env:VERCEL_TOKEN
Remove-Item Env:VERCEL_TOKEN
```

Do not paste or send the token into chat. Wait for Vercel to report READY and the production alias.

## Required post-deploy checks

In a private/incognito browser, with no BluePeak cookies:

1. Visit `/`; confirm it shows only the login landing, features, price, and contact options.
2. Directly request `/app`, `/index.html`, `/pattern-scanner.js`, `/scan-watched-assets.js`, `/bluepeak-access-ui.js`, `/favicon.svg`, `/fonts/inter-latin-variable.woff2`, and `/api/protected` (POST `{ "action":"status" }`). Expect redirect to `/` or 401/404, never the dashboard/source/data.
3. Confirm wrong passwords do not set auth cookies; “Forgot password?” appears after the second failed attempt.
4. Verify both WhatsApp buttons open `https://wa.me/923485581969` with the new-customer or existing-paid-user reset text respectively.
5. After owner invitation acceptance, initialize the first owner at `/admin`, enroll TOTP, sign in with password plus a current code, and verify user create/list/reset/revoke. The owner account uses the current `admin` role; no owner credentials or MFA codes should be shared in chat. Supply one test buyer account for the paid-user end-to-end check.
6. Sign in as that buyer and confirm the complete scanner loads while login, sales pitch, price, and WhatsApp landing content are absent. Revoke the account/session and confirm subsequent app and asset requests are denied.

The local gateway regression suite and synthetic scanner tests pass. The last recorded signed-out HTTP checks confirm the current login shells and customer-route redirects, but no authenticated post-fix browser check has been performed. Incognito checks on the updated deployment, successful owner/admin and buyer sessions, a paid-account scan, and live WhatsApp-click verification remain outstanding. Test real accounts privately; never send passwords or MFA codes in chat.

## Admin routing correction

Root cause found in the deployed gateway: successful `/admin` authentication redirected to `/app`, and any authenticated visit to `/` was also redirected to `/app`, regardless of role. The previous package did not define `/app/admin`; requests there correctly fell through to a JSON 404. The embedded admin control was part of the customer scanner page rather than a separate portal.

The corrected local routes are:
- `/admin` — shows admin sign-in while signed out; redirects an authenticated buyer to `/app`; sends an admin with verified AAL2 to `/admin/dashboard`; an admin without AAL2 must re-authenticate.
- `/admin/dashboard` — protected admin dashboard, AAL2 required.
- `/admin/users` — protected user-management page, AAL2 required.
- `/app` — protected customer scanner; admins are redirected to `/admin/dashboard` (or `/admin` if MFA is incomplete).
- `/app/admin` — compatibility redirect to `/admin/users` for an authenticated AAL2 admin, `/app` for a buyer, or `/admin` when signed out.

Every protected admin page and admin API request checks the active server session, profile role, and AAL2 claim. Trailing slashes are normalized, unknown roles fail closed, and authenticated buyers cannot use admin pages or APIs. The approved-customer scanner no longer shows the `Admin panel` or `Sign out this device` controls and no longer contains a duplicate admin UI. Customer logout is in the terminal top bar; the dedicated portal retains its own logout control; both use the same `/api/logout` session revocation endpoint.

This routing correction is in the updated Vercel package but still requires a production deployment. `node test-gateway-auth.js` covers anonymous access, buyer/admin redirects and denials, AAL2, unknown roles, silent token refresh, expired sessions, logout cookie clearing, and auth token handling. Production browser verification remains pending.


## Current local username/email change (not released)

The admin create-user page and buyer login now accept either a username or email, preserving the exact value in `bp_profiles.username` and displaying it as stored. For an email identifier the auth account/profile email use the supplied address; ordinary usernames keep the existing internal `@users.bluepeak.invalid` auth address. The matching schema check/index is in `supabase/migrations/20261112124634_allow_email_identifiers.sql` and was applied as Supabase migration version `20261112124634`. Preflight found zero case-insensitive duplicate profile identifiers; post-apply check found two profiles and zero invalid identifiers. The updated Edge Functions and gateway still need deployment. Local mocked tests pass, but no Deno typecheck, real-account login, or authenticated production browser test has occurred.

The admin landing return link now targets `/login` rather than `/`. This direct path is covered by mocked signed-out, buyer, and admin session routing tests and does not weaken protected-route checks. See `LINK-AND-IDENTIFIER-AUDIT.md` for the link/action matrix and test limits.
