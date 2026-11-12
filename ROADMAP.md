# BluePeak Terminal — Roadmap

## Current release: institutional UI and account-management upgrade

### Implemented in this worktree
- Shared deep-navy, warm-ivory, muted-gold CSS token system; local Inter and JetBrains Mono; responsive semantic admin layouts; gold focus behavior; named/green-hued color ban in named UI sources.
- Customer/admin sign-in styling that preserves the existing server-side auth, reset, and MFA/AAL2 flows.
- Customer terminal compatibility styling and scanner access/session-expiry handling; no legacy Admin panel or device-only sign-out controls are added.
- Admin KPI strip, user provisioning/password generation and copy controls, live password requirements, user search/filter/counts, skeleton loading, stacked toasts, confirmation dialogs, keyboard navigation, and audit feed.
- Immediate single-step Auth/profile/session deletion, immediate identifier reuse, stale soft-deleted buyer cleanup, and protected owner/self/last-admin rules.
- AAL2-only server-side audit listing and existing service-role/RLS boundaries.

### Production backend status
- Soft-deleted buyer cleanup migration `20261112160047_purge_legacy_soft_deleted_buyers` is applied. Zero legacy soft-deleted buyers remained at preflight; post-migration checks confirm zero.
- `secure-bluepeak-admin` is ACTIVE version 8. Earlier requested account cleanup remains verified: no Auth/profile/linked app-session identity remains; audit history was preserved.
- Existing status and audit-FK migrations are applied. The linked production project is Supabase `ivpzznjunvxdfnpzggxp`.

### Release gates still pending
1. Complete and verify the ZIP archive named `BLUEPEAK-TERMINAL-USER-MANAGEMENT-UPDATE.zip`.
2. Repository owner manually uploads source to GitHub; this agent does not push.
3. Wait for Vercel's frontend/gateway deployment after that upload. The institutional UI source in this worktree is not yet claimed as deployed to Vercel.
4. The latest Vercel production deployment is READY/PROMOTED for the prior commit `a33905cb60c18e78128bcf829e7d191bf05e4c93`; wait for a new deployment after the owner uploads this worktree. Privately verify authenticated admin workflows with a real AAL2 session and disposable test users. This has not been performed; do not test with owner, last-admin, or actual customer accounts.

## Ongoing platform maintenance
- Keep vanilla HTML/CSS/JS and the Node gateway/Supabase architecture; do not convert to a framework or add an external CSS framework.
- Preserve protected page/API routing, Supabase Auth, MFA/AAL2, RLS, and service-role isolation.
- Continue scanner and mobile-layout regression coverage; all current Node suites pass.
- Keep deployment and migration documentation aligned with the exact versions running in each environment.
