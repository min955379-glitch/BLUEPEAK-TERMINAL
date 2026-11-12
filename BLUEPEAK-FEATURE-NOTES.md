# BluePeak scanner and access-control implementation notes

Scanner logic is implemented in the source package. The latest admin-routing correction is local and not live yet; GitHub sync and the production release remain pending. See `PROJECT_STATUS.md` for the authoritative status.

## Scanner rules implemented in the local analysis module

File: `pattern-scanner.js` (`BPPatterns.detect(candles, timeframe)`). Candles must be chronological OHLC objects; intended default input is hourly bars. The module returns detected events, recent/active event candidates, explicit uptrend checks, and per-pattern backtest summaries.

- **Hidden bullish divergence:** compare consecutive confirmed 3-left/3-right swing lows; newer low must be higher, RSI(14) at newer pivot at least 3 points lower; only surfaced after right-side candles close.
- **Order block:** following a confirmed close-break of a swing, last opposing candle in previous 10 candles defines the zone; active until close beyond its far edge.
- **BOS:** close crosses latest confirmed swing in established structure direction; first break is BOS.
- **CHoCH:** close crosses opposite swing against an established structure direction.
- **Fair Value Gap:** three-candle non-overlap, with gap at least 0.05 ATR(14); active until gap is filled across its far edge.
- **Liquidity sweep:** wick extends past a confirmed swing, but candle closes back inside.
- **V1 trend continuation is implemented as a four-step multi-timeframe filter.** Daily: completed close above EMA21/EMA50, RSI14 >50 and <=85, last 3 confirmed 2-left/2-right swing highs and lows rising, observed-history age proxy >=30 days (earliest returned daily candle; not an official exchange listing date), and both recent daily candle quote volume/current 24h quote volume meet the configurable floor (default $5M). RSI >85 is separately listed as overextended and excluded. 1h: >=2% retracement from prior 24h or 48h high (configurable 2–5%), OR RSI14 <45 in the preceding 4 completed candles (configurable 3–6). Momentum: latest RSI14 > prior. Trigger: latest closed candle green, close above prior midpoint, and volume exceeds each of the previous 3 strictly declining-volume candles. All four steps are required.
- V1 informational levels: trigger close; latest confirmed 1h swing low in the prior 48 candles minus a 1.5% buffer; latest previous confirmed 1h swing high; next 2-touch clustered daily resistance using the dashboard's 0.3% clustering convention; and 2R/3R alternatives when stop distance is available. Missing swing levels are explicitly shown as unavailable, not invented.
- V1 optional badges: BTC weakness only if its current 1h and derived 4h trends both have close < EMA21 < EMA50; major resistance means a clustered daily level within 1.5% above entry; late trigger means high-low range >7% of open. These are context flags only.
- V1 backtests count fully evaluated matching trigger candles with next 24 completed 1h candles in the same 1,000-hour window and the shared ±1 ATR first-touch methodology. Events may overlap and the UI states this. Fewer than 5 samples displays “Not enough historical data yet.” This is not presented as a trader win rate.

The module contains tooltip copy in `BPPatterns.RULES`. `scan-watched-assets.js` supplies the data adapter for the watched-asset list, defaults to 1h and 1,000 candles (about 41.7 days), limits concurrent requests, and excludes the still-open candle. `bluepeak-access-ui.js` is wired from `index.html` for the approved customer scanner. Customer sign-in is handled by the server gateway, not this client script. The separate admin portal is `/admin`, `/admin/dashboard`, and `/admin/users`; its pages and APIs require a server-verified admin profile and AAL2 MFA.

## Explicit uptrend criteria

All four checks must pass on the requested candles: latest close > SMA(50), latest close > SMA(200), and the last three confirmed swing highs and last three confirmed swing lows each increase strictly in sequence. This is a transparent screen, not a forecast.

## Backtest convention currently coded

For each completed event, entry is the close of the event/confirmation candle. Favorable means a 1×ATR(14) price barrier is hit before a 1×ATR adverse barrier within the next 24 completed candles. If both barriers are touched in one candle, it is counted as not favorable. Events without all 24 subsequent candles or valid ATR are excluded and counted separately. Results are simple historical barrier outcomes, not a modelled execution, not a win rate, and not a forecast. Window bounds and sample counts are returned with the summary. Final UI must show actual asset and timeframe and avoid pooling unlike series.

**User-approved defaults (2026-11-10):** scan the most recent 1,000 completed 1-hour candles per asset (about 42 days); evaluate the next 24 completed hourly candles; define favorable as a +1 ATR barrier reached before a −1 ATR barrier, with same-candle double touches counted as not favorable. Actual scan-window timestamps, event counts and excluded recent events must be shown. The scanner module itself evaluates whatever candle window the caller supplies. No trader win/loss data is generated.

## Access-control and routing state

- Supabase project `ivpzznjunvxdfnpzggxp` hosts `bluepeak-access`, `secure-bluepeak-auth`, `secure-bluepeak-admin`, and `secure-bluepeak-bootstrap`. Functions are deployed; invalid login and unauthorized operation smoke checks passed. Full authenticated owner/admin and buyer browser tests are not yet verified.
- Supabase Auth owns password hashes and MFA factors. Service-role secrets remain in Supabase function secrets; no service-role key is in browser code or `.env.example`.
- The local Vercel gateway stores access/refresh tokens in Secure HttpOnly cookies and protects dashboard assets before serving them. Admin APIs check role/AAL2 at both gateway and Edge Function. Session cap defaults to two; oldest active session is revoked on a new login where configured.
- The local Vercel gateway now routes by server-verified role: buyer sessions use `/app`; admin sessions with AAL2 use `/admin/dashboard`; an authenticated buyer requesting `/admin` is redirected to `/app`; unknown roles fail closed. The dedicated admin routes are protected by role and AAL2 checks and `/app/admin` is a compatibility redirect.
- Live HTTP checks on 2026-11-12 show signed-out requests to `/` and `/admin` receive login pages, protected customer HTML requests redirect to `/`, and `/admin/dashboard`, `/admin/users`, and `/app/admin` still return 404. The local changes are not deployed.
- Removed the `Admin panel` and `Sign out this device` controls from the approved-customer interface only. The dedicated portal keeps its logout controls, and the backend `/api/logout` remains available.
- Supabase Auth currently has public signup disabled and TOTP enabled. RLS is enabled on the six `bp_*` public tables; no policies were changed.
- GitHub `main` remains at `9583b209f29698c8fa65ba8843ea5ab406a54c69` as last observed. GitHub connector is unsupported here; no commit or push has occurred.

## Verification

`node test-pattern-scanner.js`, `node test-asset-scanner.js`, and `node test-v1.js` pass synthetic tests for base rules, completed-candle fetching, a qualifying four-step V1 fixture, liquidity exclusion, overextension labeling, informational levels, and exclusion of outcomes without 24 future candles. Gateway role-routing simulations and JavaScript syntax checks also pass. These are not live browser or authenticated production checks.

Clear user-facing disclosures must remain: informational public market data/pattern recognition only, no financial advice, no trading signal or guarantee, and no guaranteed profit.

## Release status (2026-11-12)
The latest local package includes a separate admin portal, stricter role-aware server routing, removal of the two requested customer-interface buttons, and mocked HTTP-handler regression tests. It still needs a production deployment, GitHub sync, and authenticated real-browser acceptance tests. The current production website is not yet fixed.
