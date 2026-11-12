# BluePeak Terminal — Roadmap

## Current release: institutional UI and account-management upgrade

### Implemented in this worktree
- Shared high-contrast dark/light navy-ivory-gold tokens; theme toggles and persistent dark-default preference across terminal/admin/sign-in; chart canvas reads active theme; form, select/option, placeholder, badges, and primary-button contrast improved. Local contrast audit confirms tested text pairs and zero green-family production color literals.
- Customer/admin sign-in styling that preserves the existing server-side auth, reset, and MFA/AAL2 flows.
- Customer terminal compatibility styling and scanner access/session-expiry handling; no legacy Admin panel or device-only sign-out controls are added.
- Admin KPI strip, user provisioning/password generation and copy controls, live password requirements, user search/filter/counts, skeleton loading, stacked toasts, confirmation dialogs, keyboard navigation, and audit feed.
- Immediate single-step Auth/profile/session deletion, immediate identifier reuse, stale soft-deleted buyer cleanup, and protected owner/self/last-admin rules.
- AAL2-only server-side audit listing and existing service-role/RLS boundaries.

### Production backend status
- Soft-deleted buyer cleanup migration `20261112160047_purge_legacy_soft_deleted_buyers` is applied. Zero legacy soft-deleted buyers remained at preflight; post-migration checks confirm zero.
- `secure-bluepeak-admin` is ACTIVE version 8. Earlier requested account cleanup remains verified: no Auth/profile/linked app-session identity remains; audit history was preserved.
- The stricter email-validation update exists in the current source but has not yet been deployed to Supabase.
- Existing status and audit-FK migrations are applied. The linked production project is Supabase `ivpzznjunvxdfnpzggxp`.

### Deployment and remaining acceptance
- The previously uploaded source is on GitHub at commit `d2fdc3b27b67b7a4710274b324bc44bf2dde27c1`; Vercel deployment `dpl_AbXrMpuxXipHTCfSF8GPtf118EeL` is READY/PROMOTED for it. The latest dual-theme/contrast changes are local only and have not been uploaded or deployed.
- The refreshed `BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip` archive includes the local changes and is integrity-checked; regression and contrast suites pass.
- Public production smoke checks pass; protected routes remain gated and unauthenticated `POST /api/admin` returns 401.
- Signed-in customer/admin production visual verification in both themes and authenticated admin workflows are unverified. No supplied customer credential was used. After owner upload/deployment, privately test with authorized accounts; use disposable identities for destructive admin acceptance and avoid the owner, last-admin, and real customers.

## Ongoing platform maintenance
- Keep vanilla HTML/CSS/JS and the Node gateway/Supabase architecture; do not convert to a framework or add an external CSS framework.
- Preserve protected page/API routing, Supabase Auth, MFA/AAL2, RLS, and service-role isolation.
- Continue scanner and mobile-layout regression coverage; all current Node suites pass.
- Keep deployment and migration documentation aligned with the exact versions running in each environment.
