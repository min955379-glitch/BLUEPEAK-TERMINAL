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
