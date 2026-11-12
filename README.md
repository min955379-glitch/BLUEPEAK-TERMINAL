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

The shared design uses high-contrast navy/ivory/gold tokens, local Inter and JetBrains Mono, responsive layouts, visible focus, loading states, accessible confirmation dialogs, toast notifications, and `/` and `Ctrl/Cmd+K` search shortcuts. The current worktree now adds synchronized Dark and Light themes across customer terminal and admin pages, persistent `bp-theme` preference (dark by default), theme-aware chart rendering, readable form controls/dropdowns, and a theme switch on sign-in and admin views. Positive/active states use gold, navy, or ivory; green-family colors are prohibited in shipped UI sources. These latest contrast/theme updates are local and have not been uploaded or deployed.

The customer/admin login forms retain their existing server-side auth flows. Admin actions require an authenticated administrator, AAL2 claim, approved admin profile, and active session; those checks are performed in both gateway and Edge Function.

- **Disable/Enable:** blocks/unblocks the customer Auth identity, changes profile access status, revokes old app sessions, and preserves the existing profile/data and password.
- **Delete User:** one confirmed action immediately deletes the Auth identity and cascades profile/session data; historical audit information is retained with snapshots and nullable references. The row is removed from the table and the username/email are released.
- **Stale identity cleanup:** matching legacy soft-deleted buyer profiles are removed before account creation is retried. The one-time migration also cleans lingering soft-deleted buyer identities; it does not touch active accounts.
- **Protections:** the owner identity, the caller's own account, and the last active administrator remain protected server-side.

## Latest implementation / production state

- Added `20261112160047_purge_legacy_soft_deleted_buyers.sql`; Supabase production migration history records it as applied. A preflight query found zero remaining legacy soft-deleted buyers, and post-migration counts remain zero.
- `secure-bluepeak-admin` is ACTIVE, version 8, with the restricted `list-audit` operation and existing direct-delete protections.
- The previously requested production test identity `saaaaaddKhan112` / `saaaaaddkhan112@users.bluepeak.invalid` remains absent: zero Auth users, profiles, and linked active sessions. Audit history remains.
- The repository owner uploaded the prior source revision to GitHub. Vercel production deployment `dpl_AbXrMpuxXipHTCfSF8GPtf118EeL` is READY/PROMOTED for commit `d2fdc3b27b67b7a4710274b324bc44bf2dde27c1`. Unauthenticated production smoke checks passed for sign-in pages, public assets, protected-route redirects, and a 401 response from `/api/admin`.
- The dual-theme/contrast revision described above is newer local work and is not included in that GitHub commit or Vercel deployment. Signed-in customer/admin production visual checks have not been performed.

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
node test-theme-contrast.js
```

Current worktree: all six suites, JavaScript syntax checks, JSON validation, and `git diff --check` pass. The contrast test checks required token pairs, theme controls, dropdown/placeholder styling, and scans shipped CSS/HTML/JS for green-family colors. These local source-contract/mock checks do not create users in production and do not substitute for authenticated AAL2 acceptance.

## Release and archive

The refreshed, verified archive `BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip` includes the current local UI revision and excludes `.env`, `.vercel`, and `node_modules`. The earlier source revision is on GitHub and Vercel is READY/PROMOTED for its commit; the theme/contrast changes in this archive are not uploaded or deployed. This assistant does not push. The Supabase cleanup migration is applied and `secure-bluepeak-admin` version 8 is active, but the stricter email-validation change in the current Edge Function source still needs deployment.

Never place Supabase service-role credentials, user passwords, TOTP codes, environment files, or deployment credentials in source or the archive. Keep RLS enabled and never grant the browser direct access to profiles, sessions, or audit tables.
