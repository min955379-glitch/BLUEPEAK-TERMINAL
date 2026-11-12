# BluePeak Scalp Terminal

BluePeak is a read-only crypto-market terminal with an 18-asset watchlist, charts, public market monitoring, historical pattern detection, and a V1 trend-continuation scanner. It does not place trades, handle funds, predict prices, or give trading advice.

## Application areas

- **Customer terminal:** approved customers sign in with the exact username or email and password provisioned for them.
- **Administrator portal:** a separately provisioned administrator signs in at `/admin` using password and TOTP authenticator verification (AAL2). The portal at `/admin/dashboard` and `/admin/users` can create accounts, reset passwords, disable/re-enable access, and permanently delete customer accounts.

## Latest user-management update (manual GitHub upload)

- **Disable access:** blocks customer access, revokes BluePeak sessions, and applies a Supabase Auth ban. Protected website/API requests continue to enforce profile/session state server-side.
- **Enable access:** removes the Auth ban and restores the existing account, password, profile, and related data. Old sessions remain revoked; the customer signs in again.
- **Delete User:** after an explicit confirmation naming the user and email, the Edge Function deletes the Supabase Auth identity. Auth foreign keys cascade-delete the profile, `bp_active_sessions`, and Auth sessions; nullable history/audit references are detached (`SET NULL`). The audit snapshot stores the deleted username/email as plain detail fields. Deleted users are omitted from the table, and identifiers are immediately reusable.
- **Legacy deleted rows:** while creating a user, the server finds matching soft-deleted buyer profiles by username or normalized email, permanently removes those stale Auth/profile records, verifies cleanup, then creates the replacement. Active accounts and owner/admin identities remain protected conflicts.
- Disable/enable and deletion remain server-side and require a valid authenticated administrator, AAL2/MFA, active admin session, exact confirmation, and self/owner/admin protections. The owner identity `owner` / `min955379@gmail.com` cannot be deleted through customer controls.

The earlier migration `20261112150000_add_safe_user_management_status.sql` remains applied for legacy rows. This update adds `20261112152724_detach_admin_audit_actor_on_auth_delete.sql`: it snapshots existing audit actors into JSON details, then changes the audit-actor FK to `ON DELETE SET NULL` so historical audit rows cannot block account deletion. Existing profile/session cascades and nullable historical references were verified. The new migration is applied in the linked production project, and `secure-bluepeak-admin` is deployed as ACTIVE version 5. GitHub/Vercel deployment alone does not deploy Supabase Functions.

Existing database RLS is unchanged. All access mutations use the server-side service-role client inside the Edge Function after JWT, admin role, AAL2, active admin-session, and target checks. Never expose `SUPABASE_SERVICE_ROLE_KEY` in Vercel/browser code, GitHub, or the ZIP.

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

The account-management tests exercise enable/disable safeguards, direct Auth/profile/session deletion, list filtering, legacy soft-deleted collision cleanup, same-identifier reuse policy, owner/self/last-admin protections, confirmations, and authorization/session/FK contracts. Browser-emulation checks use mocked identities and APIs; they do not authenticate with a real customer or admin account or modify production user data.

## Manual release checklist

1. Upload the archive's files to the existing GitHub repository, preserving paths. Do not upload secrets.
2. Confirm migration history includes `20261112150559_add_safe_user_management_status` and `20261112152724_detach_admin_audit_actor_on_auth_delete`. Both are already applied in the linked production project; on any other intended deployment, inspect history and apply the included migrations before using the function.
3. The updated Edge Function is already deployed to the linked Supabase project (ACTIVE version 5). If you deploy it again later, include `user-management-rules.mjs` by running `supabase functions deploy secure-bluepeak-admin` from the repository. Keep all service-role values exclusively in Supabase function secrets.
4. Wait for Vercel's Git deployment to become READY/PROMOTED.
5. Privately verify an authorized admin can disable/re-enable a disposable buyer and delete/recreate a disposable buyer with the same username/email. The specifically requested old test user has been removed and its identifiers are free; no replacement account was created by this agent. Do not share passwords or TOTP codes in chat.
6. Verify buyers/admins/owner permissions, direct API denials, audit entries, and the scanner/customer terminal. Never test destructive actions on the owner or last admin.

`Delete User` is an immediate, irreversible Auth/profile/session deletion after confirmation. Disable/Enable remains the recoverable suspension path. No new migration changes RLS or grants browser database access.

## Secrets and safety

`SUPABASE_ANON_KEY` is the public/publishable key required by the server gateway; the service-role key is server-only. Use ignored `.env.local` only for local development. Never place `.env` files, passwords, API tokens, service-role keys, or local deployment credentials in the repository/archive. Keep RLS enabled and do not grant clients direct profile/session/audit table access.

Market data is public exchange data. Pattern output is historical detection, not a trading signal or guarantee. No wallet connection or signing is used; user-added wallet addresses are queried through Blockscout. Nothing in the application executes orders.
