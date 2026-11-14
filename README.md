# BluePeak Terminal

BluePeak is a read-only crypto-market terminal with a 45-asset watchlist, charts, public market monitoring, historical pattern detection, and a V1 trend-continuation scanner. It does not place trades, handle funds, predict prices, or give trading advice.

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
The follow-up hotfix enforces closed/hidden select popovers globally and uses one shared floating menu/backdrop for all custom selects; click, outside click (guarded against the mobile ghost-click window), Escape, or explicit option/close action controls dismissal; scroll and resize no longer close the menu. Mobile menus render in a body-level bottom-sheet portal, and wrapping labels are detached from the trigger. Choosing an item updates the native select and dispatches `change`. Market overview now renders from a cached or single bulk 24-hour ticker snapshot first (breadth uses the 24h midpoint until candle history is available), refines in the background with at most four 250-candle requests, and stores 180-second session/local cache data. Binance REST requests rotate over the five official public mirrors with 3.5-second aborts. Order-book rows/depth and spread/mid-price surfaces use neutral/green/red colors in both themes, with no gold depth fill.

The six regression suites pass after this fix. Tests include a simulated nine-select open/close-manager exercise, strict hidden-state CSS, ticker-only 18-asset overview, mirror retry/timeout behavior, fresh/stale cache behavior, bounded background refinement, and order-book zero-yellow source inspection. Main inline app JS, modified JS files, and `git diff --check` also pass. These are automated/source tests, not an authenticated visual reproduction. Authentication, login, admin authorization, and Supabase security code were not changed by this hotfix. The fix remains local pending your push; no deployment was made by the assistant.


## Mobile dropdown and scanner-speed follow-up (local worktree)
The custom-select manager now keeps menus open across mobile viewport scroll/resize, moves triggers outside wrapping labels, and ignores immediate outside/backdrop clicks for 350 ms after opening. Mobile selects use a body-level, safe-area-aware bottom-sheet with a title and close action. Pattern/uptrend scans now start with a five-minute session snapshot when available, stream partial results in six-asset updates, prioritize BTC/ETH/SOL/BNB/XRP/DOGE, and fetch 320 completed 1h plus 60 completed 1d candles with up to nine asset workers; ticker quote volumes are shared from the bulk 24h snapshot. The explicitly run Historical Backtester can request up to 1,000 candles for a selected deep date range; ordinary scanner runs use the smaller window. A shorter scan window necessarily gives a shorter descriptive historical sample than a deep backtest and does not change the rule definitions.

New regression coverage checks the mobile dropdown guards/portal contract and progressive scanner/cache settings, plus scanner progress metadata and 320/60/9 defaults. Automated source tests do not replace real iOS Safari/Android Chrome acceptance. The current local patch has not been pushed or deployed by the assistant.

## Latest update — 45-pair watchlist and Market Breadth & Sentiment

The terminal now tracks exactly these 45 Binance USDT spot pairs, in this order, across the watchlist sidebar, ticker strip, compare/alert/paper/large-trade selectors, coin-detail panel, market monitor, Pattern Scanner/Uptrend Finder, all six strategy scanners and the historical backtester: BTC, ETH, XRP, SOL, TRX, BCH, ADA, DOT, LTC, AVAX, LINK, XLM, HBAR, SUI, TON, NEAR, ETC, FIL, ATOM, VET, ALGO, APT, ARB, OP, STX, TIA, SEI, JASMY, GRT, RENDER, PYTH, IOTA, ZIL, CKB, XEC, TAO, BAT, LPT, POL, THETA, TWT, ZRO, MASK, NEO, EGLD. Every previous 18-asset count and label now reads 45.
**Scope guardrails honoured:** `bluepeak-ui.js` (all desktop/mobile dropdown logic), `api/gateway.js`, `admin-dashboard.html`, `admin-users.html`, `admin-portal.js`, `supabase/functions/*`, the chart/Zig Zag/Reference-Level rendering, and the order-book colour rules were not modified.

**Watchlist (45 USDT pairs, exact order):** BTC, ETH, XRP, SOL, TRX, BCH, ADA, DOT, LTC, AVAX, LINK, XLM, HBAR, SUI, TON, NEAR, ETC, FIL, ATOM, VET, ALGO, APT, ARB, OP, STX, TIA, SEI, JASMY, GRT, RENDER, PYTH, IOTA, ZIL, CKB, XEC, TAO, BAT, LPT, POL, THETA, TWT, ZRO, MASK, NEO, EGLD.

Removed from every watchlist, metadata map, selector, WebSocket subscription, scanner and test assertion: `BNBUSDT`, `DOGEUSDT`, `SHIBUSDT`, `PEPEUSDT`, `PAXGUSDT`. The separate tracked-wallet Ethereum explorer view still lists native ETH and PAXG ERC-20 transfers because that is an independent Blockscout feature, not a market subscription.

**Market Breadth & Sentiment Analysis:** new dashboard block (`#market-breadth`) fed only by real public data — the single bulk `GET /api/v3/ticker/24hr` snapshot plus live `24hrTicker` WebSocket frames. `BPAssetScanner.marketSentiment(rows)` classifies each analysed market: Bullish when `change24h > 0.50` and range position `>= 0.45` (or `change24h >= 1.25`), Bearish when `change24h < -0.50` and range position `<= 0.55` (or `change24h <= -1.25`), Neutral otherwise. Percentages are computed from the analysed count (`bullishPct`, `bearishPct`, and `neutralPct = 100 - bullish - bearish`), never randomised or hardcoded. The block renders a 12px three-segment bar (green/grey/red, `width .35s ease`), an 80x80 SVG donut with the dominant label and percentage, three legend metrics with asset counts, and a footer showing `Assets Analyzed: n / 45`, the data-source string, and a live `HH:MM:SS` timestamp. Updates are throttled through the existing market-overview render scheduler (250ms) so socket ticks cannot thrash the DOM; the approved-user area mirrors the same figures from the `bp-breadth-update` event.

**Verification:** all six Node suites pass (`test-gateway-auth`, `test-admin-user-management`, `test-pattern-scanner`, `test-asset-scanner`, `test-theme-contrast`, `test-v1`). `test-asset-scanner.js` asserts the exact 45-symbol list in both `index.html` and `bluepeak-access-ui.js`, the absence of the five removed pairs, and byte-exact bullish/bearish/neutral counts and percentages from a deterministic 45-market fixture (20/15/10 -> 44.4%/33.3%/22.3%), including the `+/-1.25%` guard clauses and exclusion of a market with no usable 24h change. `test-theme-contrast.js` asserts the breadth markup, CSS contract, and runs the real `renderMarketBreadth()` in a VM against a fake DOM to check segment widths, donut arc lengths, counts, timestamp format and the update event. JS syntax checks pass for every modified file and both inline `index.html` scripts.

**Not verified:** authenticated browser rendering, real-device iOS/Android interaction, live 45-market timing, and the sub-300ms first-paint target against real Binance latency. No deployment or push beyond this branch was performed, and no production data was touched.
