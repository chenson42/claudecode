# Functionality Map

A scannable inventory of everything built in the Claude Code Starter, so a session
knows what exists without re-reconning. **Version `0.6.0` · surveyed 2026-07-12.**

This is a MAP, not documentation — one line per capability, with the primary file as
a jump-off point. When it drifts from reality, fix it (Workflow Rule 14). Forks: this
map describes the features you inherited; extend it as you build on top.

---

## Index (short — for the session hook)

- **Public / Auth** — landing page, sign-in (Google OAuth + credentials, Turnstile-guarded, lockout-aware), TOTP 2FA verify + trusted device, forgot/reset password, email-change verify landing, access-pending.
- **Member** — post-login `/home` (greeting, roles/features, what's-new card, daily feedback prompt), `/whats-new` full list, feedback submit/snooze/opt-out actions.
- **Account (self-serve)** — profile name, email change + re-verification, password change, per-user TOTP enrolment/manage at `/account/2fa`, delete-account skeleton, permanent feedback form.
- **Admin (`/admin`)** — users + roles (+ lock badge/unlock), feature flags, release-notes docs viewer, org 2FA tools, audit viewer, feedback triage, what's-new CRUD, email-queue viewer + retry.
- **Auth backend** — NextAuth 5 config, cached session, safe callbackUrl, lockout, sign-in gate, local-login flag, session projection; edge gate `src/proxy.ts` (admin + 2FA).
- **Platform lib** — permissions (`FEATURES` + `hasFeature`), flags (`isFlagEnabled`, cached), `recordAudit()`, TOTP crypto + pending enrolment, rate limiting, request-ip, Turnstile, email queue (persist-first + retry + Resend webhook) with `escapeHtml`.
- **API / Cron** — NextAuth routes, Resend delivery webhook, `CRON_SECRET`-gated email-queue worker + daily maintenance (token GC).
- **Flags** — `demo.new_dashboard`, `auth.local_login` (OAuth-only switch), `auth.require_2fa` (org 2FA switch) — both auth flags fail-open.
- **Dev-loop tooling** — SessionStart hooks (feedback count, functionality-map index), commit-msg hook + escape-rate stats, `check:audit` + `check:sql-date` tripwires, seed script, Marp deck, 11 e2e suites.

---

## Public / Auth

- Landing page — public marketing stub. `src/app/page.tsx`
- Sign-in — Google OAuth + credentials, Turnstile, lockout-aware, safe `callbackUrl` → `/home`. `src/app/(auth)/signin/page.tsx`, `actions.ts`
- TOTP verify — code entry + trusted-device cookie; enrolment redirect two-hop (proxy → `/totp` → `/account/2fa`). `src/app/(auth)/totp/page.tsx`, `actions.ts`
- Forgot/reset password — request link + consume token (hashed at rest, enumeration-safe). `src/app/(password-reset)/forgot-password/page.tsx`, `reset-password/page.tsx`, `actions.ts`
- Email-change verify — token landing with error boundary. `src/app/(email-verify)/account/verify-email/[token]/page.tsx`
- Access-pending — authenticated, no roles; writes `ACCESS_DENIED` audit on bounce. `src/app/access-pending/page.tsx`

## Member

- Home — greeting, roles/features summary, global nav (conditional Admin link), what's-new card, daily feedback prompt card (UTC-read/local-write, DECISION-023). `src/app/(member)/home/page.tsx`, `feedback-prompt-card.tsx`
- What's-new — full entry list, newest-first. `src/app/(member)/whats-new/page.tsx`
- Feedback actions — submit / snooze / opt-out (rate-limited; per-user prompt state, one column per upsert). `src/app/(member)/feedback/actions.ts`

## Account (self-serve)

- Account page — display name, email change (re-verify), password change, delete skeleton, permanent feedback form. `src/app/(account)/account/page.tsx`, `actions.ts`
- Per-user 2FA — QR enrolment, verify, recovery codes, disable. `src/app/(account)/account/2fa/page.tsx`, `actions.ts`

## Admin (`src/app/(admin)/admin/`)

- Dashboard — subpage links; `demo.new_dashboard` flag demo. `admin/page.tsx`
- Users — list + role assignment, lock badge + unlock (audited). `admin/users/page.tsx`, `users/[id]/page.tsx`, both `actions.ts`
- Feature flags — toggle + rollout percent. `admin/flags/page.tsx`, `actions.ts`
- Docs — release-notes markdown viewer (`docs/release-notes/vX.Y.md`). `admin/docs/page.tsx`
- Org 2FA tools — enrolment reset etc. (relies on proxy edge gate — see 2026-07-11 security M5). `admin/2fa/page.tsx`, `actions.ts`
- Audit viewer — filter by action/actor, pure RSC. `admin/audit/page.tsx`; helpers `src/lib/audit-page-helpers.ts`
- Feedback triage — status new→triaged→done/declined; renders bodies as plain text (hostile-content invariant). `admin/feedback/page.tsx`, `actions.ts`
- What's-new CRUD — list+create, edit, delete; HTML-reject validation. `admin/whats-new/page.tsx`, `[id]/page.tsx`, `actions.ts`
- Email-queue viewer — send status, delivery status, retry. `admin/email-queue/page.tsx`, `actions.ts`

## Auth backend & edge

- NextAuth 5 config — Google OAuth + credentials, JWT sessions with roles/features/2FA claims. `src/auth.ts`, `src/lib/auth/config.ts`, `session-projection.ts`
- Cached auth — `cache()`-wrapped `auth()`/flags (one SELECT per request). `src/lib/auth/cached-auth.ts`
- Safe callback — same-origin path check, `/home` fallback. `src/lib/auth/safe-callback.ts`
- Lockout — 5 failures → 15-min DB lock, enumeration-safe, OAuth-exempt. `src/lib/auth/lockout.ts`
- Sign-in gate + local-login flag — credentials gating incl. `auth.local_login` OAuth-only mode. `src/lib/auth/sign-in-gate.ts`, `local-login.ts`
- Edge route gate — auth + 2FA on `/admin/*` (Edge runtime; must not import `@/lib/db`). `src/proxy.ts`

## Platform lib (`src/lib/`)

- Permissions — `FEATURES` catalog (`admin.dashboard/users/flags/release_notes/feedback/audit/email_queue/whats_new`) + `hasFeature()`. `permissions.ts`
- Flags — `isFlagEnabled()` env toggles + rollout, request-cached. `flags.ts`
- Audit — `recordAudit()` (actor, IP, user-agent) + `AUDIT_ACTIONS` catalog. `audit.ts`; IP extraction `request-ip.ts`
- TOTP — AES-GCM encrypt/decrypt + verify (`AUTH_TOTP_ENCRYPTION_KEY`); pending-enrolment store. `two-factor.ts`, `totp-pending.ts`
- Rate limiting — in-memory sliding window (Upstash env swap-in). `rate-limit.ts`
- Turnstile — endpoint-level CAPTCHA verify, no-op until keyed. `turnstile.ts`; widget `src/components/shared/turnstile.tsx`
- Email — durable queue (persist-first, backoff retry, Resend delivery webhook), `escapeHtml()`. `email/queue.ts`, `send.ts`, `escape-html.ts`
- DB — Drizzle + Neon; schema is source of truth; unique-violation helper. `db/schema.ts`, `db/errors.ts`
- Shared UI — `<FormattedDate>` (TZ-safe, ESLint-enforced), `<FeedbackForm>`, global nav, fresh-recovery-codes. `src/components/shared/`

## API / Cron / Webhooks

- NextAuth handlers. `src/app/api/auth/[...nextauth]/route.ts`
- Resend delivery webhook — HMAC-verified (DECISION-028: webhooks verify own signatures under `api/webhooks/`). `src/app/api/webhooks/resend/route.ts`
- Email-queue worker — retry loop, `CRON_SECRET` Bearer. `src/app/api/cron/email-queue/route.ts`
- Daily maintenance — expired-token GC (password-reset, email-verify, pending TOTP). `src/app/api/cron/maintenance/route.ts`

## Feature flags (seeded)

- `demo.new_dashboard` — demo flag gating an admin dashboard element.
- `auth.local_login` — credentials on/off (OAuth-only mode); fail-open.
- `auth.require_2fa` — org-wide 2FA requirement; fail-open.

## Dev-loop tooling

- SessionStart hooks — feedback count (count only, never body content) + functionality-map short index. `scripts/feedback-check.mjs`, `scripts/functionality-map.mjs`
- Commit standards — prefix + `fix:` trailers enforced by git hook; 30-day escape-rate report. `scripts/commit-msg.mjs`, `stats-escape.mjs`, `install-hooks.sh`
- Tripwires — audit coverage of mutations, `sql<Date>` ban. `scripts/check-audit-coverage.mjs`, `check-sql-date.mjs`
- Seed — roles, `FEATURE_CATALOG`, demo + auth flags, seed users (admin / member / MFA-admin). `scripts/seed.ts`
- Training deck — Marp source → committed PDF. `deck/slides.md`
- E2E — 11 Playwright suites (auth, admin, member, security headers, TZ dates) with cached storageState + DB isolation guard. `e2e/`

## Schema highlights (`src/lib/db/schema.ts`)

Auth/foundation: `users`, `accounts`, `sessions`, `roles`, `userRoles`, `features`, `roleFeatures`, `featureFlags`, `auditEvents`, TOTP tables (+ pending enrolments), `emailVerificationTokens`, `passwordResetTokens`, lockout state. Product/ops: `feedback`, `feedbackPromptState`, `whatsNewEntries`, `emailQueue`.
