# BluePeak Terminal — Roadmap

## Current release: institutional UI and account-management upgrade

### Implemented in this worktree
- Shared high-contrast dark/light navy-ivory-gold tokens and a synchronized persistent theme controller across terminal/admin/sign-in. Chart palettes resolve colors before canvas use and redraw on theme changes; requested bullish `#089981` and bearish `#F23645` candle, volume, and market price-change colors are strictly chart-specific. Zig Zag toolbar toggle includes Tight/Standard/Wide sensitivity, swing pivots and labels, and a developing leg. Non-chart positives retain existing design rules; form and dropdown contrast is audited.
- Customer/admin sign-in styling that preserves the existing server-side auth, reset, and MFA/AAL2 flows.
- Customer terminal compatibility styling and scanner access/session-expiry handling; no legacy Admin panel or device-only sign-out controls are added.
- Admin KPI strip, user provisioning/password generation and copy controls, live password requirements, user search/filter/counts, skeleton loading, stacked toasts, confirmation dialogs, keyboard navigation, and audit feed.
- Immediate single-step Auth/profile/session deletion, immediate identifier reuse, stale soft-deleted buyer cleanup, and protected owner/self/last-admin rules.
- AAL2-only server-side audit listing and existing service-role/RLS boundaries.

### Production backend status
- Soft-deleted buyer cleanup migration `20261112160047_purge_legacy_soft_deleted_buyers` is applied. Zero legacy soft-deleted buyers remained at preflight; post-migration checks confirm zero.
- `secure-bluepeak-admin` is ACTIVE version 8. Earlier requested account cleanup remains verified: no Auth/profile/linked app-session identity remains; audit history was preserved.
- The stricter email-validation update exists in the current source but has not yet been deployed to Supabase.
- Existing status and audit-FK migrations are applied. The linked production project is Supabase `ivpzznjunvxdfnpzggxp`.

### Deployment and remaining acceptance
- Owner-pushed commit `0e7e8ddf39bd6dc431395bc97fe90a4e70e8c6dc` is READY/PROMOTED in Vercel deployment `dpl_3UwNnDVxqTfimytRRF1TLZv2psFb` and owns the production alias.
- Production smoke checks: `/login` 200; CSS/JS assets 200, correct MIME, and byte-identical to the local source; unauthenticated `/app` 401. Authenticated chart/admin acceptance is still outstanding.
- All six local regression suites, JavaScript syntax checks, and `git diff --check` pass. The complete safe 49-file ZIP is integrity-checked; all six suites pass from its extracted copy. No push or deployment was performed by this assistant.
- Public production smoke checks pass for sign-in, CSS/theme assets, and protected-route behavior. Signed-in customer/admin visual verification in both themes and authenticated admin workflows are still unverified. No supplied customer credential was used. Privately test with authorized accounts; use disposable identities for destructive admin acceptance and avoid the owner, last-admin, and real customers.

## Ongoing platform maintenance
- Keep vanilla HTML/CSS/JS and the Node gateway/Supabase architecture; do not convert to a framework or add an external CSS framework.
- Preserve protected page/API routing, Supabase Auth, MFA/AAL2, RLS, and service-role isolation.
- Continue scanner and mobile-layout regression coverage; all current Node suites pass.
- Keep deployment and migration documentation aligned with the exact versions running in each environment.

### Six-stage market terminal expansion (local, not deployed)
- Implemented the 18-pair market monitor and coin details; chart indicators/reference levels; historical pattern and continuation analysis; six independent strategy scanners; deterministic fee/slippage backtesting; and scanner cards plus a browser-local signal ledger.
- Added responsive/mobile scanner and backtest layouts, keyboard-operable custom selects synchronized with native `change`, order-book depth styling, and chart plotting links for detected patterns and historical trades.
- Verification: all six mandated Node suites pass, modified JavaScript and the main inline HTML application script pass `node --check`, and `git diff --check` passes. This does not replace authenticated customer/admin, visual, mobile-device, or AAL2 workflow acceptance.
- The changes remain local and unpushed/undeployed. Production deployment records above refer to the earlier release. The prior archive is stale and must be rebuilt from the final source. Keep public OHLCV-derived analysis informational, not financial advice or prediction.

