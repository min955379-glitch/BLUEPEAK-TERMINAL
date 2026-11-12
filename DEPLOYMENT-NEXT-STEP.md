# Deployment and synchronization next steps

## Current source/deployment status

The repository base for the new user-management archive is remote `main` commit `2f6cdd5`. The new enable/disable/soft-delete/owner-purge files are prepared for manual upload; this agent will not push. Existing Vercel production and Supabase `secure-bluepeak-admin` do not yet include these new actions. The schema migration below is pending and was not applied during this work.

## 1. Upload the source

Extract `BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip` and upload its repository-root contents to the existing GitHub repository, preserving file paths. Do not upload `.git`, `.env`, service-role secrets, passwords, access tokens, or local deployment metadata. Verify the intended `main` commit contains the files before continuing.

## 2. Apply the additive Supabase migration

Against the existing project only, first inspect migration history. Then apply:

`supabase/migrations/20261112150000_add_safe_user_management_status.sql`

This migration adds soft-delete metadata and allows the `deleted` profile status; it does not delete current user data or alter RLS. Do not run `supabase db push` against an unverified project.

## 3. Deploy the Supabase admin function

The updated Edge Function imports a local helper file; deploy from the repository with Supabase CLI so both files are bundled:

```sh
supabase link --project-ref ivpzznjunvxdfnpzggxp
supabase migration list
supabase db push
supabase functions deploy secure-bluepeak-admin
```

Confirm the existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` Supabase function secrets are still configured. Never paste service-role values into GitHub, Vercel client code, or chat.

## 4. Wait for Vercel

Wait until the Git-linked Vercel production deployment for the uploaded commit is READY/PROMOTED. Verify `/admin`, `/admin/dashboard`, and `/admin/users` before using account controls.

## 5. Private acceptance checks

Use an authorized AAL2 admin and disposable buyer account. Verify disable, denied login/API/existing session, enable with existing password and preserved profile data, soft delete and Disabled/Deleted statuses, owner-only purge, FK cleanup, audit records, customer-denial of admin APIs, and owner/self/last-admin protection. Check mobile/desktop layout and customer scanner afterwards. Do not share credentials or TOTP codes in chat.

## Secrets

The Vercel gateway uses `SUPABASE_ANON_KEY` server-side. Supabase `SERVICE_ROLE_KEY` remains only in Edge Function secrets. No secret values belong in the archive.
