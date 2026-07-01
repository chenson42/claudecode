---
name: downstream-sync
description: The mirror of upstream-sync. Surface changes THIS fork has made that are starter-generic (reusable by any fork) and produce a classified punch-list of backport candidates for the canonical starter — new skills/agents, workflow/process strengthenings, reusable features, and structural ideas. Never opens a PR itself; produces a review artifact the owner acts on. The canonical starter detects itself and exits.
---

# Downstream Sync

When the user invokes `/downstream-sync`, do the reverse of `/upstream-sync`: instead of
"what did the starter ship that I should pull," answer **"what have I built that the starter
should adopt."** Walk this fork's *starter-generic* surfaces, compare them against the canonical
starter, classify each divergence, and produce a punch-list of backport candidates. This skill
**never opens a PR and never pushes** — it produces the review artifact; the owner decides what to
contribute.

Direction: **fork → canonical starter** (`https://github.com/chenson42/claudecode-nextjs-starter`).

**Why this exists.** Forks accrete genuinely reusable improvements — new skills, new agents,
hardened workflow rules, reusable subsystems — that would benefit *every* fork if they flowed back.
Without a deliberate pass they never do, because the day-to-day incentive is always app-forward.
This is the deliberate pass. (It is itself a backport candidate: a starter that ships
`downstream-sync` teaches every fork to contribute back.)

---

## When to Invoke

- On a rolling cadence (suggested **30 days**), or after shipping generic tooling / infra / process
  improvements.
- Any time the owner asks "what could we contribute back to the starter?"
- Immediately useful right after a retrospective that flagged "starter-upstream candidates" (the
  third tier of the retro output).

---

## Pre-flight Checks

Run all three. Exit cleanly on any failure — do NOT write a log entry for a failed run.

### Check 1 — Canonical self-detection

```bash
git remote get-url origin 2>/dev/null
```

Strip a trailing `.git`. Compare to `CANONICAL_URL = "https://github.com/chenson42/claudecode-nextjs-starter"`.
If `origin` matches, print `downstream-sync: this IS the canonical starter — nothing to contribute back (N/A).`
and stop. Do not write state or a log entry.

### Check 2 — Tooling

`command -v gh` and `gh auth status`. `gh` is **required** — the skill diffs the fork against the
starter via the GitHub API (there is no shared git history to `git diff` against for a scaffolded
copy). If `gh` is unavailable, go to **Failure mode A**.

### Check 3 — State file

Read `.claude/downstream-state.json` (schema below). If missing/unparseable, go to **first-run
bootstrap** (Step 1). Otherwise extract `starterUrl`, `lastCheckedDate`, `proposed` (paths already
surfaced/handled), and `appSpecificPaths` (the skip-list). Proceed to Step 2.

---

## The Monorepo Path-Mapping Wrinkle (read before Step 2)

This fork is a **monorepo** (`web/` + `mobile/`); the canonical starter is **single-root**. When
comparing and when proposing, map fork paths to starter paths:

| Fork path | Starter path |
|-----------|--------------|
| `web/src/...` | `src/...` |
| `web/<config>` (package.json, tsconfig, etc.) | `<config>` |
| `.claude/`, `.github/`, `docs/` (repo root) | same |
| `mobile/...` | **no equivalent** — the whole `mobile/` tree (+ the `mobile-developer` agent + the monorepo split itself) is a **structural proposal**, not a file drop |

A fork file whose *mapped* path is absent in the starter is a NEW candidate. A file present in both
(mapped) but diverged is a MODIFIED candidate.

---

## Step 1 — First-Run Bootstrap

Print `No .claude/downstream-state.json found. Running first-time setup.` Write:

```json
{
  "starterUrl": "https://github.com/chenson42/claudecode-nextjs-starter",
  "lastCheckedDate": "<today YYYY-MM-DD>",
  "proposed": [],
  "appSpecificPaths": [
    "web/src/app/(app)/me", "web/src/app/(app)/huddle", "web/src/app/(app)/coach",
    "web/src/lib/health", "web/src/lib/push", "mobile"
  ]
}
```