## Shipped in this branch: 45-pair watchlist and Market Breadth & Sentiment

Watchlist expanded to the exact 45 requested USDT pairs and the dashboard gained a live breadth/sentiment panel computed from the public 24h ticker snapshot and WebSocket updates. Next: authenticated and real-device acceptance, measured warm/cold scan timings on all 45 markets, and production timing of the bulk-snapshot first paint.
**Scope guardrails honoured:** `bluepeak-ui.js` (all desktop/mobile dropdown logic), `api/gateway.js`, `admin-dashboard.html`, `admin-users.html`, `admin-portal.js`, `supabase/functions/*`, the chart/Zig Zag/Reference-Level rendering, and the order-book colour rules were not modified.

**Watchlist (45 USDT pairs, exact order):** BTC, ETH, XRP, SOL, TRX, BCH, ADA, DOT, LTC, AVAX, LINK, XLM, HBAR, SUI, TON, NEAR, ETC, FIL, ATOM, VET, ALGO, APT, ARB, OP, STX, TIA, SEI, JASMY, GRT, RENDER, PYTH, IOTA, ZIL, CKB, XEC, TAO, BAT, LPT, POL, THETA, TWT, ZRO, MASK, NEO, EGLD.

Removed from every watchlist, metadata map, selector, WebSocket subscription, scanner and test assertion: `BNBUSDT`, `DOGEUSDT`, `SHIBUSDT`, `PEPEUSDT`, `PAXGUSDT`. The separate tracked-wallet Ethereum explorer view still lists native ETH and PAXG ERC-20 transfers because that is an independent Blockscout feature, not a market subscription.

**Market Breadth & Sentiment Analysis:** new dashboard block (`#market-breadth`) fed only by real public data — the single bulk `GET /api/v3/ticker/24hr` snapshot plus live `24hrTicker` WebSocket frames. `BPAssetScanner.marketSentiment(rows)` classifies each analysed market: Bullish when `change24h > 0.50` and range position `>= 0.45` (or `change24h >= 1.25`), Bearish when `change24h < -0.50` and range position `<= 0.55` (or `change24h <= -1.25`), Neutral otherwise. Percentages are computed from the analysed count (`bullishPct`, `bearishPct`, and `neutralPct = 100 - bullish - bearish`), never randomised or hardcoded. The block renders a 12px three-segment bar (green/grey/red, `width .35s ease`), an 80x80 SVG donut with the dominant label and percentage, three legend metrics with asset counts, and a footer showing `Assets Analyzed: n / 45`, the data-source string, and a live `HH:MM:SS` timestamp. Updates are throttled through the existing market-overview render scheduler (250ms) so socket ticks cannot thrash the DOM; the approved-user area mirrors the same figures from the `bp-breadth-update` event.

**Verification:** all six Node suites pass (`test-gateway-auth`, `test-admin-user-management`, `test-pattern-scanner`, `test-asset-scanner`, `test-theme-contrast`, `test-v1`). `test-asset-scanner.js` asserts the exact 45-symbol list in both `index.html` and `bluepeak-access-ui.js`, the absence of the five removed pairs, and byte-exact bullish/bearish/neutral counts and percentages from a deterministic 45-market fixture (20/15/10 -> 44.4%/33.3%/22.3%), including the `+/-1.25%` guard clauses and exclusion of a market with no usable 24h change. `test-theme-contrast.js` asserts the breadth markup, CSS contract, and runs the real `renderMarketBreadth()` in a VM against a fake DOM to check segment widths, donut arc lengths, counts, timestamp format and the update event. JS syntax checks pass for every modified file and both inline `index.html` scripts.

**Not verified:** authenticated browser rendering, real-device iOS/Android interaction, live 45-market timing, and the sub-300ms first-paint target against real Binance latency. No deployment or push beyond this branch was performed, and no production data was touched.
