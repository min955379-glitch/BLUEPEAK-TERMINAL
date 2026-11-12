BluePeak Admin Users page loading fix

Replace these files at the repository root:
- admin-portal.js
- test-gateway-auth.js

Root cause: the deployed users-page script defines loadUsers() but never calls it on initial page entry, so the HTML's static Loading… row remains. This patch starts the request on page entry, bounds admin API requests to 15 seconds, and shows a clear error with a Retry button if the request fails.

Validated with Node regression tests and Playwright browser emulation: automatic list-users request, rows rendered, error surfaced, and Retry recovered. Supabase DB/REST/Auth health returned ACTIVE_HEALTHY at check time. This patch is local only; push it and wait for Vercel production deployment before expecting it live.
