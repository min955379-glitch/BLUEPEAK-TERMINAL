# Source archive inventory

This archive contains the current BluePeak Terminal project source, not a compiled/static export. The top-level folder inside the ZIP is `BLUEPEAK-TERMINAL/`.

## Included

- Static application UI and design: `index.html`, protected admin pages, favicon, preview artwork, and licensed local font files.
- Browser JavaScript: pattern scanner, watched-asset adapter, secure customer access UI, and administrator portal code.
- Server-side Vercel routing/authentication: `api/gateway.js` and `vercel.json`.
- Supabase source: all four Edge Functions, Supabase CLI configuration, the four SQL migrations recorded in the current project's migration ledger, and setup notes.
- Tests: gateway authorization/session regression suite and scanner test suites.
- Project documentation, Node manifest, `.gitignore`, and safe `.env.example`.

## Project format and dependencies

This is vanilla HTML/CSS/JavaScript with a Node.js serverless gateway; it does not use React or Next.js. `package.json` requires Node.js 20+ and has no NPM runtime dependencies, so an NPM lockfile is not applicable. Supabase Edge Function dependencies are version-pinned in their import statements.

## Deliberately excluded

- Actual `.env` files, passwords, API tokens, service-role keys, and other secrets.
- `.vercel/` account/project-local CLI metadata; use `vercel link` after extracting if needed.
- `node_modules`, build output, caches, temporary files, unrelated browser screenshots, and older duplicate/legacy source copies from the workspace root. The current canonical versions are included under their project paths.

The SQL migrations contain schema only, no user records. No migration was run while building this archive. Review the Supabase project link and migration status before using the CLI against any database.
