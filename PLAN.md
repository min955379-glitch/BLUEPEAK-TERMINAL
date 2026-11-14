# BluePeak Terminal — Implementation Plan

## Objective

Keep the read-only market-analysis terminal and existing static HTML/CSS/vanilla-JS, Node gateway, Supabase Auth/MFA/AAL2, RLS, and Edge Function architecture. Upgrade the user experience to an institutional deep-navy, warm-ivory, muted-gold design and retain server-enforced access protections.

## Current implementation

- Shared high-contrast Dark/Light navy-ivory-gold tokens, local Inter/JetBrains Mono, synchronized persistent theme controls, immediate chart redraw, resolved theme-specific canvas palettes, and explicit control/select/option/placeholder styling. Standard bullish `#089981` / bearish `#F23645` colors are a deliberate chart-only exception for candles, volume, and price direction; unrelated UI positives remain non-green. The chart includes Zig Zag pivots/labels and three sensitivity presets.
- Sign-in remains on the existing gateway-managed customer/admin auth endpoints; password controls preserve the existing MFA/AAL2 gates.
- Admin dashboard now shows four user KPIs and links to the management workspace. User management includes add-user, strong password generation, credential copy, live requirement pills, search/filter counts, skeleton rows, toast feedback, destructive confirmations, and recent audit activity.
- `bluepeak-ui.js` implements shared toasts, keyboard-trapped confirmation dialogs, password visibility controls, and `/`, Ctrl/Cmd+K, and Escape behaviors. Customer scanner access redirects on expired 401 sessions.
- Admin `list-audit` is served only through the existing AAL2-verified `secure-bluepeak-admin` Edge Function.
- Delete remains immediate and permanent after an explicit confirmation. Supabase Auth deletion cascades profile and active-session data; audit snapshots are preserved with nullable references. UI removes the row and updates counts; there is no intermediate Deleted/Permanently purge workflow.
- User creation clears matching legacy soft-deleted buyer profiles before creation retry. Owner, self, and last-active-admin safeguards remain server-enforced.

## Backend/database and production execution

- Added `supabase/migrations/20261112160047_purge_legacy_soft_deleted_buyers.sql`; applied in the linked production Supabase project as migration `purge_legacy_soft_deleted_buyers` (version `20261112160047`). Preflight and post-migration queries found zero soft-deleted buyer/Auth identities to clean.
- Updated the `secure-bluepeak-admin` Edge Function with AAL2-only `list-audit`; production is ACTIVE version 8. Previous permanent deletion flow and owner/self/last-admin protections remain in place.
- The named legacy identity `saaaaaddKhan112` / `saaaaaddkhan112@users.bluepeak.invalid` remains absent from production Auth/profile/session tables. Earlier cleanup and audit history are preserved.
- The audit actor FK migration `20261112152724_detach_admin_audit_actor_on_auth_delete` and status migration are also applied. Service-role credentials remain server-only.

## Verification

Passed in the current worktree:

1. `node test-gateway-auth.js`
2. `node test-admin-user-management.js` — includes immediate deletion/reuse/policy contracts, owner/self/last-admin protection, migration, and the approved chart-green exception audit.
3. `node test-pattern-scanner.js`
4. `node test-asset-scanner.js`
5. `node test-v1.js`
6. `node test-theme-contrast.js` — token contrast pairs, theme controls, form/dropdown styling, resolved canvas palette, candle colors, Zig Zag controls, and approved chart-green source audit.
7. `node --check` for the modified JavaScript files, `python -m json.tool vercel.json`, and `git diff --check`.

These tests are local mocks/source-contract checks, not an authenticated production UI test. No AAL2 admin session was used, and no replacement identity was created for the prior production purge test.

## Deployment and remaining acceptance

