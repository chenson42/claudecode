# Decisions Log

Architectural and implementation decisions for the Claude Code Starter. Newest first. Each decision is numbered; the number does not change once assigned.

---

## DECISION-015: `signIn` callback — drop credentials belt-and-suspenders lookup; OAuth gate uses email key

**Status:** Resolved
**Date:** 2026-07-01
**Feature:** `2026-07-01-oauth-first-signin-accessdenied` (BUG-3)

### Decision

Two sub-decisions bundled because they shape the same extracted gate function:

**1. Drop the credentials double-check in `signIn`.**
The current `signIn` callback performs a `db.query.users.findFirst({ where: eq(users.id, user.id) })` for all providers, including credentials. For credentials sign-ins this is redundant: `authorize()` already looks up the user by email, checks `!user.isActive`, and returns `null` (causing NextAuth to short-circuit before calling `signIn`) if the user is inactive. By the time `signIn` is invoked for a credentials user, `authorize()` has already validated the user and returned their real DB UUID as `user.id`. The extra lookup adds a round-trip that produces no new information. The gate function for the credentials branch returns `true` unconditionally.

Defense-in-depth is preserved by two other mechanisms: (a) `authorize()` itself checks `isActive` before returning; (b) the stale-JWT check in the `jwt` callback re-reads `isActive` on every subsequent request and returns `{}` (signout) if the row has been deactivated.

**2. OAuth branch uses verified email as the lookup key.**
Auth.js v5 runs the `signIn` callback before the adapter creates a new user row. On a first-time Google sign-in, `user.id` is Google's `sub` string (not a DB UUID), so an id-keyed lookup always misses. The fix keys the OAuth lookup off `user.email` (which Google verifies at token issuance). Logic: no row → allow (adapter will create); row with `isActive = true` → allow; row with `isActive = false` → deny.

The extracted gate function (`src/lib/auth/sign-in-gate.ts`) takes the provider name and an injected `findUserByEmail` dependency so all four branches are unit-testable without a real database.

### Deletion strategy constraint

The email-keyed gate is only sound as long as deactivated user rows remain in the database. The starter's mandated deletion strategy is **soft deactivation (`isActive = false`)** — hard-delete is prohibited. The delete-account stub (`src/app/(account)/account/actions.ts:279`) must document this constraint when it is implemented. If a future implementer chooses hard-delete, an additional guard (e.g. a `deleted_emails` blocklist) is required alongside the email-keyed check.

### Alternatives rejected

- **Keep the credentials double-check:** Rejected because it is a dead round-trip with no safety benefit beyond what `authorize()` and the JWT stale check already provide. "Belt and suspenders" is not a free call on every credentials sign-in.
- **Inline fix in `src/auth.ts` (explore.press minimal approach):** Viable but not unit-testable without mocking the Drizzle `db` object directly, which is fragile. The extracted DI'd gate follows the `safe-callback.ts` precedent already established in `src/lib/auth/`.

### Impact

- Adds `src/lib/auth/sign-in-gate.ts` with `evaluateSignIn(provider, user, findUserByEmail)`.
- Adds `src/lib/auth/sign-in-gate.test.ts` with four unit tests.
- `src/auth.ts` `signIn` callback: replace the current 8-line id-keyed lookup with a single `evaluateSignIn(...)` call.

---

## DECISION-014: Keep `drizzle-orm/neon-http`; `db.batch()` is the project convention for atomic multi-write

**Status:** Resolved
**Date:** 2026-07-01
**Feature:** `2026-07-01-verify-email-neon-http-transaction` (BUG-1)

### Decision

The DB connection (`src/lib/db/index.ts`) stays on `drizzle-orm/neon-http`. The fix for the `db.transaction()` call in the verify-email page uses `db.batch([...])`, and `db.batch()` is codified as the project-wide convention for any group of writes that must be atomic.

### Rationale

