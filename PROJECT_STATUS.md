# BluePeak Terminal — Project Status

## Scope and constraints
Preserve the native HTML/CSS/vanilla-JS terminal, Node gateway, Supabase Auth/MFA/AAL2, PostgreSQL RLS, Edge Functions, and existing administrator protections. Never expose credentials, push to GitHub, deploy without authorization, or use real customer/owner accounts for destructive tests.

## Implemented locally
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
- Previously verified production deployment: `dpl_38r8i8JdDAEcURSqPGgKGsmCM5CT`, READY/PROMOTED at `https://bluepeak-terminal.vercel.app`, built from `17c7cb45a941cc67e41e23bac6a6fa4d53fb96ec`. It predates the current local chart/theme/Zig Zag changes.
- Earlier unauthenticated smoke checks confirmed public login/shared assets and protected-route redirects/401s for that prior release. They do not establish authenticated acceptance.
- The current revision is local only: not committed, pushed, uploaded, or deployed. The archive is `/home/user/BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip`; it contains the complete safe 49-file project tree; integrity and required-file checks passed and all six test suites passed again from the extracted archive.
- Authenticated admin acceptance and customer/admin browser visual review in both themes remain unverified because no authorized AAL2 session or browser acceptance run was available. No production users were created or changed for these tests.
- The Supabase migration and Edge Function state described in earlier deployment notes are unchanged by this UI/chart-only work. Continue to keep Supabase credentials out of source and the archive.
