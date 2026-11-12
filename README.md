# BluePeak Terminal

BluePeak is a read-only crypto-market terminal with an 18-asset watchlist, charts, public market monitoring, historical pattern detection, and a V1 trend-continuation scanner. It does not place trades, handle funds, predict prices, or give trading advice.

## Architecture

- Native static HTML, CSS, and vanilla JavaScript; no React/Next.js or external CSS framework.
- Vercel Node gateway at `api/gateway.js` serves the public sign-in assets and enforces server-verified sessions and roles for protected pages and APIs.
- Supabase Auth, MFA/AAL2, PostgreSQL with RLS, and Edge Functions under `supabase/functions/` provide identity and administration.
- Local Inter and JetBrains Mono variable fonts are served from `/fonts/`.
- `bluepeak-design-system.css` contains the deep-navy, warm-ivory, muted-gold tokens and shared components; `bluepeak-ui.js` provides the stacked toasts, confirmation dialogs, keyboard support, and password-visibility toggles.

## Routes

- `/` and `/login` — server-rendered customer sign-in, role-aware redirect when already signed in.
- `/app` — protected customer terminal (`index.html`), watchlist and approved-user scanner.
- `/admin` — administrator sign-in with password and authenticator verification; AAL2 is required before admin tools open.
- `/admin/dashboard` — protected administrator summary.
- `/admin/users` — protected account management, search and filters, add-user workflow, audit feed, and confirmed actions.

The customer terminal excludes the legacy Admin panel and device-only sign-out controls. Sign out is handled through the shared server logout route. Static design assets and fonts are public; application pages, data APIs, and administrative actions remain protected by the gateway.

## Institutional UI and user management

The shared design uses the prompt's navy/ivory/gold token architecture, local Inter and JetBrains Mono, responsive layouts, visible gold focus, shimmering loading states, accessible confirmation dialogs, toast notifications, and `/` and `Ctrl/Cmd+K` search shortcuts. Positive/active states use gold or ivory; named green-family colors and green-hued UI color literals are prohibited in the named application sources.

The customer/admin login forms retain their existing server-side auth flows. Admin actions require an authenticated administrator, AAL2 claim, approved admin profile, and active session; those checks are performed in both gateway and Edge Function.

- **Disable/Enable:** blocks/unblocks the customer Auth identity, changes profile access status, revokes old app sessions, and preserves the existing profile/data and password.
- **Delete User:** one confirmed action immediately deletes the Auth identity and cascades profile/session data; historical audit information is retained with snapshots and nullable references. The row is removed from the table and the username/email are released.
- **Stale identity cleanup:** matching legacy soft-deleted buyer profiles are removed before account creation is retried. The one-time migration also cleans lingering soft-deleted buyer identities; it does not touch active accounts.
- **Protections:** the owner identity, the caller's own account, and the last active administrator remain protected server-side.

## Latest implementation / production state

- Added `20261112160047_purge_legacy_soft_deleted_buyers.sql`; Supabase production migration history records it as applied. A preflight query found zero remaining legacy soft-deleted buyers, and post-migration counts remain zero.
- `secure-bluepeak-admin` is ACTIVE, version 8, with the restricted `list-audit` operation and existing direct-delete protections.
- The previously requested production test identity `saaaaaddKhan112` / `saaaaaddkhan112@users.bluepeak.invalid` remains absent: zero Auth users, profiles, and linked active sessions. Audit history remains.
- Frontend and gateway files in this worktree are not yet uploaded by the repository owner. Vercel's latest production deployment is READY/PROMOTED for the prior GitHub commit `a33905cb60c18e78128bcf829e7d191bf05e4c93`; it does not include this worktree's institutional UI changes. No GitHub push was made. Authenticated production UI acceptance requires an AAL2 admin session and remains unverified.

## Local development and tests

Use Node.js 20+. `python -m http.server` bypasses the gateway and is not a valid auth test. For Vercel development, link the existing project locally and run:

```sh
npx --yes vercel login
npx --yes vercel link
npx --yes vercel dev
```

Run the regression suites from the repository root:

```sh
node test-gateway-auth.js
node test-admin-user-management.js
node test-pattern-scanner.js
node test-asset-scanner.js
node test-v1.js
```

Current worktree: all five suites, JavaScript syntax checks, JSON validation, and `git diff --check` pass. These local source-contract/mock tests do not create users in production and do not substitute for authenticated AAL2 acceptance.

## Release and archive

The archive is `BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip`. It excludes `.env`, `.vercel`, and `node_modules`; verify its contents and tests before upload. The repository owner manually uploads the files to GitHub; this assistant does not push. Vercel will deploy the frontend/gateway after that upload. Supabase migration and Edge Function deployment are independent and are already complete for this update.

Never place Supabase service-role credentials, user passwords, TOTP codes, environment files, or deployment credentials in source or the archive. Keep RLS enabled and never grant the browser direct access to profiles, sessions, or audit tables.