`appSpecificPaths` seeds the skip-list with this fork's product surfaces so they never show up as
backport candidates. Extend it as the product grows.

---

## Step 2 — Enumerate Candidate Surfaces

Walk ONLY the starter-generic surfaces of the fork (never the product surfaces). For each, fetch the
starter's equivalent via `gh api` and diff.

Starter-generic surfaces, by category:

1. **Skills** — `.claude/skills/*/`. A skill the fork has that the starter lacks is a candidate
   (fetch the starter's list: `gh api repos/chenson42/claudecode-nextjs-starter/contents/.claude/skills --jq '.[].name'`).
2. **Agents** — `.claude/agents/*.md`. Same (fetch `.../contents/.claude/agents`).
3. **Workflow / process** — `CLAUDE.md`. The *generic* sections (Development Pipeline, Workflow Rules,
   Periodic Reviews, phase gates, Key Invariants that aren't product-specific). Diff against the
   starter's `CLAUDE.md`; flag hardened rules (e.g. ship-live-by-default, retire-backlog-at-ship,
   fix-stale-docs-on-sight, the e2e/rendered-page/cross-user-fixture QA gates, the session-start
   cadence check). These are almost always `needs-generalization` (strip product references).
4. **Generic infra** — `web/src/lib/` (auth, rate-limit, permissions, flags, db plumbing, generic
   helpers), `web/src/proxy.ts`, `web/src/middleware`, `e2e/`, `playwright.config.ts`,
   `.github/workflows/`, root config (tsconfig, eslint, next config). Diff mapped paths.
5. **Reusable features** — subsystems that any app would want and that are cleanly separable
   (e.g. the What's New system, a generic notifications/preferences spine). These span schema + API +
   UI + admin, so they are `needs-generalization` proposals, not drops.
6. **Structural** — the monorepo `web/`+`mobile/` split and the `mobile-developer` agent (native
   shell ownership). `structural-proposal` — an architectural idea, reviewed as a whole.

Cap at 50 candidate files per run (same as upstream-sync); note if truncated.

---

## Step 3 — Classify Each Candidate

First match wins.

| Class | Signal |
|-------|--------|
| `structural-proposal` | Not a file drop — an architecture idea spanning many files or a whole tree (`mobile/`, the monorepo split, a multi-file subsystem). Review as a unit. |
| `backport-ready` | A NEW generic file/skill/agent addable upstream nearly as-is; only repo-name / product-name references need stripping. |
| `needs-generalization` | Generic value but entangled with app-specific code (imports product modules, references product tables/routes, hardcodes product copy). Must be extracted/generalized first. |
| `skip` | Path is under `appSpecificPaths`, or the change is product logic (health, coach, huddle, nutrition, etc.). |

For every candidate, record **what must be stripped/generalized** before it can go upstream (repo
URL, product names, `web/`→`src/` path rewrites, removed product imports).

---

## Step 4 — Build the Punch-List

Output as Markdown before writing anything:

```markdown
## Downstream Sync Punch-list — YYYY-MM-DD
Starter: https://github.com/chenson42/claudecode-nextjs-starter
Last checked: <lastCheckedDate>

| # | Candidate | Fork path | Starter path (mapped) | Class | Strip / generalize | Notes |
|---|-----------|-----------|-----------------------|-------|--------------------|-------|
| 1 | downstream-sync skill | `.claude/skills/downstream-sync/` | `.claude/skills/downstream-sync/` | backport-ready | none (repo-agnostic) | the tool itself |
| 2 | mobile-developer agent | `.claude/agents/mobile-developer.md` | `.claude/agents/mobile-developer.md` | structural-proposal | pairs with the monorepo split | native-shell ownership |
| 3 | Workflow rules 10–13 + QA gates | `CLAUDE.md` | `CLAUDE.md` | needs-generalization | strip product examples | ship-live, retire-backlog, stale-docs, e2e/rendered/cross-user smokes |
| 4 | What's New system | `web/src/.../whats-new` (+ schema, admin) | `src/.../whats-new` | needs-generalization | strip product copy; keep the spine | auto-opening sheet + admin authoring |
| 5 | monorepo web/+mobile/ split | (structure) | (n/a) | structural-proposal | big lift | enables native shells |
```

**If empty** (nothing generic has diverged since last check): print
`Nothing new to contribute since <lastCheckedDate>. Log entry written.` and go to Step 6.

---

## Step 5 — Author the Contribution Kit (detailed specs, not file dumps)

The highest-value contribution is NOT a raw code drop — it's a set of **implementation specs the
starter's OWN Claude can run through and build itself**. The starter is a different repo with its own
conventions; a spec it can execute travels better than a patch that assumes this fork's layout. So for
each non-`skip` candidate, author a self-contained spec under `docs/starter-contributions/`:

`docs/starter-contributions/README.md` — an index: the candidate table + suggested PR order + a note
that these are proposals for `chenson42/claudecode-nextjs-starter`, authored by (and battle-tested in)
this fork.

`docs/starter-contributions/NN-<slug>.md` — one spec per candidate, structured like a work-log/RFC:
- **Origin** — name the originating project + the file(s)/DECISION/work-log/retro where it was proven,
  and the concrete problem it solved there (e.g. "a production escape on <date>"). Credit travels;
  it also gives the starter's Claude context to judge fit.
- **What & why** — the generic problem any fork hits, and the fix.
- **Applies to the starter as** — the mapped target paths in the SINGLE-ROOT starter (`web/src`→`src`)
  and what to STRIP (product names/copy/imports).
- **Implementation steps** — numbered, executable by the starter's Claude: files to add/edit, the exact
  tripwire/npm-script/CI wiring, schema/migration if any, the docs/CLAUDE.md paragraph to add.
- **Verification** — how the starter confirms it works (a test, a check script, an e2e).
- **Classification + risk** — backport-ready / needs-generalization / structural-proposal; blast radius.

Only if the owner explicitly asks, additionally **draft a branch in a starter clone** applying the
`backport-ready` specs. Otherwise the kit (specs) IS the deliverable — the owner opens a PR pointing the
starter at `docs/starter-contributions/`, or copies the specs into starter issues.

**Never push, never open a PR unprompted.** `needs-generalization` and `structural-proposal` items ship
as specs only — never auto-applied.

---

## Step 6 — Log Results

Append one line to `docs/reviews/log.md`:

```
YYYY-MM-DD | downstream-sync | N candidates (X backport-ready, Y needs-generalization, Z structural)
```

or `YYYY-MM-DD | downstream-sync | nothing new to contribute`.

For N > 0, also write `docs/reviews/YYYY-MM-DD-downstream-sync.md` with the full punch-list.

Update `.claude/downstream-state.json`: set `lastCheckedDate` to today; append handled paths to
`proposed` so they don't re-surface every run (an item stays out until it diverges again).

**On any failure before Step 2: write NOTHING.**

---

## Failure Modes

**Mode A — No gh:** `Cannot diff against the starter. Install + authenticate the GitHub CLI (gh), then retry /downstream-sync.`

**Mode B — GitHub API unreachable:** `GitHub API unreachable (HTTP <status> or network error). No log entry written. Retry when the network is available.`

---

## State File Schema

`.claude/downstream-state.json` — committed (not gitignored).

```json
{
  "starterUrl": "https://github.com/chenson42/claudecode-nextjs-starter",
  "lastCheckedDate": "YYYY-MM-DD",
  "proposed": ["<fork paths already surfaced/handled>"],
  "appSpecificPaths": ["<product surfaces to always skip>"]
}
```

## Output Summary

| Outcome | Log entry | State updated | Detail file |
|---------|-----------|---------------|-------------|
| Canonical repo | No | No | No |
| Tooling failure | No | No | No |
| Candidates found | Yes | Yes | Yes |
| Nothing new | Yes | Yes (date) | No |
| Failure before Step 2 | No | No | No |
