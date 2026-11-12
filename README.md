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

The shared design uses high-contrast navy/ivory/gold tokens, local Inter and JetBrains Mono, responsive layouts, visible focus, loading states, accessible confirmation dialogs, toast notifications, and `/` and `Ctrl/Cmd+K` search shortcuts. Dark and Light themes share a synchronized theme controller and persistent `bp-theme` preference (dark by default); switching theme redraws the chart immediately. Canvas palettes resolve CSS tokens to actual color strings and use theme-appropriate backgrounds, axes, grid, annotations, and overlays. Candles, volume bars, the latest-price line, and market price-change indicators (including ticker/watchlist moves) use the expressly requested trading colors: bullish `#089981`, bearish `#F23645`. This is a narrow chart-only exception; unrelated positive/active UI states remain within the gold/navy/ivory design language. The chart includes a toolbar-enabled Zig Zag overlay with Tight/Standard/Wide sensitivity, confirmed swing pivots, HH/HL/LH/LL labels, and a developing endpoint.

The customer/admin login forms retain their existing server-side auth flows. Admin actions require an authenticated administrator, AAL2 claim, approved admin profile, and active session; those checks are performed in both gateway and Edge Function.

- **Disable/Enable:** blocks/unblocks the customer Auth identity, changes profile access status, revokes old app sessions, and preserves the existing profile/data and password.
- **Delete User:** one confirmed action immediately deletes the Auth identity and cascades profile/session data; historical audit information is retained with snapshots and nullable references. The row is removed from the table and the username/email are released.
- **Stale identity cleanup:** matching legacy soft-deleted buyer profiles are removed before account creation is retried. The one-time migration also cleans lingering soft-deleted buyer identities; it does not touch active accounts.
- **Protections:** the owner identity, the caller's own account, and the last active administrator remain protected server-side.

## Latest implementation / production state

- Added `20261112160047_purge_legacy_soft_deleted_buyers.sql`; Supabase production migration history records it as applied. A preflight query found zero remaining legacy soft-deleted buyers, and post-migration counts remain zero.
- `secure-bluepeak-admin` is ACTIVE, version 8, with the restricted `list-audit` operation and existing direct-delete protections.
- The previously requested production test identity `saaaaaddKhan112` / `saaaaaddkhan112@users.bluepeak.invalid` remains absent: zero Auth users, profiles, and linked active sessions. Audit history remains.
- Repository `main` is at commit `17c7cb45a941cc67e41e23bac6a6fa4d53fb96ec`; all 16 application/backend source paths checked against it match. The four release-status documents were refreshed locally after deployment verification and were not part of that push.
- Vercel deployment `dpl_38r8i8JdDAEcURSqPGgKGsmCM5CT` is READY/PROMOTED for that commit and has the `bluepeak-terminal.vercel.app` alias. Production CSS contains both dark and light token sets; the theme helper and sign-in/admin endpoints return HTTP 200.
- Unauthenticated HTML requests to `/admin/users` and `/admin/dashboard` redirect to `/admin`, and `/app` redirects to `/`. The protected routes return 401 JSON when requested as non-HTML. Authenticated customer/admin visual verification remains unperformed.

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

Current local worktree: all six suites (`test-gateway-auth.js`, `test-admin-user-management.js`, `test-pattern-scanner.js`, `test-asset-scanner.js`, `test-theme-contrast.js`, `test-v1.js`), JavaScript syntax checks, and `git diff --check` pass. The contrast suite checks text contrast, theme controls, universal chart colors, Zig Zag controls, resolved canvas colors (no unresolved `var(--...)` fill/stroke styles), and rejects unapproved green-family literals. These are local source-contract/mock checks; no live browser interaction or authenticated AAL2 acceptance is claimed.

## Release and archive

The chart/theme/Zig Zag changes in this worktree are local, not committed, uploaded, or deployed. Rebuilt `/home/user/BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip` from the full safe project tree (49 files); ZIP integrity and required-file checks passed, and all six suites passed again from an extracted copy. `.env`, `.vercel`, and `node_modules` are excluded. This assistant does not push. The previously verified production build is older and does not include this local chart revision. Authenticated customer/admin visuals and protected workflows require an authorized session and remain unverified.

Never place Supabase service-role credentials, user passwords, TOTP codes, environment files, or deployment credentials in source or the archive. Keep RLS enabled and never grant the browser direct access to profiles, sessions, or audit tables.