1. **Switching drivers is an architectural decision, not a bug fix.** Migrating from `neon-http` to `neon-serverless` would enable `db.transaction()`, but it changes the connection model (WebSocket vs. HTTP), affects cold-start latency, and requires a separate pooling configuration review. That work belongs in its own pipeline entry, not inside a bug fix for a single page.

2. **`db.batch()` is a correct and proven solution.** Neon executes all statements in a `db.batch()` call as a single server-side transaction — atomicity is fully preserved. The explore.press fork resolved an identical class of defect with `db.batch()` in commit `d55a165` and the fix has been running in production since 2026-06-19.

3. **`neon-http` is the right default for the starter's serverless target.** The starter ships Vercel-ready. HTTP-based connections work without WebSocket support (which some edge runtimes restrict) and need no persistent connection management. The serverless driver is the correct pick for the majority of fork deployments.

4. **Documenting the constraint as a convention prevents recurrence.** The admin actions file (`src/app/(admin)/admin/users/[id]/actions.ts:74-76`) already contains a prose comment about the constraint. Adding it to `docs/decisions.md` elevates it from a local comment to a searchable project rule.

### Convention going forward

When two or more writes must be atomic and no write depends on a mid-batch intermediate result, use:

```typescript
await db.batch([
  db.update(table).set({ ... }).where(...),
  db.delete(otherTable).where(...),
  db.insert(auditEvents).values({ ... }),
] as unknown as Parameters<typeof db.batch>[0]);
```

The `as unknown as Parameters<typeof db.batch>[0]` cast is required because Drizzle's batch type parameter is strict about element types; the double-cast is the minimal workaround consistent with explore.press's proven pattern. If a future Drizzle version relaxes the type, the cast can be removed without functional change.

When the batch list is dynamic (variable length at runtime), build the array first then cast on the `await` call — identical pattern, same cast.

### When `db.batch()` is NOT sufficient

If write N depends on a value produced by write N-1 (e.g., an insert that returns a generated ID needed by the next insert), `db.batch()` cannot be used because a batch cannot consume its own intermediate results. In that case either: (a) pre-read the needed value before the batch, or (b) switch to `neon-serverless` for that action file. Document the exception in the action file comment.

### Alternatives Rejected

