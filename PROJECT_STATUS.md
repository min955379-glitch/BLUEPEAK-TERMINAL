# BluePeak Terminal — Project Status

## Scope and constraints
Preserve the native HTML/CSS/vanilla-JS terminal, Node gateway, Supabase Auth/MFA/AAL2, PostgreSQL RLS, Edge Functions, and existing administrator protections. Never expose credentials, push to GitHub, deploy without authorization, or use real customer/owner accounts for destructive tests.

## Implemented and pushed
- Shared institutional Dark/Light styles and synchronized persistent theme controls across terminal, sign-in, and admin. Theme changes dispatch `bp-theme-change` and redraw the chart.
- Chart palettes resolve token colors before canvas use and adapt chart background, grid, axes, annotations, and overlays to the theme. Candles, volume bars, latest-price line, OHLC change, and market price-change indicators use bullish `#089981` / bearish `#F23645`. This is limited to trading data; unrelated positive/active UI uses the established design colors.
- Added a Zig Zag overlay with toolbar toggle, Tight/Standard/Wide sensitivity, alternating confirmed pivots, HH/HL/LH/LL labels, and a developing endpoint. Chart annotation labels and subtle candle/line accents remain theme-aware.
- Shared helper CSS/JS/font assets are served with explicit MIME types. Existing protected routes, admin authorization, AAL2, RLS, Edge Function controls, and customer-management workflows are retained.
- Release documentation refreshed: `README.md`, `PLAN.md`, `ROADMAP.md`, and this file.

## Regression verification
The following six suites pass locally:

1. `node test-gateway-auth.js`
2. `node test-admin-user-management.js`
3. `node test-pattern-scanner.js`
4. `node test-asset-scanner.js`
5. `node test-theme-contrast.js`
6. `node test-v1.js`

JavaScript syntax checks pass for application, gateway, and test files, including the inline `index.html` script. `vercel.json` and `package.json` parse as JSON; `git diff --check` passes. The contrast suite checks tested text pairs, theme synchronization and redraw wiring, dynamically evaluates light/dark resolved chart palettes, standard chart colors, volume and price-change styling, Zig Zag controls, and rejects unapproved green-family colors. These are local automated/source-contract checks, not a live browser visual review.

## Production boundary and release
- The owner pushed this update to GitHub `main`, commit `0e7e8ddf39bd6dc431395bc97fe90a4e70e8c6dc`. Vercel deployment `dpl_3UwNnDVxqTfimytRRF1TLZv2psFb` is READY/PROMOTED and serves the production alias. The assistant did not push or deploy.
- Smoke tests on production: `/login` 200; shared CSS and helper JS 200 with correct MIME types and byte-identical to local copies; unauthenticated `/app` returns 401. This verifies deployment metadata/public assets/protection only—not authenticated chart rendering or administrator workflows.
- The archive `/home/user/BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip` contains the complete safe 49-file project tree; integrity and required-file checks passed and all six suites passed again from the extracted archive.
- Authenticated admin acceptance and customer/admin browser visual review in both themes remain unverified because no authorized AAL2 session or browser acceptance run was available. No production users were created or changed for these tests.
- The Supabase migration and Edge Function state described in earlier deployment notes are unchanged by this UI/chart-only work. Continue to keep Supabase credentials out of source and the archive.

## Six-stage market terminal expansion — current local source
All six requested expansion stages are implemented in the current worktree: 18-asset market monitoring and individual coin panels; chart indicators/reference levels and plotted setup/pattern markers; historical outcomes and continuation analysis; six independent scanners (including unchanged owner-defined V1 criteria); fee/slippage-aware deterministic backtesting; and signal cards, persistent local tracking/analytics, responsive views and custom dropdowns. Calculations use public completed-candle/quote data where available and explain unavailable/delayed data and rule-based limitations.

Post-expansion verification: all six required regression suites passed; syntax checks passed for modified JS and the main inline HTML application script; `git diff --check` passed. Source tests cover deterministic scanner fixtures, the V1 owner-rule fixture, backtest fee/SL logic, reference levels and signal persistence/outcome resolution. No authenticated visual, real-device mobile, or AAL2 acceptance is claimed. No assistant push or deployment was performed; live production is still the earlier deployment described above. The existing archive is stale relative to this worktree and has been rebuilt separately for final delivery.

## Follow-up UI reliability hotfix — current local state
The dropdown menus now use strict hidden/closed CSS and a single shared desktop popover/mobile bottom sheet, initialized closed; option selection remains synchronized with the underlying native select and emits `change`. Market overview renders immediately from the 18-asset ticker cache or a single bulk 24h request and updates without waiting for klines; historical refinement is backgrounded (250 candles per pair, max four concurrent requests). Binance REST uses the official data-api/API1–3 mirrors and 3.5-second abort timeouts. Ticker/kline caches use the requested 180-second TTL with stale-while-revalidate. Order-book depth, spread and mid-price are green/red/neutral only in dark and light modes; order-book gold was removed.

All six regression suites pass locally. New tests cover initial closed dropdown states and single-menu transitions, immediate ticker-only breadth, mirror failover/timeouts, fresh/stale caches and zero-yellow book/depth/spread rules. JavaScript syntax checks and `git diff --check` pass. Authenticated visual/mobile acceptance remains outstanding. No authentication/admin/Supabase security file was modified for this hotfix, and no push or deployment was performed; the current production deployment is still the user's earlier push.