- The owner pushed the chart/theme/Zig Zag update to GitHub `main`, commit `0e7e8ddf39bd6dc431395bc97fe90a4e70e8c6dc`. Vercel deployment `dpl_3UwNnDVxqTfimytRRF1TLZv2psFb` is READY/PROMOTED and has the production alias.
- Public smoke checks confirmed `/login` 200; CSS and helper JS return 200 with correct MIME types and match the local source byte-for-byte; unauthenticated `/app` returns 401. No authenticated chart/admin visual testing was done.
- The complete safe 49-file project ZIP is at `/home/user/BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip`; integrity/required entries passed and all six suites passed from the extracted archive. The assistant did not push or create a deployment.
- Supabase `secure-bluepeak-admin` remains ACTIVE version 8; the live function source includes the stricter email checks now in the repository.
- With an authorized AAL2 admin session, privately test list/audit access and create/disable/enable/delete/recreate on disposable accounts. Authenticated customer/admin visual acceptance in both themes remains unverified. This has not been performed; avoid the owner, last admin, and real customers.

## Six-stage market terminal expansion — local implementation status

Completed the requested Stage 1–6 source implementation in sequence: (1) 18-asset market data, momentum/overview and coin detail panels; (2) interactive candle chart, indicators and calculated levels; (3) historical pattern metrics and trend continuation; (4) independent Hidden Bullish Divergence, owner-rule V1, ICT, SMC, Price Action and Pump scanners; (5) deterministic next-bar backtesting with conservative same-candle stop handling and round-trip fees/slippage; (6) signal cards, deduplicated local tracking/outcome analytics, mobile layouts and custom selects. Chart links can load signal trade levels and historical occurrence markers. Public-data outages, unavailable market caps, incomplete histories and strategy approximations remain explicitly non-predictive limitations.

After implementation, all six required suites passed, all modified JS plus the primary inline `index.html` script passed syntax checks, and `git diff --check` passed. Scanner/backtest/reference-level/tracker checks use deterministic fixtures. No authenticated visual or AAL2 workflow was performed. The assistant did not push/deploy; production remains on the deployment noted above and does not include this local expansion until separately authorized and released. Rebuild the final safe ZIP from this verified worktree; the previously presented archive is stale.

## Follow-up production reliability hotfix — verification
Fixed the reported dropdown, market-overview and order-book styling defects in the local worktree. All selects now start closed behind global `[hidden]`/closed-state rules and share one floating menu with a mobile backdrop. The market overview uses cached/live 24h ticker data immediately, then refines with completed 1h candles under a four-request concurrency cap; ticker and candle caches use a 180-second TTL, and Binance fetches fail over across official mirrors after 3.5-second aborts. The order book uses the requested bid/ask colors and neutral spread surfaces in dark/light themes, with gold removed from depth-related rules.

All six mandated Node suites pass, including new dropdown-manager simulation, cache/failover/fast-breadth checks and order-book yellow-color checks. Syntax checks and `git diff --check` pass. No login/auth/admin/RLS/Edge Function enforcement changes were made. Production browser reproduction with an authorized account remains unverified. This hotfix is local, not pushed/deployed; rebuild and deliver the final safe ZIP after the complete source checks.


## Mobile select and scanner latency follow-up — current local changes
- Removed scroll/resize-triggered dropdown closes; label-wrapped native selects are moved out of the label, marked hidden/non-interactive, and protected by a 350 ms outside-click guard. Mobile selects are body-portaled safe-area bottom sheets with a clear field title and close button.
- Scanner requests use 320 completed hourly and 60 completed daily candles, share the 24h ticker snapshot, prioritize six flagship symbols, distribute requests across official mirrors, cap asset workers at nine, yield between results, and stream partial results in six-asset increments. A five-minute snapshot supports immediate cached rendering. Explicit deep backtests may request up to 1,000 bars; routine scans do not.
- The requested target of ~1–2 seconds depends on cache warmth, mobile/network conditions, and Binance availability; it is a target, not a verified live timing guarantee. Historical summary coverage is correspondingly shorter for the initial scan window.
- Updated regression tests and docs; all six suites, JavaScript syntax checks, JSON parsing and `git diff --check` pass. No authentication, admin security, order-book or chart-color changes were made for this follow-up. No authenticated real-device interaction has been performed. The current safe ZIP is rebuilt and verified separately.

## Completed: 45-pair watchlist + real-time Market Breadth & Sentiment