- **Switch to `drizzle-orm/neon-serverless` now:** Deferred. Correct long-term option for teams that need interactive transactions with mid-write reads, but an architectural change that deserves its own pipeline entry.
- **Sequential writes (huddleup's idempotent approach):** Viable only if each write is independently safe to retry. The verify-email page's three writes are not idempotent in the same way — a second email-update after token deletion would silently succeed. `db.batch()` is strictly safer.

### Impact

- `src/app/(email-verify)/account/verify-email/[token]/page.tsx`: `db.transaction()` → `db.batch()`.
- `src/app/(admin)/admin/users/[id]/actions.ts`: comment stays as-is (it documents why NOT to use `db.transaction()`; now also references this decision by number).

---

## DECISION-013: `sanitizeCallbackUrl` extracted to shared helper; fallback changed to `/home`

**Status:** Resolved
**Date:** 2026-07-01
**Feature:** `2026-07-01-post-login-routing-and-e2e`

### Decision

`sanitizeCallbackUrl` was a private function in `src/app/(auth)/totp/actions.ts`. With the post-login routing feature, the same validation is needed in `src/app/(auth)/signin/page.tsx` (which was passing the raw `callbackUrl` searchParam unsanitized to `signIn()`). The function is extracted to `src/lib/auth/safe-callback.ts` so both callers share a single implementation.

The fallback return value changes from `/admin` to `/home` throughout (the new post-login landing). All existing callers that previously relied on `?? "/admin"` are updated to pass through `sanitizeCallbackUrl(raw)` with no manual fallback.

Function contract:
```typescript
// src/lib/auth/safe-callback.ts
export function sanitizeCallbackUrl(raw: string | undefined | null): string {
  if (!raw) return "/home";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/home";
}
```

### Rationale

1. **`signin/page.tsx` was unsanitized.** The sign-in page read `sp.callbackUrl` from the URL query string and passed it directly to `signIn("google", { redirectTo: ... })` and `signIn("credentials", { redirectTo: ... })`. NextAuth 5 beta.31 performs internal same-origin validation, but relying on undocumented beta internals for a security property is insufficient — particularly when the codebase already has an explicit sanitization function for exactly this class of attack.

2. **DRY over duplication.** The validation logic (reject `//` prefix, reject non-`/` prefix, fallback) would otherwise be duplicated across two callers. A shared helper is the obvious canonical location.

3. **Fallback to `/home` not `/admin`.** After this feature ships, the correct post-login landing is `/home`. A fallback to `/admin` is wrong for most users (who lack `admin.dashboard`) and would send them to `/access-pending` on an invalid callback. `/home` is the correct safe default.

### Alternatives Rejected

- **Leave `signin/page.tsx` unsanitized and rely on NextAuth's `redirectTo` validation:** Rejected because NextAuth 5 beta behavior is not specified in its changelog and may change between beta versions. Explicit sanitization is the safer and more consistent choice.
- **Inline the check in each caller:** Rejected because duplicated logic with independent fallback values would diverge on the next change.

### Impact

- Adds `src/lib/auth/safe-callback.ts`.
- `src/app/(auth)/signin/page.tsx`: import `sanitizeCallbackUrl`; replace `sp.callbackUrl ?? "/admin"` with `sanitizeCallbackUrl(sp.callbackUrl)`.
- `src/app/(auth)/totp/actions.ts`: remove local `sanitizeCallbackUrl` function; add import from shared location.
- `src/app/(auth)/totp/page.tsx`: replace `sp.callbackUrl ?? "/admin"` with `sanitizeCallbackUrl(sp.callbackUrl)`; add import.

---

## DECISION-012: Member home route group, global nav placement, and post-login landing invariant

**Status:** Resolved
**Date:** 2026-07-01
**Feature:** `2026-07-01-post-login-routing-and-e2e`

### Decisions

**1. Member home route:** `src/app/(member)/home/page.tsx` with a group-level layout at `src/app/(member)/layout.tsx`.

The `(member)` route group is the home for authenticated member-facing pages that are not part of the admin shell or the account settings area. `/home` is the only route in the group initially; the group name signals that future member-facing pages (a notifications page, a billing summary, etc.) belong here rather than in `(admin)` or `(account)`.

Alternatives rejected:
- Top-level `src/app/home/page.tsx` with no route group: possible but provides no layout seam to attach the global nav without the nav bleeding into unrelated routes.
- `(app)` as the group name: rejected — "app" is ambiguous in a Next.js context (`src/app/` already IS the app directory). `(member)` is explicit about the audience.

**2. Global nav component:** `src/components/shared/global-nav.tsx` — a Server Component.

Rendered only inside `src/app/(member)/layout.tsx`. It does NOT appear in:
- The root layout (`src/app/layout.tsx`) — that would bleed into signin, access-pending, and public pages.
- The admin shell layout (`src/app/(admin)/admin/layout.tsx`) — admin has its own sidebar nav; double-nav is wrong.
- The account layout (`src/app/(account)/layout.tsx`) — account has its own sidebar nav.

Server/client split: the global nav is a pure Server Component. It receives the session object from the parent layout (which calls `auth()`) and renders the conditional Admin link server-side by checking `session.user.features?.includes(FEATURES.ADMIN_DASHBOARD)`. No `useSession()` needed. No client component needed. Sign-out is implemented as an inline `"use server"` form action, identical to the pattern already used in `(admin)/admin/layout.tsx` and `(account)/layout.tsx`.

**3. `proxy.ts` changes:** None required for route protection. `/home` is not in `PUBLIC_PATHS` and not in `PROTECTION_RULES`, so it falls through to the auth-only block (line 65-77 of `proxy.ts`). Only change: update the comment at line 76 to include `/home` in the list of documented auth-only routes.

**4. Post-login landing invariant:** The default `callbackUrl` in `src/app/(auth)/signin/page.tsx` and the fallback in `src/app/(auth)/totp/actions.ts` must both change from `/admin` to `/home`. This is a load-bearing invariant: any future code that hard-codes `/admin` as a post-auth destination is wrong unless the user specifically requested the admin area. Documenting as an explicit starter invariant in CLAUDE.md.

**5. `(account)/layout.tsx` sidebar:** The "← Home" link currently points to `/`. After this feature, it should point to `/home` (the post-login landing). Tech-lead must update this link.

**6. `access-pending/page.tsx`:** Should gain a link back to `/home` after this feature ships, so users who are bounced to access-pending have an escape route. Not a blocker but must be addressed in Phase 4.

### Invariants not changed

- No new npm dependencies. Confirmed unnecessary.
- No schema change.
- The 2FA gate does not apply to `/home`. This is intentional — `proxy.ts` only enforces `twoFactorRequired && !twoFactorVerified` for `isAdminRoute` paths. The decision to NOT gate the member home behind 2FA must be stated explicitly in the Phase 3 design doc so forks that want site-wide 2FA know where to add the check.

### CLAUDE.md updates (tech-lead must carry into Phase 3)

- Project Layout section: add `(member)/home/` entry.
- Key Invariants section: add "Post-Login Landing = /home" invariant, including the proxy fall-through note.

---

## DECISION-011: Repository renamed from `claudecode` to `claudecode-nextjs-starter`

**Status:** Resolved
**Date:** 2026-05-19

**Decision:** Renamed the canonical repository from `github.com/chenson42/claudecode` to `github.com/chenson42/claudecode-nextjs-starter`.

**Rationale:** The original name had three problems:

1. **Trademark adjacency.** "Claude Code" is Anthropic's product name. A repo called `claudecode` reads as either official or as squatting — neither is intended. The new name contextualizes the brand-signal as "Next.js starter for Claude Code workflows" rather than "is Claude Code."
2. **Opacity.** A user landing on `chenson42/claudecode` had no idea what the artifact is. The new name describes it.
3. **Aging.** If Anthropic renames its product, the old repo name becomes stale; the new name still reads sensibly because "Next.js starter" carries the artifact identity.

**Alternatives considered:** `agent-sdlc-starter`, `phase-gate-starter`, `agent-pipeline-starter` — all rejected because they buried the "Claude Code" signal entirely, which would hurt discoverability for the intended audience (people searching for Claude Code workflows in a Next.js context). The chosen name balances keeping the searchable brand-signal while no longer reading as a product-name claim.

**Impact:**

- All in-repo references to `chenson42/claudecode` updated to `chenson42/claudecode-nextjs-starter` (skills, decisions, work-logs, README, deck, package.json `name`).
- `package.json` `name` field changes from `claudecode-starter` to `claudecode-nextjs-starter`. The `personalize-starter` skill's "is this still the canonical starter?" marker is updated accordingly.
- `DECISION-009`'s hardcoded `CANONICAL_URL` constant is updated; the architectural call from `DECISION-009` (hardcode rather than read from `package.json`) is unchanged.
- GitHub auto-redirects `chenson42/claudecode` → `chenson42/claudecode-nextjs-starter` forever, so existing clones, commit references, and external links keep working. The repo rename itself is a separate manual operation (via `gh repo rename` or GitHub web UI) that the user runs.

**Tradeoff:** Any future Anthropic product rename re-opens the question. The hedge is that the artifact identity ("Next.js starter") doesn't depend on the brand-signal, so a future rename would be a smaller delta than this one.

---

## DECISION-010: Commit-message standard — hook delivery, script placement, grandfather cutoff, MTTR scope

**Status:** Resolved
**Date:** 2026-05-18

Four sub-decisions bundled because they are interdependent:

1. **Hook delivery:** `scripts/install-hooks.sh` invoked via the `prepare` npm lifecycle script — no new dependency. The starter's strong preference against unnecessary packages rules out `husky` when a 10-line shell script achieves the same result. `prepare` runs on `npm install`, giving forks automatic installation on clone. The shell script is committed to `scripts/` and symlinks (or copies) the hook into `.git/hooks/commit-msg`.

2. **Hook validator placement:** `scripts/commit-msg.mjs` — a Node ESM script matching the `check-audit-coverage.mjs` precedent already in `scripts/`. This allows the validator and `stats:escape` to share a common message-parsing helper in the same file or a co-located `scripts/commit-msg-parse.mjs`. Inline shell validation is rejected: regex in bash is brittle and the error-message requirements (name the specific missing field) are easier to satisfy in Node.

3. **`stats:escape` output:** stdout only. `scripts/stats-escape.mjs` prints to stdout; the tech-lead pipes it into the work-log manually. A file output (`docs/reviews/stats-escape-latest.md`) would need cleanup logic, a gitignore entry, or a commit every retrospective. Stdout is simpler and consistent with `check-audit-coverage.mjs`.

4. **Grandfather cutoff:** the date the feature ships (2026-05-18). No grace period. The cutoff is printed in the output header on every `stats:escape` run so the first retrospective number is honest. **MTTR deferred** to a follow-up work-log. No `Fixes-Bug:` trailer in this iteration; the escape-rate breakdown is the deliverable.

**Impact:** Adds `scripts/commit-msg.mjs`, `scripts/install-hooks.sh`, `scripts/stats-escape.mjs`. Adds `prepare` entry to `package.json`. Adds "Commit Message Standards" section to `CLAUDE.md`. Adds a cross-link to `.claude/agents/tech-lead.md`. Updates per-phase status in work-log.

---

## DECISION-009: Upstream-sync canonical URL — hardcoded in skill, not read from package.json

**Status:** Resolved
**Date:** 2026-05-18

**Decision:** The canonical starter URL (`https://github.com/chenson42/claudecode-nextjs-starter`) is hardcoded as a constant inside `.claude/skills/upstream-sync/SKILL.md`. It is NOT read from `package.json`.

**Rationale:** `package.json` in this project has no `repository` field (confirmed by grep). Requiring forks to populate `package.json` to make fork-detection work would be a silent failure mode — most forks won't know to add it. The hardcoded URL is inspectable inside the skill file itself, and a fork that deliberately wants to change the upstream target would edit the skill anyway. The alternative (reading from some config field) adds a new convention that nothing else in the project uses.

**Tradeoff:** If the canonical repo ever moves (org rename, repo rename), every fork's skill file would need to be updated. This is acceptable because repo moves are rare and the skill is the one file you'd update anyway.

**Impact:** Phase 4 sets `CANONICAL_URL = "https://github.com/chenson42/claudecode-nextjs-starter"` in the skill's pre-flight section. Trailing `.git` is stripped from `git remote get-url origin` output before comparison.

---

## DECISION-008: Upstream-sync review — skill placement, state file, cadence, and agent owner

**Status:** Resolved
**Date:** 2026-05-18

**Decision:** Four sub-decisions bundled here because they are all inter-dependent:

1. **Skill body:** `.claude/skills/upstream-sync/SKILL.md` — matches the single-file-per-skill convention already established by every other skill in `.claude/skills/`.

2. **State file:** `.claude/upstream-state.json` — flat, machine-readable, committed to the fork's repo (not gitignored). Shape (sketch): `{ "upstreamUrl": "...", "forkPointSha": "...", "lastSyncedSha": "...", "lastSyncedDate": "..." }`. This is simpler than parsing prose from `docs/reviews/log.md` and survives log re-formatting. No `.claude/state/` subdirectory created — a single file is sufficient and the "state directory for future files" risk is over-engineering.

3. **Cadence:** **14 days.** The two existing 7-day reviews are high-frequency by design (test coverage, retrospective). The five 30-day reviews are for slower-moving surfaces. Security patches from upstream can sit 30 days in a fork without notice; 14 days halves that exposure without adding session-start noise. `upstream-sync` is added to `docs/reviews/log.md` as `upstream-sync` (cadence: 14 days).

4. **Agent owner:** **tech-lead.** Already owns the retrospective (7-day) and documentation review (30-day). The upstream-sync review is instruction-layer work — reading release notes and commit classifications — which is directly analogous to the documentation review. A new section is appended to `tech-lead.md` under `## Ownership`. No new agent.

**Rationale summary:** Smallest footprint, consistent with existing conventions, 14-day cadence chosen for security-fix latency rather than convenience.

**Impact:** Adds `.claude/skills/upstream-sync/SKILL.md` (in Phase 4). Adds `.claude/upstream-state.json` (created by the skill on first run). Edits `docs/reviews/log.md` header bullet list (add `upstream-sync`). Edits `CLAUDE.md` `## Periodic Reviews` table (add 8th row) and changes "Seven reviews" to "Eight reviews". Edits `.claude/agents/tech-lead.md` `## Ownership` section (add upstream-sync paragraph).

---

## DECISION-007: `<FormattedDate>` lives in `src/components/shared/`, not `src/components/ui/`

**Status:** Resolved
**Date:** 2026-05-18

**Decision:** The timezone-safe date primitive is placed at `src/components/shared/formatted-date.tsx`, not inside `src/components/ui/`. The ESLint guard banning `toLocale*` outside that file uses a `no-restricted-syntax` pattern in `eslint.config.mjs` with a targeted `files` override that exempts the primitive's own path. The SSR fallback rendered inside `<time dateTime={iso}>` is the date portion of the ISO string (`YYYY-MM-DD`), marked `suppressHydrationWarning`.

**Rationale:**

1. **Placement.** `src/components/ui/` is reserved for generated shadcn/Radix primitives — the project instructions say "auto-generated; don't hand-edit." `<FormattedDate>` is hand-authored, cross-cutting (used by both `(admin)` and `(account)` surfaces), and requires `'use client'`. It belongs in `src/components/shared/`, which CLAUDE.md defines as "cross-cutting components used by both surfaces." No new top-level directory is needed.

2. **ESLint rule.** A `no-restricted-syntax` pattern in the existing `eslint.config.mjs` requires zero new dependencies and no plugin infrastructure. The pattern targets the `MemberExpression` where the property name matches `toLocaleString|toLocaleDateString|toLocaleTimeString`. A `files` override block in the same flat config exempts `src/components/shared/formatted-date.tsx`. This is the simplest mechanism consistent with the project's strong preference against new dependencies and custom infrastructure.

3. **SSR fallback.** The ISO-8601 string from the database (e.g., `2026-05-18T14:32:00.000Z`) is available server-side. Rendering the date portion (`YYYY-MM-DD`, extracted with `.toISOString().slice(0, 10)` — not a locale call) inside `<time>` gives the SSR output a stable, unambiguous placeholder that is close in character length to most formatted results. On hydration the client replaces it with the viewer's local format. `suppressHydrationWarning` is set on the `<time>` element to prevent the React warning caused by the intentional mismatch. Rendering nothing (empty string) would cause a jarring layout shift; rendering the full ISO timestamp would be confusing to end users if JS were slow.

**Impact:** Adds `src/components/shared/formatted-date.tsx`. Adds one `no-restricted-syntax` config block plus one `files` override to `eslint.config.mjs`. No new npm packages. All five call sites in `(admin)` and `(account)` switch from direct `toLocale*` calls to `<FormattedDate>`. A new Key Invariant is added to `CLAUDE.md` and a one-liner is added to `.claude/agents/ux-developer.md`.

---

## DECISION-006: Forgot-password flow uses a separate `(password-reset)` route group

**Status:** Resolved
**Date:** 2026-05-17

**Decision:** The forgot-password flow (`/forgot-password`, `/reset-password`) lives in a new `src/app/(password-reset)/` route group rather than being merged into the existing `(email-verify)` group. The two public paths are added to `PUBLIC_PATHS` in `src/proxy.ts` (no prefix exception needed — the token is a query parameter, not a path segment).

**Rationale:** `(email-verify)` owns `/account/verify-email/[token]` — an authenticated-user flow where the token-consumption page is the only unauthenticated step. The forgot-password flow is unauthenticated end-to-end, lives in a different URL namespace, and writes to a different token table. Merging them into a shared "unauthenticated tokens" group would create a brittle grouping that conflates two unrelated concerns. The `(email-verify)` group is the pattern precedent (no layout, proxy bypass) but not a shared container.

**Impact:** Adds `src/app/(password-reset)/forgot-password/page.tsx` and `src/app/(password-reset)/reset-password/page.tsx`. The `(password-reset)` group has no `layout.tsx`. Two `PUBLIC_PATHS` entries added to `src/proxy.ts`. API route handlers under `src/app/api/auth/forgot-password/route.ts` and `src/app/api/auth/reset-password/route.ts` follow the existing pattern for auth-adjacent handlers.

---

## DECISION-005: Rendered deck PDF is committed to the repo

**Status:** Resolved
**Date:** 2026-05-16

**Decision:** `deck/slides.pdf` is checked into git and re-committed every time `deck/slides.md` changes. `deck/slides.pptx` stays gitignored.

**Rationale:** A teaching artifact needs to be downloadable from the GitHub UI by anyone — including viewers who don't have Marp installed and don't want to run a build step. PDF is the lowest-common-denominator format; PPTX is large (~7 MB), Office-specific, and easily re-rendered from the source.

**Impact:** The repo will accumulate one PDF blob per non-trivial slide edit. At ~360 KB per snapshot, this is acceptable for the first few years of the project but will need revisiting later — `git lfs` migration, periodic squash, or moving the PDF to GitHub Releases are all viable when the history gets noisy. Flag this for review at the next 30-day documentation review.

---

## DECISION-004: Track the freshest sibling project (fertilityluna) for framework versions

**Status:** Resolved
**Date:** 2026-05-16

**Decision:** When choosing major versions for Next.js, React, NextAuth, Drizzle, Tailwind, ESLint config, and TypeScript, the starter pins to whatever the most recently active sibling project (currently `~/git/fertilityluna`) is running. That means: Next.js 16.2, React 19.2, NextAuth 5.0.0-beta.31, Drizzle 0.45.2, Tailwind v4, ESLint config Next 16.2, TypeScript 5.9, otplib v13.

**Rationale:** A starter that drifts behind the freshest production project becomes a worse template than the production project itself. By policy-aligning to fertilityluna's versions, the starter benefits from the upgrade work already done there — Tailwind v4 migration, otplib v13's repackaged API, React 19.2's compiler-friendly patterns — without the starter's author having to re-litigate each bump in isolation. This also makes onboarding from fertilityluna (or any sibling) to a new fork trivial: the dependency graphs match.

**Impact:** Tailwind config moved from `tailwind.config.ts` to CSS-based config in `src/app/globals.css` (via the `@theme` block). PostCSS now uses `@tailwindcss/postcss` instead of the v3 plugin + autoprefixer stack. The starter no longer ships a JS Tailwind config file. Periodically re-check the sibling-project versions at the 30-day dependency review and bump accordingly.

---

## DECISION-003: Permissions are distinct from feature flags

**Status:** Resolved
**Date:** 2026-05-16

**Decision:** Maintain two separate concepts in the starter — *permissions* (per-user authorization) and *feature flags* (per-environment toggles) — backed by separate schema, separate runtime helpers, and separate admin surfaces. They will never be merged into a single mechanism.

- Permissions live in the `features` table, are bound to roles via `role_features`, and are checked at runtime with `hasFeature(session.user.features, FEATURES.KEY)`. The static catalog is `FEATURE_CATALOG` in `src/lib/permissions.ts`.
- Flags live in the `feature_flags` table and are checked with `isFlagEnabled(key)` in `src/lib/flags.ts`.

**Rationale:** The two concepts answer different questions. "Is this *user* allowed to do X?" requires per-user state and changes as users gain or lose roles. "Is feature X *turned on* for this environment?" requires environment-level state and is the right unit for staged rollouts, dark-launches, and kill switches. Conflating them — common in starters that ship only one — forces every fork to either re-implement the missing concept or distort one mechanism to do both jobs badly. Keeping them distinct from day one means downstream forks inherit a model that scales.

**Impact:** Every new gated feature in this starter (and in forks) asks both questions independently. Forks that don't need flags can ignore the flag table; forks that don't need granular permissions can use the single `admin.dashboard` feature as a coarse admin gate. Neither concept hides inside the other.

---

## DECISION-002: TOTP 2FA over WebAuthn for the starter's default factor

**Status:** Resolved
**Date:** 2026-05-16

**Decision:** Ship TOTP (time-based one-time passwords via RFC 6238) as the second factor in the starter, with the secret encrypted at rest under `AUTH_TOTP_ENCRYPTION_KEY`, recovery codes hashed, and a trusted-device cookie for the "remember this browser" affordance. WebAuthn is *not* included in the starter.

**Rationale:** TOTP works on every device a fork's users already own (Google Authenticator, 1Password, Authy, Bitwarden, the iCloud Keychain). It requires no platform-specific UI, no attestation logic, no FIDO server. The implementation is small enough to read top-to-bottom (`src/lib/two-factor.ts`) and the admin can reset a user's enrolment with one click when a phone is lost. WebAuthn is the better second factor in the abstract, but it adds platform-specific authenticator handling, attestation policy, and a more complicated reset path that most forks don't need on day one. Forks that need WebAuthn can add it as an additional factor alongside TOTP without rewriting the starter's auth flow.

**Impact:** New users land on `/signin/totp` after their first password (or first OAuth sign-in if the user has `twoFactorRequired = true`). The TOTP secret is generated server-side, displayed once as a QR code, and stored AES-GCM-encrypted. Recovery codes are issued in the same step. The middleware enforces the 2FA gate at the edge for any route that requires it.

---

## DECISION-001: Neon Postgres with Drizzle ORM

**Status:** Resolved
**Date:** 2026-05-16

**Decision:** Use Neon as the Postgres host and Drizzle ORM as the query layer for the starter. App connections use the pooled host (`-pooler` suffix) via `@neondatabase/serverless`; Drizzle Kit uses the direct (unpooled) host for DDL.

**Rationale:** Neon's branching is the killer feature for an SDLC-focused starter — every schema change can happen on a disposable branch, tested with the seed script, and only promoted to `main` when the shape is right. Scale-to-zero keeps the cost-of-ownership for a fresh fork at effectively zero until it has traffic. The serverless driver fits Next.js route handlers, server actions, and the Edge runtime constraints without separate connection pooling code. Drizzle ORM was chosen over Prisma for three reasons: (1) the generated query layer is a thin TypeScript wrapper rather than an out-of-process binary, which means no separate `prisma generate` step in the fork's build; (2) `schema.ts` is the source of truth and is reviewed as code, not as a separate `.prisma` DSL; (3) `db:push` makes early development on a branch fast, while `db:generate` produces reviewable SQL once the schema stabilizes.

**Impact:** The fork needs two environment variables (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`). The schema in `src/lib/db/schema.ts` covers NextAuth's adapter tables plus the starter's own surface (roles, features, role bindings, TOTP, recovery codes, trusted devices, feature flags, audit events, migration seeds). Migrations during early development run via `db:push`; once a fork is in production, `db:generate` + committed SQL becomes the right path.
