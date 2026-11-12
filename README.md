# BluePeak Scalp Terminal

BluePeak is a read-only crypto-market terminal with an 18-asset watchlist, charts, public market monitoring, historical pattern detection, and a V1 trend-continuation scanner. It does not place trades, handle funds, predict prices, or give trading advice.

The deployed system has two protected areas:

- **Customer terminal:** approved customers sign in with an issued username and password.
- **Administrator portal:** a separately provisioned administrator signs in at `/admin` using username, password, and TOTP authenticator verification (AAL2).

## Project source and dependencies

This is a **vanilla HTML/CSS/JavaScript** project, not React or Next.js. `index.html` contains the terminal UI and styles; standalone JavaScript modules implement the scanner and access UI. `api/gateway.js` is the Vercel Node serverless gateway. The `supabase/` directory contains all four Edge Function sources, the Supabase CLI config, and the four applied SQL migrations. Images, icons, and locally hosted fonts are included. `package.json` declares Node.js 20+ and no NPM runtime dependencies, so no `package-lock.json` is needed; the Supabase Edge Function package import is version-pinned in source. See `SOURCE-INVENTORY.md` for the archive contents and excluded generated/secret files.

## Current deployment warning

The local source package contains the updated server-side routing and customer/admin separation, but it has **not yet been deployed to Vercel**. Live HTTP checks on 2026-11-12 found `/` and `/admin` return login pages; signed-out HTML requests to `/app`, `/index.html`, and `/pattern-scanner.js` redirect to `/`; `/admin/dashboard`, `/admin/users`, and `/app/admin` still return 404 in production. Do not treat the live admin portal as fixed until the updated package is deployed and real-browser tests pass.

The latest local routing correction is documented in `PROJECT_STATUS.md` and `SECURE-ACCESS-REWRITE.md`.

## Routes in the updated source

- `/` — signed-out customer login/landing page; an approved buyer is redirected to `/app`, an AAL2 admin to `/admin/dashboard`.
- `/app` — protected customer terminal and scanner.
- `/admin` — dedicated administrator sign-in and first-owner/MFA setup when signed out; an authenticated buyer is redirected to `/app`, while an AAL2 administrator is redirected to `/admin/dashboard`.
- `/admin/dashboard` — protected admin dashboard.
- `/admin/users` — protected account management.
- `/app/admin` — compatibility redirect to `/admin/users` for an authorized admin, otherwise to `/admin`.

Every Vercel request is routed through `api/gateway.js`. The gateway serves protected HTML, scripts, and assets only after server-side Supabase session and role checks. Admin pages and `/api/admin` additionally require the administrator role and AAL2. Browser auth tokens are Secure, HttpOnly cookies. Customers can sign out from the terminal's global top bar; administrators can sign out inside the dedicated Admin Portal. Supabase Auth stores password hashes; passwords are not retrievable. Admin resets generate a new one-time password and revoke the user's BluePeak sessions.

## Local development

Requirements: Node.js 20 or later, internet access, and the Vercel CLI invoked through `npx`. No third-party NPM runtime packages are required by `package.json`.

1. Clone this repository, or open the project folder.
2. Sign in to Vercel and link the existing project (once per local checkout):

   ```sh
   npx --yes vercel login
   npx --yes vercel link
   ```

   Select the existing `bluepeak-terminal` project. Do not create a replacement project.
3. Run the Vercel development server:

   ```sh
   npx --yes vercel dev
   ```

   Use the local URL printed by the CLI. A plain `python -m http.server` is not sufficient because it bypasses the server-side gateway.

## Tests

Run the gateway authorization regression and existing synthetic scanner tests from the project root:

```sh
node test-gateway-auth.js
node test-pattern-scanner.js
node test-asset-scanner.js
node test-v1.js
```

The gateway, customer access UI, and admin UI can be syntax-checked with:

```sh
node --check api/gateway.js
node --check bluepeak-access-ui.js
node --check admin-portal.js
```

Local mocked routing checks and the results/pending items are recorded in `PROJECT_STATUS.md`. They are not a substitute for live incognito and authenticated browser tests.

## Environment and secrets

The gateway requires `SUPABASE_ANON_KEY` at runtime to call Supabase Auth and Edge Functions. It is configured in the linked Vercel project for production, preview, and development. For a local linked checkout, Vercel CLI can populate an ignored `.env.local` with `npx --yes vercel env pull .env.local`; never commit that file. `.env.example` lists the variable name and optional gateway overrides only. The anon/publishable key is designed to be public; database RLS and server-side authorization must remain correctly enforced. Supabase service-role credentials belong only in Supabase's server-side function secrets. Never place service-role credentials, passwords, access tokens, or actual `.env` files in this repository or browser code. `.gitignore` excludes local environment files and Vercel project metadata. Do not disable or weaken database RLS as a routing workaround.

Supabase Edge Functions used by the gateway are `bluepeak-access`, `secure-bluepeak-auth`, `secure-bluepeak-admin`, and `secure-bluepeak-bootstrap`. Supabase Auth owns password hashing and MFA.

## Production deployment

From the project root, with the correct Vercel account signed in and the project linked:

```sh
npx --yes vercel deploy . --prod --yes
```

After Vercel reports READY/PROMOTED, test the production routes, server-side denials, admin/customer separation, refresh, navigation, and sign-out. A successful upload alone is not proof that auth works. See `PLAN.md` and `SECURE-ACCESS-REWRITE.md`.

## Market and safety notes

- Market data is public Binance data; wallet address lookups use Blockscout. No wallet connection or signing is used.
- User-added wallet addresses/labels, alerts, drawings, and paper trades are browser-session data; addresses are sent to Blockscout when queried.
- Pattern output is historical detection, not a trading signal or guarantee. V1 is trend continuation, not reversal/bottom detection; all stages must pass in order.
- Listing age is only a proxy based on the earliest returned daily candle (not an official exchange listing date). Minimum age and quote volume are configurable; defaults are 30 days and $5M USDT.
- Context warnings are informational and do not block an otherwise qualifying setup. Reference levels are informational only; no order is executed.
- Backtest defaults: 1,000 completed 1h candles, next 24 completed hourly candles, +1 ATR before −1 ATR, and same-candle double touches counted unfavorably.
- Required disclosures: “Pattern match based on historical price action — not a trading signal or guarantee.” “Historical backtest result, not a prediction of future performance.” “Reference levels only — not advice, nothing is executed on your behalf.”
