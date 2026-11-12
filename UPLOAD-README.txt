BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE

This is a complete source archive, not a small patch. Extract it and upload the files/directories while preserving the repository-root paths. Do not include .git metadata or local secrets.

Release order:
1. Upload/push the GitHub source files yourself.
2. Review and apply supabase/migrations/20261112150000_add_safe_user_management_status.sql against the existing Supabase project (check migration history first).
3. Deploy Supabase Edge Function secure-bluepeak-admin from its directory so user-management-rules.mjs is bundled: supabase functions deploy secure-bluepeak-admin.
4. Wait for Vercel to deploy the new GitHub commit.
5. Test privately with an authorized AAL2 administrator and disposable buyer account.

GitHub/Vercel deployment alone does not apply the database migration or deploy Supabase Edge Functions unless your CI explicitly performs those steps. Existing server-side Supabase secrets must remain configured. The archive contains no actual secret values, customer data, passwords, tokens, or Git credentials.

Delete User performs a confirmed soft delete and retains profile/related records. Only the designated owner can permanently purge a soft-deleted buyer, with a separate exact typed confirmation. Never test against the owner or last administrator.

Validated locally: Node regression suites, JavaScript syntax checks, Edge Function TypeScript bundling, and mocked Playwright Active → Disabled → Active → Deleted → Purged UI flow. No production user was modified; real authenticated Supabase operations remain a manual post-deployment acceptance test.
