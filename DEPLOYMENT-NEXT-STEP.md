# Deployment and synchronization next steps

## Vercel

The project is linked to the existing `bluepeak-terminal` Vercel project. The latest admin routing correction is in this package but has not yet been deployed. Once signed in to Vercel CLI on the deployment computer, run from the project root:

```sh
npx --yes vercel deploy . --prod --yes
```

Confirm READY/PROMOTED, then test `/admin`, `/admin/dashboard`, `/admin/users`, `/app`, and `/app/admin` with signed-out, customer, and administrator sessions. Live HTTP checks on 2026-11-12 found `/admin/dashboard`, `/admin/users`, and `/app/admin` return 404 in current production. Do not tell users the portal is fixed until the new version is deployed and real-browser checks pass.

## GitHub

The repository is `https://github.com/min955379-glitch/BLUEPEAK-TERMINAL`, branch `main`. The last observed remote commit is `9583b209f29698c8fa65ba8843ea5ab406a54c69`. GitHub connector support is unavailable in this workspace; no commit or push has been made. Use an authenticated GitHub CLI or Git for Windows login locally, review `git status` and the diff, then push the reviewed changes. Do not share a token or password in chat.

## Secrets

The gateway requires `SUPABASE_ANON_KEY`; Vercel currently has it configured as an encrypted variable for production, preview, and development. It is the Supabase anon/publishable key, not a service-role credential. For local linked development, pull environment variables with `npx --yes vercel env pull .env.local`; `.gitignore` excludes `.env.local`. `.env.example` contains only variable names and empty values. Keep service-role credentials in Supabase Edge Function secrets, never in GitHub or browser code.
