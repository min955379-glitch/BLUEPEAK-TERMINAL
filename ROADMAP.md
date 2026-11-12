# BluePeak Terminal — Roadmap

This is an ordered, non-date-based roadmap. Items are marked complete only when implemented and verified at the stated level. Product safety rules in `README.md` apply to every phase.

## Completed and locally verified

- Responsive read-only terminal with 18-asset watchlist, public Binance market data, charts, order book, alerts, monitor, session-only paper trades, and optional manual Blockscout address activity.
- Pattern scanner, asset adapter, explicit uptrend criteria, and V1 trend-continuation rules with 1,000 completed hourly candles and the 24-candle, ±1 ATR historical outcome convention.
- Supabase Edge Functions for approved access, username/password login, TOTP-admin operations, first-owner bootstrap, password reset/revocation, and a small active-session cap.
- Server-side Vercel gateway and login/landing flow in the deployment package; protected scripts/data are not sent to signed-out visitors in local gateway simulations.
- Separate admin dashboard and user-management pages with server-side role + AAL2 checks are implemented locally. The gateway now fails closed for unknown roles and routes authenticated customers away from `/admin`.
- Removed the requested `Admin panel` and `Sign out this device` controls from the approved-customer scanner UI only; customer sign-out is in the main terminal top bar, and dedicated-admin navigation/logout and the shared server logout remain.
- Gateway regression tests cover anonymous access, customer/admin routing, admin API denials, AAL2, expired sessions, secure cookies/logout, and token handling. Core scanner synthetic tests and JavaScript syntax checks pass.

## In progress — release and source synchronization

1. Deploy the latest local package to the existing Vercel `bluepeak-terminal` production project. The deployment connector rejected an upload before creating a deployment, so production still runs the earlier routing implementation.
2. Push the latest source and documentation to GitHub `main`. The GitHub connector is unsupported in this workspace and no GitHub CLI/authenticated local checkout is available here; the public repository was inspected and is still at `9583b209f29698c8fa65ba8843ea5ab406a54c69`.
3. Run real-browser checks after deployment; only mocked routing and negative service smoke tests are currently done.

## Next release acceptance

- Signed-out `/` shows the login/landing page only; direct requests for dashboard, scanner scripts, and protected API data are denied.
- Buyer sign-in opens `/app`; buyer cannot open admin pages or admin APIs.
- Admin sign-in at `/admin` requires password and TOTP and opens `/admin/dashboard` (never `/app`).
- Admin can refresh and navigate `/admin/dashboard` ↔ `/admin/users`; server role/AAL2 check remains active.
- Admin sign-out returns to `/admin`; subsequent admin requests are denied.
- Test account create/list/reset/revoke and the two-session policy.
- Check browser console/network errors and ensure the existing customer market terminal still works.

## Later improvements (only after the release is stable)

- Keep dependencies and Supabase/Vercel functions current; document upgrades and rerun the acceptance suite.
- Revalidate Binance symbols and endpoint behavior when the watchlist or feed changes.
- Improve automated browser tests for customer/admin route separation and password reset.
- Reassess monitoring and privacy needs before adding services or persistent user data.

## Non-negotiable guardrails

- No real order execution, funds handling, trading recommendations, or guaranteed outcomes.
- Pattern matches are historical observations, not signals; V1 is trend continuation only.
- Age is based on earliest returned daily candle, not official listing date. Context warnings do not block qualification. Reference levels do not execute anything.
- Never expose Supabase service-role credentials or weaken RLS; admin authorization must be enforced server-side.
- No public customer signup. Admin-created accounts use hashed passwords; forgotten passwords are reset, never retrieved.
