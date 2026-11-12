# Deployment and synchronization next steps

## Vercel

The project is linked to the existing `bluepeak-terminal` Vercel project. The latest admin routing and username/email identifier changes are in this package but have not been deployed. The matching Supabase schema migration (`supabase/migrations/20261112124634_allow_email_identifiers.sql`) has been applied through the Supabase migration tool. Supabase currently reports `secure-bluepeak-admin` version 2 active, while `secure-bluepeak-auth` remains version 1; the auth update is not confirmed. The Vercel gateway/source still needs deployment. Once signed in to Vercel CLI on the deployment computer, run from the project root:

```sh
npx --yes vercel deploy . --prod --yes
```

Confirm READY/PROMOTED, then test `/`, `/login`, `/admin`, `/admin/dashboard`, `/admin/users`, `/app`, and `/app/admin` with signed-out, customer, and administrator sessions; verify username and email create/login using controlled test accounts. Current live checks show `/login` returns 404 in the current production source; signed-out customer/admin access guards otherwise return their expected redirects. Do not tell users the portal is fixed until the new version is deployed and real-browser checks pass.

## GitHub

The repository is `https://github.com/min955379-glitch/BLUEPEAK-TERMINAL`, branch `main`. The last observed remote commit is `9583b209f29698c8fa65ba8843ea5ab406a54c69`. GitHub connector support is unavailable in this workspace; no commit or push has been made. Use an authenticated GitHub CLI or Git for Windows login locally, review `git status` and the diff, then push the reviewed changes. Do not share a token or password in chat.

## Secrets

The gateway requires `SUPABASE_ANON_KEY`; Vercel currently has it configured as an encrypted variable for production, preview, and development. It is the Supabase anon/publishable key, not a service-role credential. For local linked development, pull environment variables with `npx --yes vercel env pull .env.local`; `.gitignore` excludes `.env.local`. `.env.example` contains only variable names and empty values. Keep service-role credentials in Supabase Edge Function secrets, never in GitHub or browser code.
