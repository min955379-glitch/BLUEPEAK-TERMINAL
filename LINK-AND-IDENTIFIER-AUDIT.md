# Username/email and site-link audit

**Scope:** local source in this package plus verified production observations. The Supabase migration was applied; Supabase reports `secure-bluepeak-admin` v2 active, but `secure-bluepeak-auth` remains v1 and its update is unconfirmed. No new Vercel release or authenticated production browser test has occurred.

## Identifier flow

- `/admin/users` labels the creation field **Username or email**, accepts 254 characters in the browser, and no longer trims the value before sending it. The backend accepts either a 3–32 character username matching the existing allowed character set, or a conventional email address up to 254 characters. Leading/trailing whitespace is rejected rather than silently changing the input.
- The profile `username` column continues to store the identifier as entered. The users table renders this column verbatim and labels it **Username or email**. Reset/revoke actions use that exact stored identifier.
- For a username, the Supabase Auth email remains the internal `<lowercase-username>@users.bluepeak.invalid`; for an email identifier, the actual email is used for the Auth account and profile email. Buyer sign-in queries the exact `bp_profiles.username` value and authenticates using the profile email. Buyer login UI also says **Username or email** and passes the entered identifier without client-side trimming.
- Both `secure-bluepeak-admin` and legacy admin create actions now accept these identifiers. The shared auth function's buyer sign-in validator also accepts email-shaped identifiers; server-side buyer/admin role checks, admin MFA/AAL2 checks, active-session validation, and service-role boundaries remain unchanged.
- Migration `supabase/migrations/20261112124634_allow_email_identifiers.sql` expands the `bp_profiles.username` constraint and adds a case-insensitive uniqueness index. **This migration is applied as version `20261112124634`.** Preflight found zero case-only duplicate groups; post-apply aggregate check found 2 profiles and 0 invalid identifiers. The prior username validation constraint on `bp_access_requests` is intentionally unchanged because public access requests remain disabled and are not part of admin provisioning.

## Link, route, and action destination matrix

| Link/action | Intended destination/action | Local verification / access behavior |
|---|---|---|
| Customer login at `/` | Buyer sign-in while signed out; session-aware redirect for authenticated sessions | Existing role redirect remains: buyer to `/app`, AAL2 admin to `/admin/dashboard`.
| Direct `/login` | Buyer sign-in screen regardless of an existing cookie | Added explicit route that does not refresh/redirect the current session; tested signed-out, buyer, and admin cookies. This fixes the admin return-loop.
| Customer “Administrator sign in” | `/admin` | Admin landing/credential+MFA entry; buyer session redirects to `/app`; AAL2 admin goes to dashboard.
| Admin “Return to user login” | `/login` | Updated from `/`; avoids root's admin-to-dashboard redirect.
| Admin Dashboard / Users nav | `/admin/dashboard`, `/admin/users` | Both server-side gateway guards require approved admin role plus AAL2; buyer/signed-out cases redirect or deny.
| Dashboard “Open user management” | `/admin/users` | Same server-side guard.
| Users create | `POST /api/admin` action `create-user` | Gateway requires admin+AAL2; Edge Function separately verifies token, admin profile, MFA claim, and active session.
| Reset/revoke | `POST /api/admin` actions `reset-user-password` / `revoke-user` | Same admin authorization; operations target the exact identifier from the stored profile.
| Admin sign-out | `POST /api/logout`, then `/admin` | Logout revokes the active BluePeak session when available and clears Secure/HttpOnly cookies; redirect is to admin sign-in.
| Customer sign-out | `POST /api/logout` from customer terminal | Same logout endpoint; customer terminal retains its logout control.
| WhatsApp join/support/forgot-password | `https://wa.me/923485581969?...` in a new tab | Uses `target=_blank` and `rel=noopener`; message strings are URL-encoded. Destination was inspected, not externally opened.
| `/app/admin` compatibility route | `/admin/users` for approved AAL2 admin; `/app` for buyer; `/admin` otherwise | Gateway role-aware redirect remains in source.

