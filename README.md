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
- The owner pushed the chart/theme/Zig Zag update to GitHub `main`, commit `0e7e8ddf39bd6dc431395bc97fe90a4e70e8c6dc`.
- Vercel deployment `dpl_3UwNnDVxqTfimytRRF1TLZv2psFb` is READY/PROMOTED for that commit, with the `bluepeak-terminal.vercel.app` production alias.
- Production smoke checks: `/login` returns 200; shared design CSS returns 200 with `text/css`, shared UI helper returns 200 with `application/javascript`, and both assets match the local worktree byte-for-byte. An unauthenticated `/app` request returns 401. These checks do not verify the authenticated chart UI or admin workflows.

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

The owner has pushed the application update; this assistant did not push or deploy. The current production deployment above is READY/PROMOTED. The release archive at `/home/user/BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip` contains the complete safe 49-file project tree; integrity/required-file checks and all six suites from the extracted archive pass. `.env`, `.vercel`, and `node_modules` are excluded. Authenticated customer/admin visuals and protected workflows still require authorized acceptance.

Never place Supabase service-role credentials, user passwords, TOTP codes, environment files, or deployment credentials in source or the archive. Keep RLS enabled and never grant the browser direct access to profiles, sessions, or audit tables.

## Six-stage market terminal expansion (local worktree)

Implemented the six-stage market-analysis expansion in this worktree: an 18-pair Binance spot watchlist and market overview; per-coin detail panels with quote, market-cap (when public data is available), timeframe trend/RSI, reference levels and setup links; interactive chart indicators and levels; historical pattern outcomes and continuation context; six independently selectable rule-based scanners; a deterministic fee/slippage-aware backtester; and signal cards with a browser-local, deduplicated outcome ledger. Custom accessible dropdowns, responsive scanner/backtester layouts, order-book depth colors, and chart links for pattern occurrences/trades are wired to the relevant controls. Scanner-specific approximations and data limitations are identified in the UI; none of this is financial advice, a prediction, or a guaranteed signal.

Verification for this expansion: all six regression suites pass (`test-gateway-auth.js`, `test-admin-user-management.js`, `test-pattern-scanner.js`, `test-asset-scanner.js`, `test-theme-contrast.js`, `test-v1.js`); changed JavaScript and the main inline application script pass `node --check`; `git diff --check` passes. The browser-local signal ledger uses `bp_signal_history_v1`. These results are automated/source checks, not authenticated browser/AAL2 acceptance. This worktree has not been pushed or deployed by the assistant; the production deployment documented above predates this expansion.

## Production UI reliability hotfix — local, not yet pushed
The follow-up hotfix enforces closed/hidden select popovers globally and uses one shared floating menu/backdrop for all custom selects; click, outside click, Escape, scrolling and resize close it, and choosing an item updates the native select and dispatches `change`. Market overview now renders from a cached or single bulk 24-hour ticker snapshot first (breadth uses the 24h midpoint until candle history is available), refines in the background with at most four 250-candle requests, and stores 180-second session/local cache data. Binance REST requests rotate over the five official public mirrors with 3.5-second aborts. Order-book rows/depth and spread/mid-price surfaces use neutral/green/red colors in both themes, with no gold depth fill.

The six regression suites pass after this fix. Tests include a simulated nine-select open/close-manager exercise, strict hidden-state CSS, ticker-only 18-asset overview, mirror retry/timeout behavior, fresh/stale cache behavior, bounded background refinement, and order-book zero-yellow source inspection. Main inline app JS, modified JS files, and `git diff --check` also pass. These are automated/source tests, not an authenticated visual reproduction. Authentication, login, admin authorization, and Supabase security code were not changed by this hotfix. The fix remains local pending your push; no deployment was made by the assistant.
