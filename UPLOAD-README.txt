BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE

This is a complete source archive, not a small patch. Extract and upload the repository-root files/directories to the existing GitHub repository while preserving paths. Do not include .git metadata or local secrets. The repository owner performs the GitHub upload; the assistant does not push.

Release state:
1. The updated secure-bluepeak-admin Supabase Edge Function is already ACTIVE version 5.
2. Both migrations are applied to the linked production project: 20261112150559_add_safe_user_management_status and 20261112152724_detach_admin_audit_actor_on_auth_delete. The latter snapshots old audit actors and changes their FK to ON DELETE SET NULL so audit history cannot block deletion.
3. Upload the source files manually and wait for Vercel's Git deployment to become READY/PROMOTED.
4. Privately test with an authorized AAL2 administrator and a disposable buyer. The specifically named old test user was removed from production and its username/email are available; this agent did not create a replacement account.

GitHub/Vercel deployment alone does not deploy future Supabase Edge Function changes. Existing Supabase server-side secrets must remain configured; the archive contains no actual secret values, customer data, passwords, tokens, or Git credentials.

Delete User now permanently deletes the Auth/profile/session identity after explicit confirmation. The table omits deleted accounts and legacy soft-deleted buyer collisions are cleaned during creation before identifiers are reused. Disable/Enable remains reversible. Never test destructive actions against the owner, last administrator, or a real customer.

Local validation passed: all five Node test suites, syntax checks, Edge Function bundling and bundle syntax check, and git diff whitespace checks. These are not authenticated admin production tests.
