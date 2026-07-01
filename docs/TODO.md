# TODO — Backlog & Follow-Ups

The single aggregation point for open work. Work-logs track *how* a piece of work
moves through the pipeline; this file tracks *what's open* across everything.

**Reconciliation rule (Workflow Rule 10):** any commit that ships, defers, or
discovers work must update this file *in the same commit*. Phase 6 follow-ups
land here. Review punch-list items that get accepted land here. Shipped items
move to Done with the date. Claude reads this file at session start alongside
the cadence check.

Format: one line per item — `- [ ] <item> — <source/link>`. Keep it lean;
detail lives in the linked doc, not here.

---

## In Flight

- [ ] Email queue with retry — Phase 1 (analyst) — `docs/work-log/2026-07-01-email-queue.md`
- [ ] E2E auth infra (cached storageState, role boundaries, DB guard) — Phase 1 (analyst) — `docs/work-log/2026-07-01-e2e-auth-infra.md`
- [ ] `isUniqueViolation()` helper — Phase 3 next (Phase 2 Approved) — `docs/work-log/2026-07-01-unique-violation-helper.md`
- [ ] `/test` + `/test-results` skills port — in progress (doc-only)
- [ ] `recordAudit()` helper (audit ip/user_agent) — Phase 4 next (Phase 3 design complete) — `docs/work-log/2026-07-01-record-audit-helper.md`
- [ ] Push `feat/post-login-routing-and-e2e` (2 commits ready, awaiting `/pre-push` + user push) and open the PR

## Next Up

- [ ] Mobile (360px) visual pass on global nav + member home — Phase 6 follow-up, post-login-routing work-log

## Backlog

- [ ] Per-account login lockout (`failedLoginAttempts` + `lockedUntil`) — harvest Tier 2 #8
- [ ] `cache()`-wrap `isFlagEnabled`; audit duplicate `auth()` stale-check queries — harvest Tier 2 #10
- [ ] Report-only CSP headers; drop HSTS `preload` — harvest Tier 2 #11
- [ ] Turnstile CAPTCHA component (no-op until keyed) for `/signin` + `/forgot-password` — harvest Tier 2 #12
- [ ] `auth.local_login` + `auth.require_2fa` admin flags — harvest Tier 2 #13
- [ ] `check:sql-date` tripwire — harvest Tier 2 #14
- [ ] Opportunistic expired-token GC (reset + email-verification tokens) — harvest Tier 2 #15
- [ ] Audit log viewer under /admin/audit — display ip, user_agent, actorEmail, metadata per row; filter by action and date range — follow-up, record-audit-helper work-log
- [ ] `ACCESS_DENIED`/`ACCESS_GRANTED` audit events on the access-pending bounce — harvest Tier 3 #23 (code half; instruction half shipped)
- [ ] Tier 4 utilities on demand (csvCellSafe, ssrf-guard, magic-bytes, maskEmail, settings store, ConfirmDialog, iconKey nav, cf-connecting-ip, route-table 2FA gate, …) — harvest Tier 4
- [ ] `(email-verify)` route group has no `error.tsx` — non-23505 throws in `verify-email/[token]/page.tsx` surface as a raw 500 — follow-up from `isUniqueViolation()` Phase 2 — `docs/work-log/2026-07-01-unique-violation-helper.md`

## Done

- [x] 2026-07-01 — Process batch: `docs/ui-standards.md`, `downstream-sync` skill, QA feature-gate table + no-self-agreeing-mocks, force-push guardrail (Rule 11 + deployment-engineer), `/pre-push` CVE step, database-admin `onDelete` rule, api-developer email-escape rule, TODO ledger (Rule 10) — harvest Tier 3 #16-20, #23 (instructions)
- [x] 2026-07-01 — BUG-1: verify-email `db.transaction()` on neon-http → `db.batch()` — SHIP IT — `docs/work-log/2026-07-01-verify-email-neon-http-transaction.md`
- [x] 2026-07-01 — BUG-2: 2FA fresh-recovery-codes cookie deleted during RSC render — SHIP IT — `docs/work-log/2026-07-01-2fa-fresh-codes-rsc-cookie.md`
- [x] 2026-07-01 — BUG-3: first-time Google OAuth sign-in gets AccessDenied — SHIP IT — `docs/work-log/2026-07-01-oauth-first-signin-accessdenied.md`
- [x] 2026-07-01 — BUG-4: NextAuth `trustHost` unset — OAuth hard-blocked off-Vercel — SHIP IT — `docs/work-log/2026-07-01-nextauth-trusthost.md`
- [x] 2026-07-01 — Post-login routing + member home + global nav + e2e hardening — SHIP IT, committed `18f04a7`
- [x] 2026-07-01 — Sibling harvest of 7 fork repos → classified punch-list — committed `4c54e4f`
