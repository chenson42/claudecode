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

- [ ] `/test` + `/test-results` skills port — in progress (doc-only)
- [ ] Push `feat/post-login-routing-and-e2e` (2 commits ready, awaiting `/pre-push` + user push) and open the PR
- [ ] Per-account login lockout — Phase 4 complete (implementation done), advancing to qa Phase 5 — `docs/work-log/2026-07-01-account-lockout.md`
- [ ] `check:sql-date` tripwire — Phase 1 complete (READY WITH NOTES), advancing to architect Phase 2 — `docs/work-log/2026-07-01-sql-date-tripwire.md`
- [ ] `cache()`-wrap `isFlagEnabled` + (pending empirical check) `cachedAuth` — Phase 1 complete (READY WITH NOTES) — `docs/work-log/2026-07-01-flag-caching.md`
- [ ] Opportunistic expired-token GC — Phase 1 complete (READY WITH NOTES), advancing to architect Phase 2 — `docs/work-log/2026-07-01-token-gc.md`
- [ ] `auth.local_login` + `auth.require_2fa` admin flags — Phase 1 complete (READY WITH NOTES), advancing to architect Phase 2 — `docs/work-log/2026-07-01-auth-mode-flags.md`

## Next Up

- [ ] Mobile (360px) visual pass on global nav + member home — Phase 6 follow-up, post-login-routing work-log

## Backlog

- [ ] Turnstile CAPTCHA component (no-op until keyed) for `/signin` + `/forgot-password` — harvest Tier 2 #12
- [ ] Audit log viewer under /admin/audit — display ip, user_agent, actorEmail, metadata per row; filter by action and date range — follow-up, record-audit-helper work-log
- [ ] Tier 4 utilities on demand (csvCellSafe, ssrf-guard, magic-bytes, maskEmail, settings store, ConfirmDialog, iconKey nav, cf-connecting-ip, route-table 2FA gate, …) — harvest Tier 4
- [ ] `(email-verify)` route group has no `error.tsx` — non-23505 throws in `verify-email/[token]/page.tsx` surface as a raw 500 — follow-up from `isUniqueViolation()` Phase 2 — `docs/work-log/2026-07-01-unique-violation-helper.md`
- [ ] Admin queue viewer under /admin/email-queue — display status, recipient, subject, attempt count, last error per row; filter by status and date range. Needs `admin.email_queue` permission when built — follow-up, email-queue work-log
- [ ] Resend delivery webhook (Svix-verified webhook to update email_queue row status from `sent` to `delivered` or `bounced`) — harvest Tier 2 #7 optional pair, email-queue work-log
- [ ] Member-visible what's-new / changelog — V2 loop-closure: surface delivered feedback-sourced features to members (requires a member-facing surface for release notes, currently admin-only); tracked as follow-up from feedback-dev-loop pipeline — `docs/work-log/2026-07-01-feedback-dev-loop.md`
- [ ] TOTP enrolment e2e — requires either a seeded deterministic TOTP secret (security risk — see routing feature option (c) rationale, e2e-auth-infra work-log Phase 2 Ruling 7) or external authenticator integration; deferred until a safe pattern is designed
- [ ] Admin lock-state visibility in /admin/users — show `lockedUntil` per user row; add manual unlock action — follow-up, account-lockout Phase 2 ruling R8
- [ ] E2E test-data hygiene for feedback: rows submitted during e2e runs persist in the dev DB with status='new', causing the SessionStart hook to fire a banner for test artifacts on every session; add afterAll cleanup in `e2e/feedback.spec.ts` or truncate in `e2e/support/global-setup.ts` — Phase 6 follow-up, feedback-dev-loop work-log

## Done

- [x] 2026-07-01 — Process batch: `docs/ui-standards.md`, `downstream-sync` skill, QA feature-gate table + no-self-agreeing-mocks, force-push guardrail (Rule 11 + deployment-engineer), `/pre-push` CVE step, database-admin `onDelete` rule, api-developer email-escape rule, TODO ledger (Rule 10) — harvest Tier 3 #16-20, #23 (instructions)
- [x] 2026-07-01 — BUG-1: verify-email `db.transaction()` on neon-http → `db.batch()` — SHIP IT — `docs/work-log/2026-07-01-verify-email-neon-http-transaction.md`
- [x] 2026-07-01 — BUG-2: 2FA fresh-recovery-codes cookie deleted during RSC render — SHIP IT — `docs/work-log/2026-07-01-2fa-fresh-codes-rsc-cookie.md`
- [x] 2026-07-01 — BUG-3: first-time Google OAuth sign-in gets AccessDenied — SHIP IT — `docs/work-log/2026-07-01-oauth-first-signin-accessdenied.md`
- [x] 2026-07-01 — BUG-4: NextAuth `trustHost` unset — OAuth hard-blocked off-Vercel — SHIP IT — `docs/work-log/2026-07-01-nextauth-trusthost.md`
- [x] 2026-07-01 — Post-login routing + member home + global nav + e2e hardening — SHIP IT, committed `18f04a7`
- [x] 2026-07-01 — Sibling harvest of 7 fork repos → classified punch-list — committed `4c54e4f`
- [x] 2026-07-01 — recordAudit() helper (audit ip/user_agent, request-ip.ts shared module, logAttempt elimination) — SHIP IT — `docs/work-log/2026-07-01-record-audit-helper.md`
- [x] 2026-07-01 — isUniqueViolation() helper (verify-email ErrorCard, password-reset atomic upsert) — SHIP IT — `docs/work-log/2026-07-01-unique-violation-helper.md`
- [x] 2026-07-01 — E2E auth infra (cached storageState, role boundaries, DB isolation guard) — SHIP IT — `docs/work-log/2026-07-01-e2e-auth-infra.md`
- [x] 2026-07-01 — Durable email queue with retry (persist-first enqueue, cron worker, vercel.json) — SHIP IT — `docs/work-log/2026-07-01-email-queue.md`
- [x] 2026-07-01 — In-app feedback + dev-loop triage wiring — SHIP WITH NOTES (FU-1: e2e test-data hygiene) — `docs/work-log/2026-07-01-feedback-dev-loop.md`
- [x] 2026-07-01 — Report-only CSP + HSTS preload removal — SHIP IT — `docs/work-log/2026-07-01-security-headers.md`
- [x] 2026-07-01 — ACCESS_DENIED audit event on /access-pending bounce — SHIP IT — `docs/work-log/2026-07-01-access-denied-audit.md`
