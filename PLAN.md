# BluePeak Terminal — Implementation Plan

## Objective

Maintain the read-only market terminal while delivering genuine server-enforced customer access and a distinct owner/admin portal. Keep source and operational status synchronized between the local project, Vercel, Supabase, and GitHub.

## Current release work

### A. Finish repository synchronization
1. Use the existing public repository `https://github.com/min955379-glitch/BLUEPEAK-TERMINAL` on `main` (currently observed at `9583b209f29698c8fa65ba8843ea5ab406a54c69`).
2. Overlay the latest project source and updated documentation without deleting unrelated repository files.
3. Check `git status`, review the full diff, and confirm `.env`, credentials, and local `.vercel` state are excluded.
4. Commit only the reviewed changes and push to `main` after GitHub authentication is available.
5. Verify the remote commit and that README, ROADMAP, PLAN, and PROJECT_STATUS are present.

### B. Publish the admin-routing correction
1. Deploy the updated package to the already-linked `bluepeak-terminal` Vercel project, production target.
2. Confirm deployment state READY/PROMOTED and production alias `https://bluepeak-terminal.vercel.app/`.
3. Check `/admin`, `/admin/dashboard`, `/admin/users`, `/app`, and the old `/app/admin` path while signed out, as a buyer, and as an AAL2 admin.
4. Confirm the customer scanner and normal buyer login still work.

### C. Complete browser acceptance
1. Private/incognito, signed out: landing page only; direct protected HTML, scripts and API requests denied.
2. Buyer: login reaches `/app`; admin pages/API denied; sign-out works.
3. Admin: `/admin` login with TOTP reaches `/admin/dashboard`; refresh and nav to `/admin/users` retain context; user operations work; sign-out returns to `/admin`.
4. Check browser console, network requests, redirects, trailing slash handling, and session revocation.
5. Record only observed results in PROJECT_STATUS and the release notes.

## Architecture and implementation constraints

- Static HTML/JavaScript market terminal, Vercel Node serverless gateway for route delivery, Supabase Auth + Edge Functions for identity and admin operations.
- All routes are caught by `vercel.json`; gateway uses an allowlist and server-side session/role verification. Admin routes/API require active approved profile and AAL2.
- Passwords belong to Supabase Auth's password hashing. No plaintext password storage or recovery; reset instead.
- Auth tokens are Secure/HttpOnly cookies; service-role keys remain only in Supabase secrets. Do not add secrets to GitHub or browser code.
- Preserve RLS; no customer registration route; public market feeds are not proprietary account data.

## Verification commands

```sh
node --check api/gateway.js
node --check bluepeak-access-ui.js
node --check admin-portal.js
node test-gateway-auth.js
node test-pattern-scanner.js
node test-asset-scanner.js
node test-v1.js
```

Deployment and browser verification are separate from these local checks. A passing local test is not evidence that production is fixed.