Customer terminal action controls (scanner, chart, paper-trade, alerts, wallet, settings, and display controls) are application actions rather than site-navigation links. They were not individually browser-clicked; the existing scanner suites were run as regression tests. No unrelated controls were removed or retargeted.

## Verification performed

- `node --check api/gateway.js`, `node --check admin-portal.js`, and `node --check test-gateway-auth.js` passed.
- `node test-gateway-auth.js` passed with mocked gateway/identity responses. Coverage includes signed-out, buyer, admin/AAL2, and admin AAL1 route cases; direct `/login` under each session type; customer/admin route authorization; logout/cookies; refresh/expired session handling; and static assertions for identifier UI/function/migration wiring and key navigation destinations.
- The test does **not** execute the Deno/Supabase Edge Functions against a database and its source assertions do not prove a live auth account can be created or signed into by email. The migration ran through the authorized Supabase migration tool and appears in migration history as `20261112124634`; post-apply schema/data checks passed.
- Current live checks show `/login` returns 404; unauthenticated `/app` redirects to `/`, and admin routes redirect to `/admin`. The latest Vercel production deployment is READY/PROMOTED from GitHub `main` commit `bd0c291b00547c774260bce3c29edb824b090324`, which lacks the newer local fixes. The auth endpoint returns expected 401 for a deliberately nonexistent user; no real customer/admin credentials or session were tested.

## Urgent customer-access diagnosis and mobile findings

- Current production is Vercel deployment `dpl_HQUCwb5STJ2Sz9ayFQ5V6bcumk8P`, READY/PROMOTED from GitHub `main` at `bd0c291b00547c774260bce3c29edb824b090324`. The alias serves the older source currently committed to `main`; `/` returns the customer login page, `/login` is 404, and its form is username-only (32-character cap, trims input). The response was `no-store`/Vercel cache MISS, so this is a deployed-source mismatch, not a stale CDN copy.
- A signed-out browser-style GET of `/app` redirects to `/`, which is the intended protected-route behavior. Admin pages also route to `/admin` while signed out. A safe deliberately nonexistent login reached the live auth function and returned its expected 401; this establishes that the gateway-to-auth endpoint responds, but cannot establish a real customer's credentials/session status. No customer password or session was available or requested.
- The live generated buyer and admin login pages both called `crypto.randomUUID()` with no fallback to build `device_id`. In an iPhone SE-sized Playwright mobile context with `crypto.randomUUID` unavailable, submission reproduced `crypto.randomUUID is not a function` and made **zero** `/api/auth` requests. This is a confirmed browser-compatibility blocker for clients lacking that API. The local login scripts now generate a 16-byte `getRandomValues` ID (with a non-auth fallback) and tolerate unavailable localStorage; tests with `randomUUID` disabled reached the mocked auth endpoint for both buyer and admin.
- The dashboard CSS also had `body { min-width: 360px }`; at a 320 CSS-pixel mobile viewport, the old topbar's intrinsic flex width expanded the document to 411px. This caused horizontal overflow/clipping. The mobile CSS now constrains the topbar and app to the viewport, permits the brand to shrink, hides nonessential status text only at <=360px, and sets the narrow-screen minimum to 320px.

### Mobile browser-emulation verification

Used Playwright Chromium with mobile/touch emulation and explicit 320×568 (iPhone SE-size), 390×844 (iPhone-size), and 412×915 (Pixel-size) contexts—not a desktop window resize. With a mocked approved session and stubbed public market responses, the local terminal showed the scanner, chart canvas, watchlist, order book, and stats at all three sizes; `documentElement.scrollWidth` equaled the viewport width (320, 390, and 412) and there were no JavaScript exceptions. At 320px, tapping the scanner completed **18/18 assets × 1,000 mocked candles**. The buyer/admin login test also removed `crypto.randomUUID`, submitted, and confirmed a device ID reached the mocked auth request. These are browser-emulation tests with mocked identity/market data, not a real physical device, exchange feed, or real customer login.