Part A replaced the 18-pair watchlist with the exact requested 45 USDT pairs in `index.html` (asset metadata, demo seed prices, icon fallback, counters, selectors) and `bluepeak-access-ui.js` (scanner list, backtest selector, 45-asset label, six-market progress checkpoints), and updated the scanner adapter's flagship ordering to BTC/ETH/XRP/SOL/TRX/BCH with a 45-asset expectation. Part B added the Market Breadth & Sentiment panel and its calculation engine. Progressive kline streaming, four-mirror sharding, 320x1h + 60x1d windows and the nine-worker cap are unchanged.
**Scope guardrails honoured:** `bluepeak-ui.js` (all desktop/mobile dropdown logic), `api/gateway.js`, `admin-dashboard.html`, `admin-users.html`, `admin-portal.js`, `supabase/functions/*`, the chart/Zig Zag/Reference-Level rendering, and the order-book colour rules were not modified.

**Watchlist (45 USDT pairs, exact order):** BTC, ETH, XRP, SOL, TRX, BCH, ADA, DOT, LTC, AVAX, LINK, XLM, HBAR, SUI, TON, NEAR, ETC, FIL, ATOM, VET, ALGO, APT, ARB, OP, STX, TIA, SEI, JASMY, GRT, RENDER, PYTH, IOTA, ZIL, CKB, XEC, TAO, BAT, LPT, POL, THETA, TWT, ZRO, MASK, NEO, EGLD.

Removed from every watchlist, metadata map, selector, WebSocket subscription, scanner and test assertion: `BNBUSDT`, `DOGEUSDT`, `SHIBUSDT`, `PEPEUSDT`, `PAXGUSDT`. The separate tracked-wallet Ethereum explorer view still lists native ETH and PAXG ERC-20 transfers because that is an independent Blockscout feature, not a market subscription.

**Market Breadth & Sentiment Analysis:** new dashboard block (`#market-breadth`) fed only by real public data — the single bulk `GET /api/v3/ticker/24hr` snapshot plus live `24hrTicker` WebSocket frames. `BPAssetScanner.marketSentiment(rows)` classifies each analysed market: Bullish when `change24h > 0.50` and range position `>= 0.45` (or `change24h >= 1.25`), Bearish when `change24h < -0.50` and range position `<= 0.55` (or `change24h <= -1.25`), Neutral otherwise. Percentages are computed from the analysed count (`bullishPct`, `bearishPct`, and `neutralPct = 100 - bullish - bearish`), never randomised or hardcoded. The block renders a 12px three-segment bar (green/grey/red, `width .35s ease`), an 80x80 SVG donut with the dominant label and percentage, three legend metrics with asset counts, and a footer showing `Assets Analyzed: n / 45`, the data-source string, and a live `HH:MM:SS` timestamp. Updates are throttled through the existing market-overview render scheduler (250ms) so socket ticks cannot thrash the DOM; the approved-user area mirrors the same figures from the `bp-breadth-update` event.

**Verification:** all six Node suites pass (`test-gateway-auth`, `test-admin-user-management`, `test-pattern-scanner`, `test-asset-scanner`, `test-theme-contrast`, `test-v1`). `test-asset-scanner.js` asserts the exact 45-symbol list in both `index.html` and `bluepeak-access-ui.js`, the absence of the five removed pairs, and byte-exact bullish/bearish/neutral counts and percentages from a deterministic 45-market fixture (20/15/10 -> 44.4%/33.3%/22.3%), including the `+/-1.25%` guard clauses and exclusion of a market with no usable 24h change. `test-theme-contrast.js` asserts the breadth markup, CSS contract, and runs the real `renderMarketBreadth()` in a VM against a fake DOM to check segment widths, donut arc lengths, counts, timestamp format and the update event. JS syntax checks pass for every modified file and both inline `index.html` scripts.

**Not verified:** authenticated browser rendering, real-device iOS/Android interaction, live 45-market timing, and the sub-300ms first-paint target against real Binance latency. No deployment or push beyond this branch was performed, and no production data was touched.