## Mobile dropdown and scanner latency — latest local follow-up
Fixed the mobile label/ghost-click race by relocating enhanced selects outside wrapping labels, adding hidden/native-control accessibility guards and a 350 ms outside-dismiss guard. Scroll/resize no longer close dropdowns. Mobile options open through a body-level bottom-sheet portal with a label header, close control, dim backdrop, safe-area positioning, and scrollable options.

Pattern Scanner/Uptrend and strategy scans now use 320 completed 1h candles and 60 daily candles, ticker bulk data, nine prioritized asset workers, rotating public Binance mirrors, incremental progress/partial rendering, and a five-minute browser snapshot. The Historical Backtester remains the only path requesting deep history (up to 1,000 candles, based on an explicitly selected date range). Cached snapshots contain public scan results only. Shorter live windows provide less historical outcome coverage than deep backtests, so the ~1–2 second goal is not represented as guaranteed or measured performance.

Regression tests were extended for dropdown dismissal guards, mobile sheet CSS, cache/progress metadata, and scanner limits/concurrency. This is local source-level coverage; iOS/Android real-device acceptance and authenticated browser timing are still unverified. Authentication, registration, admin security, order-book colors, and chart colors were left unchanged in this follow-up. All six suites, JavaScript syntax checks, JSON parsing and `git diff --check` passed after this follow-up. The rebuilt safe archive is `/home/user/BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip`; ZIP integrity and extracted-package tests are verified. No authenticated real-device acceptance or live scan timing measurement is claimed.

## Latest local follow-up — 45-pair watchlist and Market Breadth & Sentiment

Implemented the requested watchlist replacement and the new breadth/sentiment panel. Files touched: `index.html`, `scan-watched-assets.js`, `bluepeak-access-ui.js`, `bluepeak-design-system.css`, `test-asset-scanner.js`, `test-theme-contrast.js`, plus `README.md`, `PLAN.md`, `ROADMAP.md` and this file.
**Scope guardrails honoured:** `bluepeak-ui.js` (all desktop/mobile dropdown logic), `api/gateway.js`, `admin-dashboard.html`, `admin-users.html`, `admin-portal.js`, `supabase/functions/*`, the chart/Zig Zag/Reference-Level rendering, and the order-book colour rules were not modified.

**Watchlist (45 USDT pairs, exact order):** BTC, ETH, XRP, SOL, TRX, BCH, ADA, DOT, LTC, AVAX, LINK, XLM, HBAR, SUI, TON, NEAR, ETC, FIL, ATOM, VET, ALGO, APT, ARB, OP, STX, TIA, SEI, JASMY, GRT, RENDER, PYTH, IOTA, ZIL, CKB, XEC, TAO, BAT, LPT, POL, THETA, TWT, ZRO, MASK, NEO, EGLD.

Removed from every watchlist, metadata map, selector, WebSocket subscription, scanner and test assertion: `BNBUSDT`, `DOGEUSDT`, `SHIBUSDT`, `PEPEUSDT`, `PAXGUSDT`. The separate tracked-wallet Ethereum explorer view still lists native ETH and PAXG ERC-20 transfers because that is an independent Blockscout feature, not a market subscription.

**Market Breadth & Sentiment Analysis:** new dashboard block (`#market-breadth`) fed only by real public data — the single bulk `GET /api/v3/ticker/24hr` snapshot plus live `24hrTicker` WebSocket frames. `BPAssetScanner.marketSentiment(rows)` classifies each analysed market: Bullish when `change24h > 0.50` and range position `>= 0.45` (or `change24h >= 1.25`), Bearish when `change24h < -0.50` and range position `<= 0.55` (or `change24h <= -1.25`), Neutral otherwise. Percentages are computed from the analysed count (`bullishPct`, `bearishPct`, and `neutralPct = 100 - bullish - bearish`), never randomised or hardcoded. The block renders a 12px three-segment bar (green/grey/red, `width .35s ease`), an 80x80 SVG donut with the dominant label and percentage, three legend metrics with asset counts, and a footer showing `Assets Analyzed: n / 45`, the data-source string, and a live `HH:MM:SS` timestamp. Updates are throttled through the existing market-overview render scheduler (250ms) so socket ticks cannot thrash the DOM; the approved-user area mirrors the same figures from the `bp-breadth-update` event.

**Verification:** all six Node suites pass (`test-gateway-auth`, `test-admin-user-management`, `test-pattern-scanner`, `test-asset-scanner`, `test-theme-contrast`, `test-v1`). `test-asset-scanner.js` asserts the exact 45-symbol list in both `index.html` and `bluepeak-access-ui.js`, the absence of the five removed pairs, and byte-exact bullish/bearish/neutral counts and percentages from a deterministic 45-market fixture (20/15/10 -> 44.4%/33.3%/22.3%), including the `+/-1.25%` guard clauses and exclusion of a market with no usable 24h change. `test-theme-contrast.js` asserts the breadth markup, CSS contract, and runs the real `renderMarketBreadth()` in a VM against a fake DOM to check segment widths, donut arc lengths, counts, timestamp format and the update event. JS syntax checks pass for every modified file and both inline `index.html` scripts.

**Not verified:** authenticated browser rendering, real-device iOS/Android interaction, live 45-market timing, and the sub-300ms first-paint target against real Binance latency. No deployment or push beyond this branch was performed, and no production data was touched.
