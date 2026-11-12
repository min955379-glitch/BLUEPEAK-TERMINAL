# Complete source archive inventory

The release archive is a complete source tree for BluePeak Terminal, not a compiled/static export. Paths are relative to the repository root and preserve the existing structure.

## Included

- Customer terminal: `index.html`, scanner/access JavaScript, favicon, artwork, and local licensed fonts.
- Administrator portal: `admin-dashboard.html`, `admin-users.html`, `admin-portal.js`.
- Vercel server-side routing and file config: `api/gateway.js`, `vercel.json`.
- Supabase: Edge Function sources, including the admin user-management rules helper, CLI config, documentation, existing migrations, including the applied status and audit-actor-detachment migrations.
- Tests: gateway/auth, new user-management state/authorization, and scanner suites.
- Documentation: README, PLAN, ROADMAP, PROJECT_STATUS, deployment/security notes, and this inventory.
- `package.json` (Node.js 20+; no NPM runtime dependencies).

## Release behavior / pending configuration

The frontend/gateway changes await the repository owner's manual GitHub upload and Vercel deployment. The updated `secure-bluepeak-admin` Edge Function is already ACTIVE version 5; the status and audit-actor-detachment migrations are applied. See README, PROJECT_STATUS, and `supabase/README.md`.

## Deliberately excluded

- Actual `.env` files, passwords, API tokens, service-role values, credentials, and local Vercel metadata.
- `.git`, `node_modules`, build output, caches, temporary files, and unrelated screenshots/duplicate workspace files.

No production user records are included. The migration is additive and contains schema only.
