# BluePeak Terminal — Roadmap

## Current release: institutional UI and account-management upgrade

### Implemented in this worktree
- Shared high-contrast dark/light navy-ivory-gold tokens and a synchronized persistent theme controller across terminal/admin/sign-in. Chart palettes resolve colors before canvas use and redraw on theme changes; requested bullish `#089981` and bearish `#F23645` candle, volume, and market price-change colors are strictly chart-specific. Zig Zag toolbar toggle includes Tight/Standard/Wide sensitivity, swing pivots and labels, and a developing leg. Non-chart positives retain existing design rules; form and dropdown contrast is audited.
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
- Repository `main` is at `17c7cb45a941cc67e41e23bac6a6fa4d53fb96ec`; all 16 application/backend source paths checked match. Release-status document edits made locally after deployment verification are not part of that push. Vercel deployment `dpl_38r8i8JdDAEcURSqPGgKGsmCM5CT` is READY/PROMOTED for that commit and owns the production alias.
- All six local regression suites, JavaScript syntax checks, and `git diff --check` pass after the chart/theme/Zig Zag updates. The complete safe 49-file ZIP has been recreated and integrity-checked; all six suites pass from the extracted archive. These changes are local and not deployed.
- Public production smoke checks pass; protected routes remain gated and unauthenticated `POST /api/admin` returns 401.
- Public production smoke checks pass for sign-in, CSS/theme assets, and protected-route behavior. Signed-in customer/admin visual verification in both themes and authenticated admin workflows are still unverified. No supplied customer credential was used. Privately test with authorized accounts; use disposable identities for destructive admin acceptance and avoid the owner, last-admin, and real customers.

## Ongoing platform maintenance
- Keep vanilla HTML/CSS/JS and the Node gateway/Supabase architecture; do not convert to a framework or add an external CSS framework.
- Preserve protected page/API routing, Supabase Auth, MFA/AAL2, RLS, and service-role isolation.
- Continue scanner and mobile-layout regression coverage; all current Node suites pass.
- Keep deployment and migration documentation aligned with the exact versions running in each environment.
