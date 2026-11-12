# Deployment and synchronization next steps

## Current source/deployment status

The source package is based on user-pushed `main` commit `6bc0efe8f49c22f3ab3408b11db523d1b8e947f2`. The repository owner will manually upload the new ZIP contents; this assistant will not push. The prior Vercel deployment remains active until that upload triggers a new build. Supabase `secure-bluepeak-admin` is ACTIVE version 5 with direct-delete/reuse behavior.

## 1. Upload the source

Extract `BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip` and upload repository-root contents to the existing GitHub repository, preserving paths. Do not upload `.git`, `.env`, service-role secrets, passwords, access tokens, or local deployment metadata.

## 2. Database status

Both required migrations are applied in the linked production project:
- `20261112150559_add_safe_user_management_status`
- `20261112152724_detach_admin_audit_actor_on_auth_delete`

The latter snapshots existing audit actor IDs/names/emails, allows the actor FK to become NULL on Auth deletion, and prevents historical audit actor references from blocking account deletion. Auth deletion cascades profile/application/Auth sessions and nullable historic target references are detached. For a separate environment, check migration history and apply the included SQL before deploying the Edge Function.

## 3. Supabase function status

The updated function is already deployed to project `ivpzznjunvxdfnpzggxp` as ACTIVE version 5. If future code changes require redeployment, deploy the function with its colocated helper:

```sh
supabase link --project-ref ivpzznjunvxdfnpzggxp
supabase migration list
supabase functions deploy secure-bluepeak-admin
```

Keep `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` only in their appropriate server-side Supabase/Vercel configuration. Never include actual secret values in GitHub, browser code, or this ZIP.

## 4. Wait for Vercel and privately verify

Wait until the deployment for the manual upload is READY/PROMOTED. Then use an authorized AAL2 administrator and disposable buyer to verify disable/enable, direct deletion, immediate table removal, and recreation with the same username/email. Check API denial, audit records, owner/self/last-admin protection, mobile/desktop layout, and scanner regressions. Do not share credentials/TOTP codes or test deletion against the owner/last admin/real customers.

The previously soft-deleted test identity `saaaaaddKhan112` / `saaaaaddkhan112@users.bluepeak.invalid` has already been purged from production under the user's explicit request. Verification found no remaining Auth row, profile, or application session; its identifier is available. No replacement account was created.
