# BluePeak Scalp Terminal

BluePeak is a read-only crypto-market terminal with an 18-asset watchlist, charts, public market monitoring, historical pattern detection, and a V1 trend-continuation scanner. It does not place trades, handle funds, predict prices, or give trading advice.

## Application areas

- **Customer terminal:** approved customers sign in with the exact username or email and password provisioned for them.
- **Administrator portal:** a separately provisioned administrator signs in at `/admin` using password and TOTP authenticator verification (AAL2). The portal at `/admin/dashboard` and `/admin/users` can create accounts, reset passwords, disable/re-enable access, and soft-delete accounts.

## Latest user-management update (manual release steps remain)

This archive adds:

- **Disable access:** blocks the customer profile, revokes BluePeak sessions, and applies a Supabase Auth ban. Protected website and API requests continue to check profile/session state server-side.
- **Enable access:** removes the Auth ban and restores `approved` access while retaining the existing identity, password, profile, and related records. The customer signs in again with the existing password; prior sessions stay revoked.
- **Delete User:** a soft delete that marks the profile `deleted`, blocks Auth sign-in, revokes sessions, preserves user/profile/audit records, and shows a Deleted status. It requires a named confirmation.
- **Permanent purge:** only the designated owner profile (`username = 'owner'`) receives the UI action. The Edge Function rechecks owner, AAL2, active-session, deleted-state, and exact confirmation server-side before deleting the Supabase Auth user. Existing FK actions cascade profile/session records and anonymize nullable historical references.
- User table columns for username/name, email, role, access status, registration date, and context-appropriate actions. Admin/owner accounts are protected from customer controls; no administrator can be disabled or deleted through this UI.

**Before this update can work in production:** apply `supabase/migrations/20261112150000_add_safe_user_management_status.sql`, then deploy `secure-bluepeak-admin` from this archive so its new server-side actions are active. Publish the Vercel files via the user's GitHub workflow. GitHub upload alone does not run Supabase migrations or deploy Supabase Edge Functions. No migration has been applied by this archive-building task.

Existing database RLS is unchanged. All access mutations use the server-side service-role client inside the Edge Function after user JWT, admin role, AAL2, and active admin-session verification. Never expose `SUPABASE_SERVICE_ROLE_KEY` in Vercel/browser code, GitHub, or the ZIP.

## Source and dependencies

This is a vanilla HTML/CSS/JavaScript project. `index.html` contains the customer terminal; standalone scripts implement scanning and access UI. `api/gateway.js` is the Vercel serverless gateway. `supabase/` contains Edge Function source, CLI configuration, and SQL migrations. Fonts and the preview image are local. `package.json` requires Node.js 20+ and has no NPM runtime dependencies; Supabase Edge Function imports are version-pinned.

## Routes

- `/` — customer sign-in/landing screen when signed out; role-aware redirect when signed in.
- `/login` — direct customer sign-in page, independent of an existing session.
- `/app` — protected customer terminal.
- `/admin` — administrator sign-in; a valid AAL2 admin goes to `/admin/dashboard`. A buyer session still sees the admin sign-in page rather than being sent away.
- `/admin/dashboard` — protected admin dashboard.
- `/admin/users` — protected customer-account management.
- `/app/admin` — compatibility redirect.

All requests pass through the Vercel gateway. Protected HTML, scripts, and APIs require server-verified sessions and roles. Admin pages/actions require an approved admin, AAL2, and a live admin-session record. Browser session tokens are Secure, HttpOnly cookies. Supabase Auth stores password hashes.

## Local development

Use Node.js 20+, internet access, the Vercel CLI, and the Supabase CLI for backend operations. Plain `python -m http.server` bypasses the gateway and is not an auth test.

```sh
npx --yes vercel login
npx --yes vercel link
npx --yes vercel dev
```

Select the existing `bluepeak-terminal` Vercel project. For Supabase CLI operations, authenticate locally and link the existing project; never put credentials in this archive or chat.

## Tests

From the project root:

```sh
node test-gateway-auth.js
node test-admin-user-management.js
node test-pattern-scanner.js
node test-asset-scanner.js
node test-v1.js
```

Also run syntax checks:

```sh
node --check api/gateway.js
node --check admin-portal.js
node --check test-gateway-auth.js
node --check test-admin-user-management.js
```

The new account-state tests exercise enable/disable/soft-delete transition rules, data preservation, owner/self/last-admin protection rules, exact confirmations, and static authorization/session/FK contracts. Browser-emulation checks use mocked identities and APIs; they do not authenticate with a real customer or admin account or modify production user data.

## Manual release checklist

1. Upload the archive's files to the existing GitHub repository, preserving paths. Do not upload secrets.
2. Apply the additive database migration against the existing Supabase project after checking migration history:
   ```sh
   supabase link --project-ref ivpzznjunvxdfnpzggxp
   supabase migration list
   supabase db push
   ```
3. Deploy the Edge Function with its colocated helper module:
   ```sh
   supabase functions deploy secure-bluepeak-admin
   ```
   Confirm the existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` function secrets remain set in Supabase. Do not put service-role values in GitHub/Vercel browser code.
4. Wait for Vercel's Git deployment to become READY/PROMOTED.
5. Privately verify an authorized admin can disable and re-enable a test buyer, that re-enabled sign-in works with existing credentials, and that soft delete/purge behave as described. Do not share passwords or TOTP codes in chat.
6. Verify buyers/admins/owner permissions, direct API denials, audit entries, and the scanner/customer terminal. Never test destructive actions on the owner or last admin.

The new migration is additive: it adds soft-delete metadata and the `deleted` profile status; it does not remove records, change RLS, or grant browser database access. `Delete User` is recoverable soft deletion. Permanent purge is owner-only and irreversible.

## Secrets and safety

`SUPABASE_ANON_KEY` is the public/publishable key required by the server gateway; the service-role key is server-only. Use ignored `.env.local` only for local development. Never place `.env` files, passwords, API tokens, service-role keys, or local deployment credentials in the repository/archive. Keep RLS enabled and do not grant clients direct profile/session/audit table access.

Market data is public exchange data. Pattern output is historical detection, not a trading signal or guarantee. No wallet connection or signing is used; user-added wallet addresses are queried through Blockscout. Nothing in the application executes orders.
