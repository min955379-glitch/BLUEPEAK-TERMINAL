BluePeak admin sign-in route regression fix

Patch applies to the latest pushed main commit 3850071 (Add files via upload). Replace these two files in the repository root:
1. api/gateway.js
2. test-gateway-auth.js

Behavior: a fresh /admin request shows administrator sign-in. A valid AAL2 admin session redirects /admin to /admin/dashboard. If a buyer/customer session cookie is present, /admin now still shows administrator sign-in instead of redirecting to /app; protected admin pages and admin APIs remain denied to buyers.

View Website remains a user-clicked /login link in a separate tab (target=_blank, rel=noopener noreferrer). A GET to /login does not mutate the admin cookie. Logging in as a customer in that tab will replace same-origin auth cookies, because browsers share cookies between tabs.

Verification: gateway, scanner, asset, and V1 tests pass; Playwright gateway emulation checked signed-out, buyer-cookie, and AAL2-admin routes, and the View Website popup/session-cookie behavior. No live admin credentials were used.
