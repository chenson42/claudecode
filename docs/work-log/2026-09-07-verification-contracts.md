# Verification Contracts for the Agent Pipeline — Work Log

> **Slug:** `2026-09-07-verification-contracts`
> **Surface:** dev-loop tooling — no app surface (`.claude/agents/`, `.claude/settings.json`, `scripts/`, `docs/work-log/_template.md`, `CLAUDE.md`)
> **Permission(s):** not applicable — no app code touched
> **Flag(s):** not needed
> **Estimated complexity:** large
> **Pipeline mode:** Full — single work-log with five shipping increments tracked in Phase 4 (explicit deviation from one-log-per-increment: the increments share one design doc, one review scope, and land as one release)
> **Source:** operator request (Chris, 2026-09-07) + `docs/verification-contracts-design.md` (adapted from the npvitals 2026-09-07 design; evidence base `~/git/npvitals/apps/portal/docs/reviews/2026-09-07-retrospective.md`); Increment-3 weighting ratified by `docs/reviews/2026-09-07-retrospective.md`

---

## Per-Phase Status

| Phase | Owner | Status | Verdict | Date |
|-------|-------|--------|---------|------|
| 1 — Functional refinement | analyst | Complete | READY WITH NOTES | 2026-09-07 |
| 2 — Architectural review | architect | Complete | Approved with suggestions | 2026-09-07 |
| 3 — Technical design | tech-lead | Complete | Design complete — 5 increments specified | 2026-09-07 |
| 4 — Implementation | full-stack-developer (Inc 1,2,3,5); tech-lead (Inc 4) | Complete | Inc 1-4 shipped; +89-line agent-roster deviation accepted (corrected cap rationale); Increment 5 dropped after dry-run, file deleted; CLAUDE.md pipeline rewrite + 4 decisions.md entries landed | 2026-09-07 |
| 5 — Verification | qa (Opus 5 — cross-model vs Phase 4) | Complete | PASS — all gates green (491/491, typecheck, lint, `check` ×4); all three mechanisms re-proven from scratch; no diffs vs Phase 4's ledger; 6 non-blocking notes; +20 tests added | 2026-09-07 |
| 6 — Shipped vs intent | analyst (cross-model vs Phases 4/5) | Complete | SHIP WITH NOTES — all Phase 1 flows/gaps delivered or explicitly accepted; 4 follow-ups filed in docs/TODO.md (live-fire hook check = Next Up; ledger substance, freshness-leg revisit, doc restorations = Backlog) | 2026-09-07 |

---

# Phase 1 — Functional Refinement (analyst)

## VERDICT

READY WITH NOTES

## ONE-LINE TAKE

> This bolts real teeth (a blocking hook, a ledger-presence check, a harvested symbol tripwire)
> onto process rules that are currently prose-only — the design is unusually well-evidenced for a
> pre-Phase-1 doc, but it leaves the Trivial-vs-Feature boundary at the hook layer undefined and
> doesn't say what happens to the 45 work-logs already on disk once the ledger requirement goes live.

## User Verbs

This feature has no end-user surface. Its two "users" are the human operator and the pipeline
agents themselves.

| Surface | Verb | Cadence |
|---------|------|---------|
| Operator | Invokes `/new-feature`; creates/edits a work-log | Per feature |
| Operator | Calls `Edit`/`Write` on `.claude/agents/*.md`, `scripts/*`, `src/**`, etc. | Every tool call, gated by the new hook |
| Operator | Commits (trailer hooks already exist, unchanged by this feature) | Per commit |
| Operator | Runs `/pre-push` | Before every push to `main` |
| analyst / architect / tech-lead / implementers / qa (agents) | Re-derive the prior phase's E1/E2 claims before building on them ("entry check") | Once per phase handoff |
| analyst / architect / tech-lead / implementers / qa (agents) | Write a Claims Ledger closing their own phase section | Once per phase |
| Any implementer (P4) | Writes a "What was NOT verified" section | Once per Phase 4/5 output |

## Flows

**Flow 1 — Edit/Write hits the new work-log gate hook:** entry: agent or operator calls
`Edit`/`Write` on a non-trivial path → hook (PreToolUse) checks a work-log exists that either
mentions the target file or is same-day-fresh, and (for Phase 4/5 sections) contains a
"What was NOT verified" heading → **pass:** tool call proceeds → **BLOCK:** tool call is refused.
- Failure: the design doesn't specify the blocked message's content. Per `pre-push-gate.mjs`
  house style (cited as the template), it should name *which* condition failed and *what to run*
  (e.g. "no work-log covers `src/lib/foo.ts` — run `/new-feature` or touch today's work-log") —
  this needs to be an explicit Phase 3 requirement, not left to the implementer's judgment call,
  or the blocked path becomes exactly the kind of unhelpful failure microcopy this pipeline
  penalizes on the app side.

**Flow 2 — Phase handoff (ledger → entry check):** entry: prior phase agent finishes, writes its
Claims Ledger → next phase agent's entry check re-derives the prior phase's E1 commands and E2
claims *before reading the claimed answers* → diff found (rare) or confirmed (common) → outcome:
next phase proceeds, logging any diff. Failure: a diff found means the prior phase's claim was
wrong — the design doesn't say whether this bounces the whole prior phase back for revision or is
silently corrected and logged. Per CLAUDE.md's existing loop-back rule ("returns to the earliest
phase where the failure originated"), a genuine diff should trigger a loop-back, not just a log
line — Phase 3 should make this explicit so "log the diff" doesn't become a way to route around
the normal loop-back mechanism.

**Flow 3 — Commit through the trailer hooks:** entry: `git commit` → existing `commit-msg.mjs`
(unchanged by this feature, confirmed at `scripts/commit-msg.mjs`) validates prefix + trailers →
pass/reject, both already implemented and out of this feature's scope.

**Flow 4 — `/pre-push` through the new ledger-presence check:** entry: operator runs `/pre-push`
→ existing checks (typecheck, build, schema, release notes) run → **new:** ledger-presence check
scans work-logs whose Per-Phase Status shows any phase ≥ 3 complete, requiring a Claims Ledger
table in each completed section → pass/fail, reported alongside the other `/pre-push` output.
Failure: not specified whether this is a hard block (like typecheck) or an advisory line — given
§4 of the design table calls it "Low" risk and wires it into `npm run check` (which is currently
non-blocking, informational tooling) *and* `/pre-push` (which currently does block), Phase 3 must
pick one and say so, especially given the retroactive-scope gap below.

## Permissions & Flags

- **Permission(s):** N/A — no `FEATURES` key is created, changed, or checked. Nothing in this
  feature is gated by user role; the operator and the nine agents are not modeled in
  `src/lib/permissions.ts`.
- **Default roles:** N/A, same reason.
- **Flag(s):** N/A — no `feature_flags` row, no `isFlagEnabled()` call. This is dev-tooling that
  ships live the moment it merges; there's no environment-level on/off switch contemplated by the
  design, and none is warranted for a hook that only affects the authoring session, not runtime
  app behavior.

## Gaps the Request Didn't Address

- **Trivial-vs-Feature boundary at the hook layer is undefined.** CLAUDE.md's Classification
  table exempts Trivial-class edits (typo fixes, doc-only changes, answering questions) from any
  work-log requirement — but §6.1's hook fires on `Edit`/`Write` generically. A hook has no
  access to the classification an agent reasons about in prose; it only sees a file path and a
  diff. Nothing in §4/§6 says how the hook tells "fixing a typo in README.md" apart from "adding
  a new server action." Suggested resolution: before Phase 3 designs this from scratch, read the
  harvested `check-worklog.mjs` (821 lines — confirmed at
  `~/git/npvitals/apps/npvitals/scripts/check-worklog.mjs`) for whatever exemption heuristic it
  already carries; if none, Phase 3 needs an explicit allowlist (path patterns and/or a diff-size
  floor) and must document its false-positive class the same way `pre-push-gate.mjs` does.
- **Retroactive scope of the ledger-presence check against 45 existing work-logs.** `ls
  docs/work-log/` shows 45 files predating this one, most with Phase 3+ marked Complete and none
  containing a Claims Ledger table (that format doesn't exist until Increment 2 creates it). §6.2
  as written ("a work-log whose Per-Phase Status table shows any phase ≥ 3 complete must have a
  ledger...") reads as unconditional — if wired into `/pre-push` as a hard gate with no cutoff,
  it fails on every historical work-log the moment Increment 2 lands, which would make
  `/pre-push` permanently red until 45 files are retrofitted. This repo already has a precedent
  for exactly this situation (`stats:escape`'s "Grandfather cutoff: 2026-05-18" for the trailer
  requirement) — Phase 3 should adopt the same pattern: a cutoff date (Increment 2's ship date)
  before which existing work-logs are exempt from the ledger-presence check.
- **Same-day-freshness vs. this feature's own multi-day, 5-increment implementation.** The
  harvested freshness check (per §3, "work-log must mention the files being edited, *or* be
  same-day-fresh") is an OR, so it's likely fine as long as the work-log's Surface line already
  names every touched path (it does — confirmed above). But if a future feature's implementation
  spans multiple days without the work-log mentioning every file up front, the same-day leg alone
  won't save it. Not a blocker for this feature (self-referential Surface line covers it), but
  worth Phase 3 flagging as a pattern implementers should know about for every future multi-day
  build.
- **Fork that deletes `docs/work-log/` entirely.** The design doesn't say what the new hook does
  when the directory it depends on doesn't exist at all (a fork that removed the pipeline
  scaffolding). §6.1 promises "fails open only on parse error" — a missing directory is arguably
  a different failure mode than a parse error and should be named explicitly as fail-open too,
  or every `Edit`/`Write` in that fork becomes permanently blocked with no recovery path short of
  editing `.claude/settings.json` by hand.
- **Bootstrap ordering is fine, but only because this work-log already exists.** Increment 1
  writes the hook itself before the hook can enforce anything against Increment 1's own edits, so
  there's no chicken-and-egg problem *for this feature*. Confirmed the current work-log's Surface
  line already lists every directory the nine-agent rewrite (Increment 3) will touch, so once the
  hook goes live partway through this implementation, later increments should pass the freshness
  check against this same file. Flagging this only so Phase 3 doesn't have to re-derive it.
- **Increment-3 sequencing (check:agent-symbols before the rewrite) is already correctly stated**
  in §3/§8 of the design — not a gap, just confirming Phase 2/3 doesn't need to re-litigate it.
  Harvest source confirmed present: `~/git/npvitals/scripts/check-agent-symbols.mjs` (161 lines).

## Out of Scope (confirm with user)

- Any app-facing behavior change — confirmed N/A per §5 of the design doc and the file list in
  the work-log's Surface line (agents, settings.json, scripts/, template, CLAUDE.md only).
- Upgrading `check:audit`'s wrong-vs-missing gap to real static analysis — explicitly descoped in
  §2/§6.5 of the design and tracked as a `docs/TODO.md` line per the retrospective's punch list.
  Confirming this stays out rather than creeping into Increment 3's agent-file rewrite.
- The quantifier linter (§6.4, Increment 5) is explicitly optional and "drop if noisy" — treating
  it as truly droppable, not a soft commitment, when Phase 4/5 evaluate it.

## Open Questions

- Is the ledger-presence check (§6.2) meant to hard-block `/pre-push` or only surface as an
  advisory line, and does the grandfather-cutoff gap above change that answer? Phase 3 needs to
  decide and state it — the design doc's own table calls it "Low" risk but doesn't say which.
- Does a genuine diff found during a Phase 2–6 entry check (Flow 2 above) trigger the standard
  CLAUDE.md loop-back to the earliest failing phase, or does the design intend a lighter-weight
  "log and continue" path for entry-check diffs specifically? The design's prose ("diffs found =
  the entry check earning its keep; log them") reads as the latter but doesn't reconcile it with
  the existing loop-back rule.

## Claims Ledger

| # | Claim | Class | Evidence |
|---|-------|-------|----------|
| 1 | Only PreToolUse hook currently registered is on matcher `Bash` (`pre-push-gate.mjs`); no Edit/Write hook exists today | E1 | `.claude/settings.json` read in full this session — single PreToolUse block, matcher `"Bash"` |
| 2 | Nine agent files total 545 lines (31–83 each), matching the design doc's cited figures exactly | E1 | `wc -l .claude/agents/*.md` run this session |
| 3 | `check-worklog.mjs` / `check-agent-symbols.mjs` do not exist anywhere under this repo's `scripts/` | E1 | `ls scripts/` run this session — 13 files, none matching `worklog`/`agent-symbols`/`ledger` |
| 4 | Harvest sources exist at the cited sibling paths and line counts | E1 | `wc -l ~/git/npvitals/apps/npvitals/scripts/check-worklog.mjs ~/git/npvitals/scripts/check-agent-symbols.mjs` → 821 and 161 lines respectively, this session |
| 5 | 45 work-log files predate this one, none in the post-ledger format | E1 | `ls docs/work-log/` run this session, counted |
| 6 | `npm run check` (`check:audit` + `check:sql-date`) is informational tooling, not currently wired as a blocking pre-push gate on its own | E2 | `package.json` scripts block read this session; whether `/pre-push` currently invokes `npm run check` as a hard gate was not independently re-derived from the skill file — carried as risk, not verified E1 |
| 7 | The existing trailer-requirement grandfather-cutoff precedent (2026-05-18) is real and in current use | E1 | quoted verbatim in `docs/reviews/2026-09-07-retrospective.md`'s `stats:escape` output, read this session |

**What was NOT verified:** whether `/pre-push`'s skill file (`.claude/skills/pre-push/`) already
invokes `npm run check` as a blocking step — relevant to the Open Question above about hard-block
vs. advisory, and left for architect/tech-lead to re-derive directly rather than carried on my
say-so.

## Handoff

→ **architect (Phase 2).** Core design is sound and unusually well-evidenced for a pre-pipeline
doc — proceed to architectural review. Carry forward the two gaps that are genuinely
architectural (hook registration shape for a second PreToolUse matcher block; whether the
ledger-presence check's grandfather cutoff needs its own small persisted marker or can be a
hardcoded date like `stats:escape` uses) plus the two Open Questions above, which need a ruling
before Phase 3 can write literal implementation contracts for Increments 1 and 2.

---

# Phase 2 — Architectural Review (architect)

## Prior-Phase Spot-Check

Re-derived independently, before reading Phase 1's claimed evidence: (1) `.claude/settings.json`
hooks block, read fresh — confirms Phase 1 claim 1 (single PreToolUse matcher `"Bash"`, no
Edit/Write hook), no diff. (2) `ls docs/work-log/ | wc -l` → 47, minus `_template.md` and this
file → 45 predating files — confirms Phase 1 claim 5, no diff. (3) `wc -l .claude/agents/*.md` →
545 total, 31–83 range — confirms Phase 1 claim 2, no diff. **Diff found:** Phase 1 claim 6 (E2)
states `npm run check` is "informational tooling, not currently wired as a blocking pre-push gate
on its own." Reading `.claude/skills/pre-push/SKILL.md` directly (Steps 3b/3c) shows
`npm run check:audit` and `npm run check:sql-date` — the two scripts that compose `npm run
check` — are each already invoked as individually-named, hard-blocking `/pre-push` steps ("Do
not proceed if the audit-coverage check fails" / "…sql-date check fails"). The claim is correct
that no one runs `npm run check` as one combined command inside `/pre-push`, but the framing
"informational... not wired as blocking" overstates the gap — the constituent checks are already
blocking, just individually. Per my own ruling below (Entry-check diff semantics), this diff is
not load-bearing against Phase 1's verdict or gaps — it *sharpens* the answer to Open Question 1
rather than contradicting anything Phase 1 concluded — so it's logged here, not looped back.

## Verdict

Approved with suggestions

## Placement

- **Directory placement:** `scripts/` for all three harvested/new pieces — correct, matches
  Phase 1's confirmed Surface line and this repo's flat (non-monorepo) script layout.
- **Naming:**
  - The harvested `check-worklog.mjs` should land as **`scripts/worklog-gate.mjs`** (not the
    harvest source's literal name). This repo has two established script families:
    `check-*.mjs` (invoked via `npm run check:x`, tripwires) and `*-gate.mjs` (a live PreToolUse
    hook registered directly in `.claude/settings.json` — currently one example,
    `pre-push-gate.mjs`). The work-log check is a PreToolUse hook, not an `npm run check:x`
    tripwire, so it belongs in the `-gate.mjs` family for the same reason `pre-push-gate.mjs` is
    named that way — the name should tell a reader "this fires live inside a session," not "this
    is optional grep-lint tooling." Co-locate `scripts/worklog-gate.test.mjs`, mirroring
    `pre-push-gate.test.mjs` exactly (confirmed present at `scripts/pre-push-gate.test.mjs`).
  - `check-agent-symbols.mjs` keeps its harvested name — it is a genuine `npm run check:x`
    tripwire (agent-symbols), consistent with `check-audit-coverage.mjs` / `check-sql-date.mjs`.
    Confirmed those two have no co-located `.test.mjs` (only `commit-msg.mjs` and
    `pre-push-gate.mjs` do) — a single-purpose grep tripwire not needing a dedicated test file is
    this repo's existing norm, so `check-agent-symbols.mjs` needs none either; optional if Phase
    4 wants one, not required by convention.
  - The ledger-presence check should be its own new script, **`scripts/check-ledger.mjs`** —
    matches the single-purpose `check-*.mjs` convention (one script, one tripwire) rather than
    folding it into `worklog-gate.mjs` or a combined `npm run check` alias nobody currently
    invokes directly.
- **`.claude/settings.json` registration:** append a **second object** to the existing
  `"PreToolUse"` array (confirmed today it has exactly one: `matcher: "Bash"` →
  `pre-push-gate.mjs`, `.claude/settings.json:46-56`). Do not merge into the Bash block. New
  entry: `{ "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "node
  scripts/worklog-gate.mjs" }] }`. Pipe-separated tool names in one matcher string is the correct
  shape for "either tool" — confirmed by the existing single-tool precedent's literal syntax;
  there is no second live example of a multi-tool matcher in this file to cross-check against, so
  Phase 4 should smoke-test the matcher fires on both `Edit` and `Write` before relying on it.
- **Dependencies:** zero new npm packages, confirmed. Both harvest sources import only
  `node:fs`, `node:path`, `node:url`, `node:child_process`; `check-agent-symbols.mjs` shells out
  to the `grep` binary via `execFileSync`, the same "shell to a CLI tool via execFileSync" pattern
  `pre-push-gate.mjs` already uses for `git`. No Edge-runtime concern — none of this runs in
  `src/proxy.ts` or any request path.

## Invariants Touched

- None of the app-facing Key Invariants apply — no `src/` code, no schema, no proxy, no
  `FEATURES`/flags. Confirmed against the design doc's own §5 and Phase 1's Permissions & Flags
  section; nothing found to contradict that in this review.
- The invariant actually in play is **Workflow Rule 8** ("no code before the work-log"), moving
  from prose to mechanical enforcement for the first time — that is the point of this feature,
  not a side effect, and it's the reason this review is unusually strict about the hook's failure
  modes below.
- **Blast-radius confirmation:** exactly the declared set (`.claude/agents/*.md`,
  `.claude/settings.json`, `scripts/`, `docs/work-log/_template.md`, `CLAUDE.md`,
  `package.json` script entries) — **with one caution.** The harvest source's `--ci` mode
  (`resolveCiInput()`, `PR_BASE_REF`, `resolveCiTrivialLabel()`/`PR_LABELS`) is a second
  enforcement layer that, in the sibling, lives in a GitHub Actions workflow file. Porting that
  layer would touch `.github/workflows/*`, which is **outside this feature's declared blast
  radius**. Ruling: Increment 1 ports **hook mode only** (`worklog-gate.mjs`, no `--ci` flag, no
  CI-mode functions). If a CI backstop is later wanted, that's a scope expansion requiring its own
  work-log Surface line update and explicit sign-off, not something Phase 3 folds in silently.

## Notes

**1. The Trivial-exemption question (Phase 1 Gap #1) — answered, and it's a real architectural
gap, not a missing feature.** Read `check-worklog.mjs` directly: hook mode is hardcoded
`isTrivialLabeled: false` with the comment *"hook mode has no self-service escape hatch — see
design doc § 1"* (`check-worklog.mjs:765`), and its own blocked-message text says so explicitly:
*"If this change is genuinely Trivial per the Classification table, it still needs a
maintainer-applied `trivial` label to merge — Layer 1 has no local bypass"* (`:171-173`). The
**only** Trivial exemption that script contains lives in **CI mode**, gated on a human-applied
GitHub PR label read from `PR_LABELS` (`:695-703`) — deliberately not self-issuable by the same
agent making the edit, which is exactly the "no self-issued verdicts" principle this whole design
is built on. Given Increment 1 ports hook mode only (see blast-radius ruling above), and this
repo's `ci.yml` has no PR-label mechanism today (`grep -n "label" .github/workflows/ci.yml` →
zero hits, checked this session) — **porting the design as literally described in §6.1 leaves
every Trivial-class edit to `src/**`/`drizzle/**` permanently blocked with zero escape hatch**,
which directly contradicts CLAUDE.md's Classification table ("Trivial: No work-log, no
pipeline"). This is not a detail Phase 3 can leave to implementer judgment — it's a conflict
between two things CLAUDE.md itself asserts. Phase 3 must design a real local exemption
mechanism and it should **not** be a self-service flag the editing agent sets in the same turn
(that reintroduces exactly the self-attestation risk the sibling avoided). Closest fit to this
repo's existing house style: a marker-file pattern analogous to `pre-push-gate.mjs`'s
`.claude/pre-push-ok.json` stamp — gitignored, written by an explicit, separately-invoked step
(e.g., a `/trivial` micro-skill or an operator-run command), not by the agent's own Edit/Write
call. If tech-lead concludes no clean local mechanism exists, the fallback is to surface this as
an open question back to the user rather than silently deciding it — this changes how Rule
8/Classification is enforced at the tool layer and deserves a `docs/decisions.md` entry either
way (see Decisions Needed below).

**2. Bootstrap ordering is a non-issue — but only if Phase 3 preserves the trigger set exactly.**
The harvest source's own header explains why: *"scripts/** and docs/work-log/** are never in the
trigger set: scripts/ is process tooling... and docs/work-log/** is the evidence itself, never
the trigger"* (`check-worklog.mjs:70-72`), and `TRIGGER_PREFIXES = ["src/", "drizzle/"]`
(confirmed both prefixes are real directories in this repo — `drizzle/` holds five migration
files, checked this session). Increment 1 writes `scripts/worklog-gate.mjs` itself (not
triggering), Increment 3 rewrites `.claude/agents/*.md` (not triggering), and Increment 2/4 touch
`docs/work-log/_template.md` and `CLAUDE.md` (neither triggering). So the hook cannot block its
own later increments **by construction of the harvested trigger set**, not because of any
analogous behavior in `pre-push-gate.mjs` (that hook gates `git push` via the Bash matcher and
never had a self-referential file-editing problem to begin with — the two hooks solve different
problems and the "how does the precedent handle it" question doesn't have a shared answer beyond
"scope the trigger set narrowly"). Phase 3 must not widen `TRIGGER_PREFIXES` to include
`scripts/`, `.claude/`, or `docs/` without re-deriving this bootstrap analysis from scratch.

**3. Freshness signal must be reimplemented, not ported.** `resolveFreshWorklogPaths()` /
`sessionBoundarySeconds()` key off `.claude/session-handoff.state.json`
(`check-worklog.mjs:481`), a mechanism this repo does not have (`find . -iname
"*session-handoff*"` → zero hits, checked this session). Phase 3 needs a same-day-calendar-date
freshness check (file mtime or `git log -1 --format=%ct` compared against today's date, not a
session-boundary timestamp) — consistent with the design doc's own §1 wording ("same-day-fresh")
and Phase 1 Gap #3's reading of it. The `APP_SUBDIR`/`toAppRelative()` monorepo-path-rewriting
machinery (`:96-108`) is pure monorepo-ism and should be deleted entirely at harvest, not
adapted — this repo's `repoRoot` already resolves correctly with no subdirectory translation.

**4. Ledger-presence check: hard block, with a grandfathered cutoff (Open Question 1, resolved).**
Wire `check:ledger` into `/pre-push` as its **own named step**, following the exact pattern
Steps 3b/3c already establish for `check:audit`/`check:sql-date` — "Do not proceed if it fails" —
not folded into the currently-uninvoked combined `npm run check` alias. This is a hard block, not
an advisory, because the design's stated purpose (mechanical teeth on prose-only rules) is
undermined by an advisory that's easy to scroll past — and `/pre-push` already treats its
sibling tripwires as hard gates, so an advisory-only ledger check would be inconsistent within
the same skill. To avoid making `/pre-push` permanently red the moment Increment 2 ships:
hardcode a grandfather cutoff **exactly mirroring `stats:escape`'s precedent** (`2026-05-18` for
the trailer requirement) — here, the cutoff is Increment 2's ship date. Work-logs whose most
recent commit predates the cutoff are exempt from the ledger-presence requirement; anything
touched or created after it is not. This resolves Phase 1's Open Question 1 and the retroactive-
scope Gap together, using the same mechanism this repo has already proven out once.

**5. Entry-check diff semantics (Open Question 2, resolved).** A genuine diff on a *load-bearing*
claim triggers the standard CLAUDE.md loop-back to the earliest affected phase — that's not
optional, it's what the Development Pipeline section already mandates for any discovered
inconsistency, and the design's own §7 phrasing ("diffs found = the entry check earning its
keep; log them") should be read as "log them, and loop back when they change the depended-upon
phase's ruling" — not a parallel lighter path that lets an agent route around Rule constraints by
writing a ledger row instead of a loop-back. "Log and continue" is only correct when the diffed
claim is non-load-bearing against the current phase's own verdict — exactly the case demonstrated
in this section's Prior-Phase Spot-Check above (the `npm run check` framing diff sharpens my
Notes item 4 but doesn't change Phase 1's READY WITH NOTES verdict or invalidate any of its
Gaps), so it's logged, not looped back. Phase 3 should state this rule explicitly in the CLAUDE.md
pipeline-section rewrite (Increment 4) rather than leaving "log them" ambiguous for the next
agent that hits a load-bearing diff.

**6. Missing-directory fail-open case (Phase 1 Gap #4) needs explicit Phase 3 handling — the
harvest does not already cover it.** Traced the logic: if `docs/work-log/` doesn't exist at all
in a fork, `resolveWorklogPaths()` still returns cleanly (git status/diff on a missing pathspec
prefix just returns empty, not an error), so `worklogPaths` is empty and `evaluateWorklogGate()`
hits its Step 3 "no work-log found" branch and **blocks** with the RULE8_MESSAGE — this is
fail-**closed**, not fail-open, for that scenario, contradicting §6.1's "fails open only on parse
error" promise. Phase 3 must add an explicit check (e.g., `existsSync(docs/work-log/)` false →
allow with a warning) rather than relying on the harvested control flow, which was never designed
against a fork that deletes the directory outright.

**7. Increment ordering (design §8) is sound as sequenced** — mechanical gates (Inc 1–3) before
the instructions that reference them (Inc 4) is the right order and matches this repo's own
`pre-push-gate.mjs` precedent (the hook shipped before Workflow Rule 5's prose was hardened
alongside it). No change needed beyond folding Notes 1–3 and 6 into Increment 1's literal
contract and Note 4 into Increment 2's.

**8. Agent-file structure caps (§3/§8) — sound, with the arithmetic made explicit.** The ≤12-
lines-per-contract cap and the absorb-rule (delete superseded prose in the same edit) are the
right anti-bloat constraints given the confirmed 545-line, 31–83-line-per-file starting point (no
diff from the design doc's own citation). Carry the arithmetic forward literally: 9 contracts ×
≤12 lines = ≤108 gross lines added; the stated ≤+80 roster-wide net cap therefore *requires* at
least ~28 lines of absorbed prose to be deleted across the roster, not merely "some." Phase 3
should state that requirement as a number, and Phase 5/qa should verify it with a `wc -l`
before/after diff as an E1 ledger row — not eyeballed.

## Decisions Needed (for Phase 4 to land with the code, per Rule 4 — not written to
`docs/decisions.md` yet)

- **New hook class:** first non-Bash `PreToolUse` matcher (`Edit|Write`) in this repo, and the
  first hook that can block an in-session file edit rather than a shell command.
- **New script convention:** cross-repo harvest of tripwire/gate scripts into this repo's
  `scripts/` naming families (`*-gate.mjs` for live hooks vs `check-*.mjs` for `npm run check:x`
  tripwires), including the rename of the harvested `check-worklog.mjs` → `worklog-gate.mjs`.
  Log the harvest provenance (`~/git/npvitals/apps/npvitals/scripts/check-worklog.mjs`,
  `~/git/npvitals/scripts/check-agent-symbols.mjs`) in the decision entry per commit-standards
  `Caught-By: agent-review` convention already established in the design doc's header.
  Land as `fix:`/`feat:` commits per Rule 4, citing this decision.
- **Local Trivial-exemption mechanism** (Notes item 1) — whatever Phase 3 designs to replace the
  sibling's GitHub-label-based escape hatch is itself a decision worth recording, since it's a
  new control point on Rule 8 enforcement, not merely an implementation detail.
- **Grandfather cutoff for the ledger-presence check** (Notes item 4) — the specific date and its
  rationale, mirroring `stats:escape`'s precedent.

## Claims Ledger

| # | Claim | Class | Evidence |
|---|-------|-------|----------|
| 1 | Only PreToolUse hook today is `matcher: "Bash"` → `pre-push-gate.mjs`; no Edit/Write hook exists | E1 | `.claude/settings.json` read in full this session, lines 46-56 — re-derived independently of Phase 1's claim, no diff |
| 2 | Nine agent files, 545 total lines, 31–83 range | E1 | `wc -l .claude/agents/*.md` run this session — re-derived independently, no diff |
| 3 | 45 work-log files predate this one | E1 | `ls docs/work-log/ | wc -l` (47) minus `_template.md` and this file, run this session — re-derived independently, no diff |
| 4 | `/pre-push`'s Steps 3b/3c already run `check:audit`/`check:sql-date` as individually-named hard blocks — Phase 1's "informational, not wired as blocking" framing (claim 6, E2) is misleading | E1 | `.claude/skills/pre-push/SKILL.md` read in full this session — **diff found against Phase 1 claim 6**, logged per Notes item 5's own rule, not looped back (non-load-bearing) |
| 5 | `check-worklog.mjs` hook mode has no local Trivial bypass; its only exemption is a human-applied GitHub PR `trivial` label, checked only in `--ci` mode | E1 | `check-worklog.mjs:165-173, 695-703, 765` read in full this session |
| 6 | This repo's CI has no PR-label mechanism; no session-handoff state file exists | E1 | `grep -n "label" .github/workflows/ci.yml` → 0 hits; `find . -iname "*session-handoff*"` → 0 hits, both run this session |
| 7 | Harvest sources exist at cited paths; line counts 821 (`check-worklog.mjs`) + 723 (its test) + 161 (`check-agent-symbols.mjs`) | E1 | `wc -l` against all three files, run this session |

**What was NOT verified:** whether a `/trivial`-style micro-skill or marker-file mechanism (Notes
item 1's suggested fix) is technically clean to implement as a Claude Code hook input — I named
the shape but did not prototype it; that verification belongs to Phase 3/4.

## Handoff

→ **tech-lead (Phase 3).** Approved with suggestions — proceed to technical design. Four items
are load-bearing for the literal contracts, not optional polish: (1) design a real **local**
Trivial-exemption mechanism for the work-log gate (Notes item 1) — the harvested script's only
exemption is a GitHub-label path this repo's CI doesn't have, so porting it as-is permanently
blocks every Trivial-class edit to `src/**`/`drizzle/**`, contradicting the Classification table;
(2) preserve `TRIGGER_PREFIXES = ["src/", "drizzle/"]` exactly — widening it reopens the bootstrap
question (Notes item 2); (3) reimplement freshness against calendar-date, not the sibling's
session-handoff file, which doesn't exist here (Notes item 3); (4) add the missing-directory
fail-open branch the harvest doesn't cover (Notes item 6). Also carry forward: the ledger-presence
check is a hard `/pre-push` block with a grandfathered cutoff at Increment 2's ship date (Notes
item 4); a genuine load-bearing entry-check diff loops back per the existing CLAUDE.md rule, a
non-load-bearing one logs and continues (Notes item 5) — state this explicitly in the Increment 4
CLAUDE.md rewrite; the agent-file roster budget is ≤108 gross / ≤+80 net lines, requiring ≥28
lines of absorbed-prose deletion, verified by a `wc -l` diff, not eyeballed (Notes item 8). Land
the four Decisions Needed above in `docs/decisions.md` with the Phase 4 commit that implements
them, per Rule 4 (decisions land with the work, not ahead of it).

---

# Phase 3 — Technical Design (tech-lead)

## Prior-Phase Spot-Check

Re-derived two of Phase 2's load-bearing claims from primary sources, not from Phase 2's prose
(caveat: I had already read the whole work-log, Phase 2 included, in my first read of this
session — the check below is independent in the sense that I went back to the actual source files
rather than trusting Phase 2's citation, not independent in strict read-order; noting this
honestly rather than claiming blind re-derivation). (1) Read
`~/git/npvitals/apps/npvitals/scripts/check-worklog.mjs` directly and grepped it for
`isTrivialLabeled`/`PR_LABELS`/`TRIGGER_PREFIXES`: line 765 reads exactly `isTrivialLabeled:
false, // hook mode has no self-service escape hatch — see design doc § 1`, and line 81 reads
`export const TRIGGER_PREFIXES = ["src/", "drizzle/"];` — both confirm Phase 2 Notes item 1 and
the Handoff's item 2 verbatim, no diff. (2) Re-read `.claude/settings.json` in full: still exactly
one `PreToolUse` entry, `matcher: "Bash"` → `pre-push-gate.mjs`, lines 46-56 — confirms Phase 2
claim 1, no diff. Also incidentally re-confirmed harvest line counts (`wc -l`: 821 + 723 + 161)
against Phase 1 claim 4 / Phase 2 claim 7. No load-bearing diffs found against either phase;
proceeding on all four of Phase 2's named load-bearing items (Trivial exemption, trigger-prefix
preservation, calendar-date freshness, missing-directory fail-open) and its five other rulings.

## Summary

Two new mechanisms give CLAUDE.md's process rules the "real teeth" this feature exists to add,
plus the documentation changes that let agents rely on those teeth instead of prose alone.
**Increment 1** ports the npvitals `check-worklog.mjs` hook (renamed `scripts/worklog-gate.mjs`
per Phase 2's naming ruling) as a `PreToolUse` gate on `Edit`/`Write`: it blocks edits to
`src/**`/`drizzle/**` unless a work-log mentions the target file or was touched today, with a
local, non-self-issuable Trivial exemption (a `/trivial`-stamped marker file) replacing the
harvest's GitHub-PR-label escape hatch, which this repo has no equivalent of. **Increment 2** adds
a Claims Ledger + Prior-Phase Spot-Check + "What was NOT verified" format to
`docs/work-log/_template.md`, and a new `scripts/check-ledger.mjs` tripwire, hard-blocking in
`/pre-push`, that fails any work-log dated after a grandfather cutoff whose Phase ≥3 sections claim
"Complete" without a ledger table. **Increment 3** harvests `check-agent-symbols.mjs` (stale-symbol
tripwire for agent code samples) and adds a ≤12-line "Verification Contract" section to each of the
nine `.claude/agents/*.md` files, stating each phase's entry check, exit-ledger contents, and
self-check emphasis, absorbing (deleting) the prose it supersedes. **Increment 4** rewrites
CLAUDE.md's Development Pipeline section to name the evidence classes (E1/E2/E3), the entry-check
rule, and the no-self-issued-verdicts rule the contracts implement. **Increment 5** (optional) is
an advisory-only quantifier linter. None of this touches `src/`, the schema, or any runtime app
behavior — it is dev-loop tooling that changes how the nine agents verify each other's work.

## Permissions & Flags

Not applicable — confirmed again at this phase, no change from Phase 1/2. No `FEATURES` key, no
`feature_flags` row; the "users" are the operator and the nine agents, neither modeled in
`src/lib/permissions.ts`.

## Script / Hook Contract

### Increment 1 — `scripts/worklog-gate.mjs`

**Exported functions** (unit-tested directly, no process spawn):

```js
export const TRIGGER_PREFIXES = ["src/", "drizzle/"]; // UNCHANGED from harvest — do not widen (Phase 2 Notes item 2)

export function isTriggerPath(relativePath) { /* startsWith on TRIGGER_PREFIXES */ }

export function extractPhaseSection(content, phaseNumber) {
  // generalizes the harvest's extractPhase1Section() to any phase 1-6:
  // text between `^# Phase N —` and the next `^# Phase [1-6] —`, or EOF.
}

export function worklogMentionsPath(content, targetPath) {
  // literal substring match of the repo-relative targetPath anywhere in content
  // (covers the Surface line, a Files Modified/Files Changed bullet, etc.)
}

export function isSameDayFresh(worklogRelPath, repoRoot) {
  // git status --porcelain --untracked-files=normal -- <path>  → non-empty = fresh
  // else: git log -1 --format=%cI -- <path>  → new Date(iso).toISOString().slice(0,10)
  //       === new Date().toISOString().slice(0,10)  (both compared in UTC, not local TZ
  //       or git's --date=format, which stays in the commit's own offset — Phase 2 Notes
  //       item 3: calendar-date, not session-boundary)
  // try/catch → return true (fail OPEN, matching pre-push-gate.mjs's house style)
}

export function hasNotVerifiedHeading(phaseSectionText) {
  return /^##\s+What was NOT verified\s*$/im.test(phaseSectionText);
}

export function readTrivialMarker(markerPath) {
  // JSON.parse .claude/trivial-ok.json → { path, reason, stampedAt, expiresAt } or null on any error
}

export function trivialMarkerMatches(marker, targetRelativePath, nowISO) {
  return !!marker && marker.path === targetRelativePath && Date.parse(nowISO) < Date.parse(marker.expiresAt);
}

export function evaluateWorklogGate({ targetPath, worklogDocsExists, worklogs, isFresh, trivialExempt }) {
  // pure decision function — worklogs: [{ path, content }], isFresh: (path) => boolean
  // returns { decision: "allow" | "block", reason: string }
}
```

**Decision flow** (`evaluateWorklogGate`, invoked by the CLI wrapper below):

1. Not a trigger path → `allow` (fast exit, no fs/git work at all).
2. `!worklogDocsExists` → `allow`, reason `"docs/work-log/ does not exist in this checkout"` (Phase
   1 Gap #4 / Phase 2 Notes item 6 — explicit fail-open for a fork that deleted the directory,
   which the harvest's own control flow does NOT cover: its `resolveWorklogPaths()` returns empty
   on a missing directory and falls through to the "no work-log found" **block** branch).
3. `trivialExempt` → `allow`, reason `"trivial marker matched " + targetPath"`.
4. Else scan every `docs/work-log/*.md` except `_template.md`. A work-log **qualifies** if
   `worklogMentionsPath(content, targetPath) || isFresh(path)`. Zero qualifying → `block`
   (RULE8_MESSAGE below).
5. For each qualifying work-log, if it has a substantive Phase 4 section
   (`extractPhaseSection(content, 4)` found and not just the template placeholder) or Phase 5
   section, that section must pass `hasNotVerifiedHeading`. If **any** qualifying work-log passes
   the mention/freshness test AND (has no substantive Phase 4/5 yet, or passes the heading check
   on the ones it has) → `allow`. If every qualifying work-log fails the heading check on a
   substantive Phase 4/5, `block` naming the first offending path and phase.

**CLI wrapper** (hook mode only — no `--ci`, no `PR_BASE_REF`, no `resolveCiTrivialLabel()`; Phase
2's blast-radius ruling excludes `.github/workflows/*` from this feature):

- Reads `tool_input.file_path` from stdin JSON. Unparseable stdin/JSON → `process.exit(0)` with a
  stderr warning (fail open on parse error, per the design doc's own §6.1 promise and
  `pre-push-gate.mjs`'s precedent).
- Converts to repo-relative, runs `evaluateWorklogGate`. On `block`, `console.error(reason);
  process.exit(2)` (PreToolUse reads stderr as the denial reason, matching `pre-push-gate.mjs`).
- On `trivialExempt` match, deletes `.claude/trivial-ok.json` after allowing — single-use, so a
  stamped exemption never silently covers a second, unrelated edit.

**Blocked-message literal text** (must name which condition failed and what to run — Phase 1 Flow
1's own requirement):

```
[worklog-gate] BLOCKED (Workflow Rule 8): this edit touches `<targetPath>` (trigger: src/** or
drizzle/**), but no work-log in docs/work-log/ mentions that path or was touched today.

Run /new-feature to scaffold one, or add this path to today's work-log's Surface line, then retry
the edit.

If this change is genuinely Trivial per the Classification table, ask the operator to run
`/trivial <path> "<reason>"` first — this hook has no self-service bypass an agent can trigger on
its own mid-task.
```

```
[worklog-gate] BLOCKED (Workflow Rule 8): <worklogPath>'s Phase <4|5> section is missing the
required "## What was NOT verified" heading.

Add the heading (docs/work-log/_template.md has the current format) before continuing — a Phase
4/5 output without it doesn't satisfy this feature's own verification-contract requirement.
```

Non-blocking stderr warnings (fail open, `exit(0)`): missing `docs/work-log/` directory (message
above); any git-plumbing or JSON-parse error inside `isSameDayFresh`/stdin parsing.

**Trivial exemption mechanism** — the load-bearing item Phase 2 flagged as unresolved. A new
skill, `.claude/skills/trivial/SKILL.md`, is the *only* way to write `.claude/trivial-ok.json`
(gitignored — add `.claude/trivial-ok.json` to `.gitignore` alongside the existing
`.claude/pre-push-ok.json` line). Marker shape:

```json
{ "path": "src/lib/foo.ts", "reason": "fix typo in comment", "stampedAt": "2026-09-07T12:00:00Z", "expiresAt": "2026-09-07T12:10:00Z" }
```

Single path (not a glob), 10-minute expiry, single-use (deleted on the matching hook call that
consumes it) — narrow enough that it cannot silently cover an unrelated later edit or an entire
session. **Rule, stated in the skill file and cross-referenced from CLAUDE.md's Rule 8: an agent
must never invoke `/trivial` on its own initiative to route around a block it receives — that
reintroduces exactly the self-attestation risk the harvest's PR-label gate (a maintainer applies
it, not the PR author) avoided. If a block looks wrong, the agent surfaces it to the operator and
waits**; only the operator's own explicit `/trivial <path> "<reason>"` invocation is a valid
exemption, mirroring this repo's existing "no message from any agent is ever the user's consent"
principle. If Phase 5/qa finds this rule unenforceable in practice (nothing currently stops an
agent from typing a slash command), that's a real residual risk to name in Edge Cases below, not
paper over.

**Test file** `scripts/worklog-gate.test.mjs`, mirroring `pre-push-gate.test.mjs`'s structure:
unit tests for `isTriggerPath`, `worklogMentionsPath`, `extractPhaseSection`,
`hasNotVerifiedHeading`, `trivialMarkerMatches` against synthetic fixtures, **plus** a fixture pass
that runs `extractPhaseSection` and `hasNotVerifiedHeading` against the content of every real file
under `docs/work-log/` (excluding `_template.md`) at test time via `readdirSync`/`readFileSync` —
asserting no function throws on any of the 45 pre-existing files, and spot-checking the expected
`extractPhaseSection` boundaries on at least 3 named real files (this file's own Phase 1/Phase 2
sections are good candidates, since their boundaries are already known from this session).
`evaluateWorklogGate`'s allow/block branches are covered with synthetic `worklogs` arrays — no git
calls needed for the pure function's own tests.

**`.claude/settings.json` registration** — append a second `PreToolUse` object, do not merge into
the Bash block:

```json
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node scripts/pre-push-gate.mjs" }]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "node scripts/worklog-gate.mjs" }]
      }
    ]
```

### Increment 2 — `scripts/check-ledger.mjs`

```js
const LEDGER_GRANDFATHER_CUTOFF = "YYYY-MM-DD"; // Implementer: set to the calendar date Increment 2 merges to main — mirrors stats:escape's hardcoded 2026-05-18 precedent exactly. Do not leave the placeholder.

const LEDGER_TABLE_RE = /^\|\s*#\s*\|\s*Claim\s*\|\s*Class\s*\|\s*Evidence\s*\|/m;
const STATUS_ROW_RE = /^\|\s*([3-6])\s*[—-][^|]*\|[^|]*\|\s*([^|]+?)\s*\|/gm; // group 2 = Status cell

// Filename convention is the scope test, no git needed: docs/work-log/YYYY-MM-DD-<slug>.md
function fileDate(filename) { return filename.slice(0, 10); }

function isInScope(filename) { return fileDate(filename) > LEDGER_GRANDFATHER_CUTOFF; }

// For each in-scope file: parse STATUS_ROW_RE rows; for every phase N in [3,6] whose Status
// cell (trimmed, case-insensitive) === "complete", extractPhaseSection(content, N) must match
// LEDGER_TABLE_RE. Any miss → violation, printed as `<file>: Phase <N> is Complete but has no
// Claims Ledger table`. Exit 1 on any violation, exit 0 otherwise (console.log summary either way,
// matching check-audit-coverage.mjs / check-sql-date.mjs's existing house style).
```

Reuses `extractPhaseSection` by importing it from `worklog-gate.mjs` rather than re-implementing —
one parser, two consumers.

**Wiring** — its own named, hard-blocking `/pre-push` step (Phase 2 Notes item 4: hard block, not
advisory, because `/pre-push` already treats its sibling tripwires as hard gates), inserted as
**Step 3e**, and folded into the combined `npm run check` alias:

```json
    "check:ledger": "node scripts/check-ledger.mjs",
    "check": "npm run check:audit && npm run check:sql-date && npm run check:agent-symbols && npm run check:ledger"
```

`.claude/skills/pre-push/SKILL.md` — new step, inserted after the existing Step 3d (Unit Tests),
before Step 4 (Production Build), matching Steps 3b/3c's exact phrasing pattern:

```markdown
## Step 3e: Ledger-Presence Tripwire

```bash
npm run check:ledger
```

`scripts/check-ledger.mjs` scans every `docs/work-log/*.md` dated after the grandfather cutoff
(Increment 2's ship date) whose Per-Phase Status table marks any phase 3–6 `Complete`, and fails if
that phase's own section has no `| # | Claim | Class | Evidence |`-shaped Claims Ledger table. Add
the missing table, or correct the Per-Phase Status entry if the phase isn't actually complete.

**Do not proceed if the ledger-presence check fails.**
```

### Increment 3 precursor — `scripts/check-agent-symbols.mjs` port

Path adjustments from the harvest (`~/git/npvitals/scripts/check-agent-symbols.mjs`, 161 lines):

- `execFileSync("grep", ["-rEl", pattern, "apps", "packages"], ...)` → this repo has no
  `apps`/`packages` monorepo split; change the search roots to `["src"]` (agent files reference
  `src/`, never `apps/`).
- `RETIRED` array ships **empty** (`const RETIRED = [];`) — `requireRole` is npvitals-specific and
  doesn't exist here. The self-validating `isActuallyRetired()` machinery, `codeBlocks()` parser,
  and CLI/reporting shape port unchanged. An empty list means the tripwire is a structural no-op
  until Increment 3's agent-file audit finds (or a future incident creates) a real entry — same
  posture `check:audit`/`check:sql-date` don't have, but consistent with "prove a gate can fail"
  being a Phase 4/qa responsibility, not something to fake with a placeholder entry.
- No `.test.mjs` needed, matching this repo's existing norm (Phase 2 Placement ruling: single-
  purpose grep tripwires without dedicated tests are the norm here; only `commit-msg.mjs` and
  `pre-push-gate.mjs` have them).
- **package.json script entry:** `"check:agent-symbols": "node scripts/check-agent-symbols.mjs"`,
  folded into the combined `check` alias shown above. `/pre-push` gets a matching **Step 3f**
  (same hard-block phrasing pattern as 3b/3c/3e).

## Data Model

No schema changes required — confirmed again, no `src/lib/db/schema.ts` touch anywhere in this
feature.

## Increment 2 — `docs/work-log/_template.md` changes

Every phase section (1–6) gains a closing Claims Ledger block, inserted immediately before that
phase's closing `---`:

```markdown
## Claims Ledger

| # | Claim | Class | Evidence |
|---|-------|-------|----------|
| | | E1 / E2 / E3 | |

## What was NOT verified

[Claims this phase depended on but did not independently re-derive or check.]
```

Phases 2–6 additionally gain, immediately after the phase's `# Phase N — ...` heading (before any
existing content):

```markdown
## Prior-Phase Spot-Check

[Which prior-phase ledger rows were re-derived — commands re-run, claims re-checked — before
reading its claimed answers, and any diffs found. A load-bearing diff loops back to the earliest
affected phase per CLAUDE.md's Development Pipeline section; a non-load-bearing diff is logged
here and this phase continues (architect's ruling, Phase 2 Notes item 5).]
```

`hasNotVerifiedHeading()` (Increment 1) only enforces the `## What was NOT verified` heading on
**Phase 4 and Phase 5** sections of whichever work-log the hook selects as "qualifying" for a given
edit — since that work-log is by construction same-day-fresh or explicitly mentioned, none of the
45 pre-existing work-logs are ever in scope for that check (they're neither fresh nor mentioned by
a brand-new edit), so **no retroactive/grandfather handling is needed for Increment 1's heading
check** — only `check:ledger` (Increment 2, `/pre-push`-wide scan) needs the grandfather cutoff,
because it scans every work-log unconditionally regardless of freshness. Phase 5's existing
Feature-Gate Audit table is unchanged — it is already ledger-shaped, per the design doc.

## Increment 4 — CLAUDE.md pipeline-section rewrite (outline)

Insert a new subsection **"### Evidence Classes and Entry Checks"** in `## Development Pipeline`,
directly after the existing loop-back sentence ("Loop-backs are expected... returns to the
earliest phase where the failure originated") and before `### Classification`. Contents, at the
level of detail Increment 4 should write out in full (not literal prose here — this is Phase 3's
outline for Phase 4 to draft):

- **Evidence classes block.** Define E1 (executed — a command was run this session and its output
  is the evidence), E2 (derived — read directly from a primary source, not run), E3 (reasoned — an
  inference; legal but must be labeled, and an unlabeled quantified claim is E3 by default). Cite
  this design doc's §1 as the source; state that every Claims Ledger row carries one of these tags.
- **Entry-check rule.** Before building on a prior phase, re-derive its E1 commands and E2 claims
  *before reading its claimed answers* (derive-then-diff, never read-then-confirm), then diff. A
  load-bearing diff loops back to the earliest affected phase per the existing loop-back sentence;
  a non-load-bearing diff is logged in the current phase's Prior-Phase Spot-Check and the phase
  continues — state this explicitly as the resolution to what "log them" meant in the source design
  doc's §7 (Phase 2 Notes item 5).
- **No-self-issued-verdicts rule.** A phase reports evidence; the next phase grades it. Name this
  as the reason Phase 5 cannot accept "implementer-verified" as "qa-verified" and Phase 6 cannot
  accept a Phase 5 PASS without its own independent flow-walk — both already true of the six-phase
  design, now stated as an explicit rule agents can cite.
- **P5/P6 cross-model override note.** At the two judgment gates — qa (Phase 5) and the Phase 6
  invocation of analyst — spawn with a per-invocation `model` override to a model different from
  the Phase 4 implementer's, per the design doc §5 rationale (fresh-context independence, cheap to
  do, not load-bearing). Note that `analyst.md` serves both Phase 1 (no override needed) and Phase
  6 (override applies) from the same file — the override is an invocation-time choice, not
  something the agent file itself can encode.
- **What existing prose this replaces:** none of the six Phase-gate bullets are deleted wholesale —
  each of the Phase 4, 5, and 6 gate/loop-back bullets gets one clause appended pointing at the new
  subsection (e.g., Phase 4's gate bullet gains "...and a Claims Ledger with a 'What was NOT
  verified' section (see Evidence Classes and Entry Checks)"), rather than restating the rule
  inline three more times. The Agent Roster table gets one added sentence: "Each agent file's own
  Verification Contract section states its phase's entry check and exit-ledger requirement in
  full — this table does not duplicate it."

## Increment 5 — Quantifier linter (optional): recommendation

**Ship it, but only as a dry-run-gated advisory, not a blocking hook — and only if the dry run
looks clean.** Spec (verbatim from the design doc's §6.4, unchanged): flag `\b(all|every|none|the
\d+)\b` in a completed phase section with no fenced code block within 5 lines. Before wiring it
anywhere (SessionStart hook or a `/pre-push` advisory line), Phase 4 must dry-run it against all 45
real work-logs and report the hit count and a sample of matches. My call: prose-heavy phase
sections use "every"/"all" constantly in ways that are not enumerable claims ("every flow",
"all pages" as a genre convention, not a specific quantified assertion) — I expect a high
false-positive rate on this corpus. **If the dry run's true-positive rate (matches that are
actually unverified quantified claims) is below ~50%, drop it** — the design doc's own "drop if
noisy" clause is not a soft commitment, and a noisy advisory that gets ignored is worse than no
advisory (it trains agents to skip warnings). Do not spend Phase 4 time tuning the regex to reduce
noise; if the naive version is noisy, that's the answer, not a bug to fix.

## Implementation Order

1. **Increment 1** — `scripts/worklog-gate.mjs` + test, `.claude/skills/trivial/SKILL.md`,
   `.gitignore` entry, `.claude/settings.json` registration. Smoke-test the matcher fires on both
   `Edit` and `Write` before relying on it (Phase 2's own caution — no second multi-tool matcher
   exists in this file to cross-check against).
2. **Increment 2** — `docs/work-log/_template.md` format changes, `scripts/check-ledger.mjs`,
   package.json + `/pre-push` Step 3e wiring. Depends on Increment 1's `extractPhaseSection` export.
3. **Increment 3** — `scripts/check-agent-symbols.mjs` port + package.json + `/pre-push` Step 3f
   *first*; confirm it passes trivially (empty `RETIRED`); *then* the nine agent-file rewrites, so
   the tripwire is watching before the rewrite lands, per Phase 1/2's already-settled sequencing.
4. **Increment 4** — CLAUDE.md pipeline-section rewrite, after the mechanisms it describes exist
   (Phase 2 Notes item 7: instructions claiming enforcement that doesn't exist is the failure this
   whole design exists to kill).
5. **Increment 5** (optional) — quantifier linter dry run; ship as advisory or drop per the
   recommendation above.

At ship time (after all shipped increments): functionality-map line (Rule 14 — this is dev-tooling
with no member-visible surface, so likely a one-line mention under an "Agent pipeline" area, not a
new capability row), release notes, `docs/TODO.md` reconciliation (Rule 10), and a
`docs/decisions.md` entry for the four items Phase 2's "Decisions Needed" named (new hook class,
new script-naming convention + harvest provenance, the local Trivial-exemption mechanism, the
ledger grandfather cutoff and its date) — landed with the Phase 4 commits that implement them, per
Rule 4, not written ahead of the work.

## The Nine Agent Contracts (Increment 3)

Each file's literal ≤12-line **Verification Contract** section, and the specific existing lines it
absorbs (deletes in the same edit). Arithmetic: 9 contracts total **85 gross lines** added (none
hit the full 12-line ceiling — each is sized to what that file's row in the design doc's §4 table
actually requires, not padded to the cap), **5 lines deleted** (named below), **net +80**, exactly
at Phase 2's ≤+80 roster-wide cap. This is a smaller deletion count than Note 8's illustrative
"≥28" arithmetic implied — that figure was the worst-case consequence of *every* contract hitting
the full 12-line ceiling (9×12=108 gross); actual contracts came in leaner. I looked for more
absorbable prose across all nine files and found only three clean, unambiguous instances (below) —
the rest of each file's existing prose is either operational detail the contract doesn't restate
(e.g., qa.md's Feature-Gate Audit checklist, its no-self-agreeing-mocks testing technique) or
narrative/citation content (sagacraft/westervillelions incident references) that is institutional
memory, not something the contract makes redundant, and cutting it to hit a line-count target would
be exactly the kind of confidently-wrong theatre this design exists to avoid. **Phase 5/qa verifies
the actual net delta with `wc -l .claude/agents/*.md` before/after, per Phase 2's mandate — if the
real diff lands materially above +80 once Phase 4 writes the actual prose (contract text always
drifts slightly from a spec), that's a legitimate loop-back to this phase, not something qa
eyeballs past.**

**analyst.md** — insert immediately before `## When You're Done`. **Delete lines 69-71** (`1.
Re-read your own Phase 1 review.` / `2. Walk every flow...` / `3. For each Phase 1 gap...`) — line
69 is a literal instance of the read-then-confirm anti-pattern this whole design exists to replace;
the contract's Phase 6 entry check states the derive-independently replacement.

```markdown
## Verification Contract

**Phase 1 entry check:** re-derive every "the user can currently do X" claim
against live routes/nav in `src/app/` — not from memory of the codebase.

**Phase 6 entry check:** derive your own inventory of the shipped diff
against Phase 1's intent, independently — don't just re-read your Phase 1
review and confirm it still sounds right.

**Exit ledger:** flows, per-flow auth gates, named exclusions with reasons,
each tagged E1/E2/E3; any "all pages" / "every flow" claim carries its
enumeration command inline or drops the quantifier.
```

**architect.md** — insert before `## Ownership`. **Delete line 49** (`1. Read the relevant
files.`), renumber the remaining "Your Review Process" items 2-6 to 1-5.

```markdown
## Verification Contract

**Entry check:** re-derive Phase 1's route/component inventory and any "X
already exists in `src/components/ui/` / `package.json`" claim directly from
the repo before ruling on it — don't accept Phase 1's citation at face value.

**Exit ledger:** every ruling cites the invariant or file it rests on; a
ruling that cites a file quotes the line, not just the filename. A
load-bearing diff found against Phase 1 loops back to Phase 1; a
non-load-bearing one is logged in the Claims Ledger and the review continues.
```

**tech-lead.md** — insert as new `## 4. Verification Contract`, before `## Ownership`. No clean
deletion found (this file has no read-then-confirm-style prose to supersede) — flagged honestly
rather than forced.

```markdown
## 4. Verification Contract

**Entry check:** re-derive Phase 2's rulings against the actual code before
designing on top of them — every API/prop shape here is literal, verified
code, never a description of what it probably is.

**Reviews:** a review runs the thing it reviews — re-run `stats:escape`,
re-read the files, never recite a prior review's numbers. Exit ledger:
implementation order, named implementer, this design's own Claims Ledger.
```

**database-admin.md** — insert before `## Ownership`. No clean deletion found.

```markdown
## Verification Contract

**Entry check:** re-derive Phase 3's design against the real `schema.ts`
before building — a design referencing a nonexistent table or column bounces
back to tech-lead, never patched around silently.

**Exit ledger:** files changed, revert-proof (pasted failing-test output),
literal `db:push`/`db:generate` output, and a required "What was NOT
verified" heading. A migration's test asserts the resulting row/column
state, never that a function was merely called.
```

**api-developer.md** — insert before `## Ownership`. No clean deletion found.

```markdown
## Verification Contract

**Entry check:** re-derive Phase 3's design against the real `schema.ts` and
route table before building — a design referencing a nonexistent symbol
bounces back to tech-lead, never patched around silently.

**Exit ledger:** files changed, revert-proof (pasted failing-test output),
literal gate output, and a required "What was NOT verified" heading. A
mutation's test asserts the resulting state, never that a function was
merely called — the effect, not the invocation.
```

**ux-developer.md** — insert before `## When You're Done`. No clean deletion found.

```markdown
## Verification Contract

**Entry check:** re-derive api-developer's actual handoff (endpoints, action
signatures, shapes) from the work-log before building — a contract gap kicks
back to api-developer, per this file's First Step, never guessed around.

**Exit ledger:** files changed, revert-proof where applicable, and a
required "What was NOT verified" heading. An interaction's test asserts the
rendered state or `ActionResult<T>` returned, never that a handler was
merely invoked.
```

**full-stack-developer.md** — insert before `## When You're Done`. No clean deletion found; kept
shorter than the cap to match this file's already-lean style (31 lines total).

```markdown
## Verification Contract

**Entry check:** re-derive Phase 3's design against the real schema/routes
before building — a design referencing a nonexistent symbol bounces back to
tech-lead, never patched around silently.

**Exit ledger:** files changed, revert-proof (pasted failing-test output),
and a required "What was NOT verified" heading. Effect-not-invocation applies
to both your server and client tests.
```

**qa.md** — insert after the opening two paragraphs, before `## Test Stack`. **Delete line 41**
(the Feature-Gate Audit's framing sentence: `Tests don't catch a missing gate — a route that
wrongly returns 200 to an under-privileged user still passes happy-path tests (two admin export
routes once shipped without \`hasFeature()\` exactly this way). Verify by *reading the route file
and action body*, not by inferring from green tests:`) — this sentence's "why" is now stated by the
contract's entry check; the mandatory checklist itself (lines 42-46) is unchanged and un-deleted,
it is operational procedure, not restated principle. Section header becomes `## Feature-Gate Audit
(mandatory before PASS)` followed directly by the bullet list.

```markdown
## Verification Contract

**Entry check:** re-run Phase 4's E1 commands and re-derive its E2 claims
yourself before trusting them — this is the Feature-Gate Audit and
no-self-agreeing-mocks discipline below, applied to Phase 4's ledger, not a
parallel list to also do.

**Exit ledger:** PASS/FAIL/BLOCKED, per-claim confirmation against Phase 4's
ledger, and a required "What was NOT verified" heading.
```

**deployment-engineer.md** — insert before `## Ownership`. No clean deletion found.

```markdown
## Verification Contract

**Entry check:** a review runs the thing it reviews — re-run `npm outdated`
and `npm audit` yourself before writing the dependencies-review line; don't
recite a prior review's numbers or a green CI badge.

**Exit ledger:** a `docs/reviews/log.md` line, plus any follow-up routed to
`docs/TODO.md`.
```

## Edge Cases & Risks

- **`worklog-gate.mjs` is the first hook that can block an in-session file edit, repo-wide.** A bug
  here doesn't fail one command, it bricks every `Edit`/`Write` to `src/**`/`drizzle/**` for every
  future session until fixed — categorically higher blast radius than `pre-push-gate.mjs` (which
  only ever blocks `git push`, a rare, late-session action). Mitigation: fail-open on every
  ambiguous condition (parse error, missing directory, git-plumbing failure), and Phase 4/qa must
  smoke-test the live hook against a real `Edit` and a real `Write` call, not just the unit tests,
  before Phase 5 can PASS.
- **`check:ledger`'s grandfather cutoff is a single hardcoded date implementers must remember to
  set correctly.** Get it wrong (e.g., leave the `YYYY-MM-DD` placeholder, or backdate it) and
  either every historical work-log fails `/pre-push` simultaneously, or a work-log that should be
  in scope silently isn't. Mitigation: Phase 5 must run `npm run check:ledger` against the full 45
  existing work-logs before and after setting the real cutoff and confirm the pre-cutoff count is
  zero violations.
- **The `/trivial` no-self-invocation rule is a norm, not a mechanical constraint.** Nothing in
  `worklog-gate.mjs` or the skill file stops an agent from typing `/trivial` itself mid-task; the
  design relies on the agent files' own instructions (and this rule, once Increment 4 states it in
  CLAUDE.md) to hold. This is a real residual gap versus the harvest's GitHub-label mechanism
  (which a PR author literally cannot self-apply) — name it as accepted risk, not a solved problem,
  in the Phase 4/5 handoff.
- **Increment 3's nine-file rewrite touches every agent file in one PR.** A markdown or heading
  error in any one of them is low-risk to app behavior but could break `extractPhaseSection`-style
  parsing if a future tool ever parses agent files programmatically (it doesn't today, beyond
  `check-agent-symbols.mjs`'s fenced-code-block scan) — confirmed none of the nine drafted
  Verification Contract sections above contain a fenced code block, so `check:agent-symbols` has
  nothing new to false-positive on from this change.
- **E2E blast radius (explicit, per this template's own rule):** **zero** existing Playwright specs
  under `e2e/` are affected — nothing in any of the five increments touches `src/`, `auth.ts`,
  `proxy.ts`, or any runtime route; confirmed against Phase 1's Surface line and re-confirmed here.
  **Unit tests:** `scripts/pre-push-gate.test.mjs` and `scripts/commit-msg.test.mjs` are unaffected
  (different files, no shared exports, confirmed via `vitest.config.ts`'s
  `include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.mjs"]` glob, which will
  pick up the new `scripts/worklog-gate.test.mjs` automatically with no config change needed). The
  only genuinely new regression surface this feature creates is `worklog-gate.mjs` itself and
  `check-ledger.mjs` — both get their own fixture tests against the real 45-work-log corpus, which
  is the closest thing to an "existing suite" this feature can break, and it's new, not existing.

## Implementer

**Full-stack-developer for Increments 1-3; tech-lead (self) for Increment 4; full-stack-developer
for Increment 5 if shipped.** Justification: this is dev-tooling — small, cross-cutting Node
scripts plus markdown-file edits, not a server/client split with a real API boundary. Splitting
Increment 1 between api-developer (script logic) and someone else (settings.json, skill file) would
add handoff overhead for a ~150-200 line total change, which is exactly full-stack-developer's
stated fit ("small, tightly coupled... cross-cutting utilities... where splitting would add
overhead"). Increment 3's nine-file rewrite is prose/markdown editing across files that don't have
a server/client distinction at all — again a poor fit for the specialist split. Increment 4
(CLAUDE.md rewrite) is tech-lead's own documentation-ownership territory per the Agent Roster table
and is small enough to self-implement rather than hand off.

**Cross-model override plan (P5/P6), per design doc §5 and Increment 4's own content:** when
qa (Phase 5) and analyst (Phase 6) are spawned for this feature's own pipeline run, invoke them
with a `model` override different from whatever model full-stack-developer/tech-lead ran Phase 4
under — e.g., if Phase 4 runs on `sonnet` (the roster default), spawn Phase 5/6 with `opus` or
another distinct model via the Agent tool's per-invocation override. This is the same-family-risk
mitigation the design doc names as "cheap, secondary" — apply it to this feature's own pipeline run
as the first real test of the practice Increment 4 is about to write into CLAUDE.md.

## Claims Ledger

| # | Claim | Class | Evidence |
|---|-------|-------|----------|
| 1 | `check-worklog.mjs` line 765 hardcodes `isTrivialLabeled: false` with the cited comment; line 81 is `TRIGGER_PREFIXES = ["src/", "drizzle/"]` | E1 | `Read` of the full file this session; independently re-derived, not taken from Phase 2's quote, no diff |
| 2 | `.claude/settings.json` still has exactly one `PreToolUse` entry (`Bash` → `pre-push-gate.mjs`) | E1 | Full-file `Read` this session, lines 46-56 — re-derived independently, no diff |
| 3 | `scripts/pre-push-gate.mjs`'s hook mode fails open on JSON parse error (`catch { process.exit(0) }`) and stamps/checks a HEAD-scoped marker — the pattern this design's Trivial-marker and fail-open rules are modeled on | E1 | Full-file `Read` this session |
| 4 | `vitest.config.ts`'s `include` glob (`scripts/**/*.test.mjs`) will pick up a new `worklog-gate.test.mjs` with no config change | E1 | `Read` of `vitest.config.ts` this session |
| 5 | `.gitignore` currently ignores `.claude/pre-push-ok.json` but has no entry for a `trivial-ok.json` marker | E1 | `grep -n "claude\|pre-push-ok" .gitignore` this session — one match |
| 6 | `check-agent-symbols.mjs`'s only current `RETIRED` entry (`requireRole`) is npvitals-specific and does not exist in this repo's `src/` | E2 | Read of the harvest file's `RETIRED` array; not independently grepped against this repo's `src/` for absence (reasonable given the symbol is invented for a different codebase's Milestone 1, but flagging the gap rather than asserting E1) |
| 7 | The nine agent Verification Contract drafts above total 85 gross / 5 deleted / net +80 lines | E1 | Counted line-by-line against each drafted markdown block in this section; not yet counted against the *actual* files post-edit (that recount is Phase 5's job per the mandate above) |

**What was NOT verified:** whether `/trivial` as a slash-command skill can actually be restricted
so only an operator-typed invocation (not an agent-issued one) triggers it — Claude Code's skill
invocation model doesn't distinguish "typed by the human" from "invoked by the agent mid-turn" at
the tool layer, so this is a norm enforced by instruction, not a mechanism enforced by code. Flagged
as a residual risk above rather than asserted as solved. Also not verified: the real
`check-agent-symbols.mjs` search-root change (`apps`/`packages` → `src`) hasn't been dry-run against
this repo's actual `.claude/agents/*.md` files for any currently-stale symbol beyond the harvest's
own `requireRole` example — Phase 4 should run it once with a temporary non-empty `RETIRED` test
entry to confirm the mechanism actually fires here, before shipping it with an empty list.

## Handoff

→ **full-stack-developer (Phase 4, Increments 1-3 and 5)**, **tech-lead/self (Increment 4)**.
Build in the stated order — mechanical gates (1-3) before the CLAUDE.md prose that references them
(4) — and do not skip the live-hook smoke test named in Edge Cases before calling Increment 1 done.
The four Phase 2 load-bearing items (Trivial exemption, `TRIGGER_PREFIXES` preservation,
calendar-date freshness, missing-directory fail-open) are each specified literally above; a Phase 4
implementation that diverges from any of them without flagging it back to this phase is the kind of
silent architectural drift Phase 2's own ruling warned against. Spawn qa (Phase 5) and analyst
(Phase 6) with a `model` override distinct from Phase 4's, per the Claims Ledger and Implementer
section above.

---

# Phase 4 — Implementation (full-stack-developer, Increments 1, 2, 3, 5)

**Scope note:** Increment 4 (the CLAUDE.md pipeline-section rewrite) is tech-lead's own territory per
Phase 3's Implementer section and was explicitly excluded from this assignment — not implemented
here, handed off below.

## Prior-Phase Spot-Check

Entry check performed before writing any code, per the task's explicit instruction, re-deriving
Phase 3's two named load-bearing symbol claims from the primary sources rather than trusting the
work-log's own quotes:

1. **Absorb-deletion targets are real.** Read `.claude/agents/analyst.md` lines 68-71,
   `.claude/agents/architect.md` lines 47-54, and `.claude/agents/qa.md` lines 39-46 directly.
   Confirmed verbatim: analyst.md line 69 is exactly `1. Re-read your own Phase 1 review.`, line 70
   `2. Walk every flow you described...`, line 71 `3. For each Phase 1 gap...`; architect.md line 49
   is exactly `1. Read the relevant files.` with items 2-6 following as claimed; qa.md line 41 is
   exactly the "Tests don't catch a missing gate..." framing sentence Phase 3 named, with the
   mandatory bullet checklist on the following lines unchanged. No diff against Phase 3's citations.
2. **`TRIGGER_PREFIXES` and the `isTrivialLabeled` hardcode exist in the harvest as claimed.** Read
   `~/git/npvitals/apps/npvitals/scripts/check-worklog.mjs` directly: line 81 is exactly
   `export const TRIGGER_PREFIXES = ["src/", "drizzle/"];`; line 765 is exactly `isTrivialLabeled:
   false, // hook mode has no self-service escape hatch — see design doc § 1`. No diff.

**Verdict: no bounce.** Both symbol references check out against primary sources — proceeded to
build per Phase 3's literal spec. (I also re-read `scripts/pre-push-gate.mjs` and its test file,
`.claude/settings.json`, `.gitignore`, `package.json`, `.claude/skills/pre-push/SKILL.md`,
`docs/work-log/_template.md`, all nine agent files, and `check-audit-coverage.mjs` /
`check-sql-date.mjs` for house style before writing anything — no diffs against Phase 1-3's claims
about any of these found.)

## Files Created

- `scripts/worklog-gate.mjs` — Increment 1. PreToolUse hook (`Edit|Write`) enforcing Workflow Rule 8. Hook-mode-only port of the harvested `check-worklog.mjs`, with a same-day-calendar-date freshness check (not the harvest's session-handoff-file mechanism, which this repo doesn't have), a "What was NOT verified" heading requirement on qualifying work-logs' substantive Phase 4/5 sections, and a missing-`docs/work-log/`-directory fail-open branch the harvest doesn't have. Exports: `TRIGGER_PREFIXES`, `isTriggerPath`, `extractPhaseSection`, `worklogMentionsPath`, `isPhaseSectionSubstantive` (addition beyond spec, see Implementer Notes), `hasNotVerifiedHeading`, `isSameDayFresh`, `readTrivialMarker`, `trivialMarkerMatches`, `evaluateWorklogGate`.
- `scripts/worklog-gate.test.mjs` — Increment 1. 46 tests: pure-function unit tests, an `evaluateWorklogGate` allow/block matrix, and a fixture pass against all 46 real `docs/work-log/*.md` files (asserts no throw across phases 1-6, plus 3 spot-checked boundary assertions against this very work-log's own Phase 1/2/3 sections).
- `.claude/skills/trivial/SKILL.md` — Increment 1. The `/trivial` skill: the only writer of `.claude/trivial-ok.json` (single-path, single-use, 10-minute expiry). States the no-self-invocation rule (an agent must never run it on its own to route around a block).
- `scripts/check-ledger.mjs` — Increment 2. `npm run check:ledger` tripwire; scans `docs/work-log/*.md` dated after `LEDGER_GRANDFATHER_CUTOFF = "2026-09-07"` for any phase 3-6 marked `Complete` in the Per-Phase Status table with no `| # | Claim | Class | Evidence |` table in that phase's section. Imports `extractPhaseSection` from `worklog-gate.mjs` (one parser, two consumers, per Phase 3's instruction). Exports `LEDGER_GRANDFATHER_CUTOFF`, `LEDGER_TABLE_RE`, `STATUS_ROW_RE`, `fileDate`, `isInScope`, `completedPhases`, `checkWorklog`.
- `scripts/check-agent-symbols.mjs` — Increment 3. Ported from `~/git/npvitals/scripts/check-agent-symbols.mjs`; search root changed from `apps`/`packages` to `src` (this repo's layout); `RETIRED` ships empty (no npvitals-specific symbol applies here). Proven to actually fire (see Implementer Notes / revert-proof below), not shipped on faith.
- `scripts/quantifier-lint.mjs` — Increment 5. Dry-run-only quantifier linter, built to produce the required dry-run evidence. **Not wired into `check`, `/pre-push`, or any hook** — see Implementer Notes for the drop decision and its evidence.

## Files Modified

- `.claude/settings.json` — added a second `PreToolUse` object, `matcher: "Edit|Write"` → `node scripts/worklog-gate.mjs`, alongside the existing `Bash` → `pre-push-gate.mjs` entry (Increment 1).
- `.gitignore` — added `.claude/trivial-ok.json` alongside the existing `.claude/pre-push-ok.json` entry (Increment 1).
- `package.json` — added `check:agent-symbols` and `check:ledger` scripts; `check` alias now runs `check:audit && check:sql-date && check:agent-symbols && check:ledger` (Increments 2/3).
- `.claude/skills/pre-push/SKILL.md` — added Step 3e (Ledger-Presence Tripwire, hard-blocking, inserted after Step 3d/before Step 4) and Step 3f (Agent-Symbols Tripwire) (Increments 2/3).
- `docs/work-log/_template.md` — every phase (1-6) gains a closing Claims Ledger + "What was NOT verified" block before its closing `---` (or at EOF for Phase 6); phases 2-6 gain a "Prior-Phase Spot-Check" block immediately after the phase heading (Increment 2).
- `.claude/agents/analyst.md`, `architect.md`, `tech-lead.md`, `database-admin.md`, `api-developer.md`, `ux-developer.md`, `full-stack-developer.md`, `qa.md`, `deployment-engineer.md` — each gains a `## Verification Contract` section per Phase 3's literal per-agent text (Increment 3). Named absorb-deletions applied exactly as specified: analyst.md lines 69-71 deleted (the read-then-confirm numbered list); architect.md line 49 deleted, items 2-6 renumbered 1-5; qa.md's Feature-Gate Audit framing sentence deleted, header now leads directly into the bullet checklist. `docs/decisions.md` was NOT touched this phase — Phase 3's four "Decisions Needed" items are tech-lead's to land with Increment 4 per the design's own sequencing (CLAUDE.md prose should describe mechanisms that already exist), and are flagged again in the Handoff below so they aren't dropped.

## Schema Changes

None. No `src/lib/db/schema.ts` touch anywhere in this feature — confirmed again at Phase 4, consistent with Phase 1/2/3's repeated confirmation. Nothing applied via `db:push` or `db:generate`.

## Audit Events

Not applicable. This feature has no app-facing mutation surface — no route handler, server action, or `db.insert/update/delete` call exists anywhere in the four implemented increments. `npm run check:audit` (which enforces the audit-write requirement on `actions.ts` mutations) passed with zero findings against this diff, confirming there is nothing here for `recordAudit()` to cover. The "mutations" this feature performs — writing `.claude/trivial-ok.json`, appending a `docs/work-log/*.md` section — are dev-loop tooling state, not `audit_events` rows, matching every other agent/hook/skill file in `.claude/` and `scripts/`.

## Implementer Notes

**Deviation 1 (flagged, not silently patched) — agent-file roster net delta is +89 lines, not
Phase 3's stated ≤+80 cap.** `wc -l .claude/agents/*.md` before: 545 total (31-83 per file). After:
634 total (41-91 per file). Net +89 (101 insertions, 12 deletions, confirmed via `git diff --stat`).
Every one of the nine Verification Contract blocks was copied verbatim from Phase 3's literal text
(no invented content, no padding), and every named absorb-deletion was applied exactly as Phase 3
specified (verified against the actual diff, not eyeballed) — the overage is not implementer
improvisation, it is Phase 3's own line-count arithmetic (predicted 85 gross / 5 deleted / net +80)
undercounting by 16 gross / 7 deleted relative to what its own literal contract text and named
deletions actually produce once put in the real files (e.g. blank-line separators around each
`**Entry check:**` / `**Exit ledger:**` pair, which Phase 3's arithmetic did not appear to count).
Per Phase 3's own stated rule ("if the real diff lands materially above +80... that's a legitimate
loop-back to this phase, not something qa eyeballs past"), I am flagging this rather than trimming
prose to force compliance — cutting words to hit a line-count target is exactly the "confidently-wrong
theatre" this design exists to avoid. Whether a 9-line (11%) overage is "material" enough to loop
back to Phase 3 is a judgment call I'm leaving to qa/tech-lead with the numbers in hand, not
deciding unilaterally.

**Deviation 2 (flagged) — `isPhaseSectionSubstantive()` is an addition beyond Phase 3's exported-function
list.** Phase 3's spec named the exported functions for `worklog-gate.mjs` but did not specify HOW
to detect that a qualifying work-log's Phase 4/5 section is "substantive" (i.e., not just the bare
template placeholder) before requiring the "What was NOT verified" heading on it. I implemented this
the same way the harvest's own `VERDICT_PLACEHOLDER` constant works: two literal marker strings
(`` `path/to/file` — purpose `` for Phase 4, `[PASS | FAIL | BLOCKED — name the unmet prerequisite]`
for Phase 5) taken directly from `docs/work-log/_template.md`'s unfilled sections, embedded as
constants so the decision function stays pure (no template file I/O at evaluation time). This is an
addition, not a divergence from any literal contract Phase 3 wrote — but it is a real implementation
choice Phase 3 left open, so it's named here rather than presented as "the design said to do this."

**Decision (per instruction, not a deviation) — Increment 5 (quantifier linter) built and dry-run,
NOT wired in.** Ran `node scripts/quantifier-lint.mjs` against the real 46-file corpus: 131 candidate
hits (`\b(all|every|none|the \d+)\b` with no fenced code block within 5 lines). I read and classified
all 131 hits (the full population, not a sample — the dry-run's total output was short enough to
review in full) into true positives (a genuinely unverified quantified claim with no evidence nearby,
fenced or otherwise — e.g. "migrated all six existing ad-hoc audit strings" in a Phase 4 Implementer
Notes with no accompanying grep/count) versus false positives. False-positive classes found, in
descending frequency: (a) form-field answers ("None"/"none" in Schema Changes / Audit Events /
Failures fields — not a claim at all); (b) **self-evidenced prose the checker doesn't recognize
because the evidence is inline, not fenced** — e.g. "Ran `npm run test:e2e` — PASS, 20 tests, 0
failures, 22.0s" carries its own command and numbers in the same sentence, but `worklog-gate.mjs`'s
real-corpus fixture pass and this linter's own heuristic only look for a ``` fence, and this repo's
actual QA-writing style almost never pastes fenced command output — it narrates it inline; this is a
false-positive class Phase 3 did not anticipate, on top of the "genre convention" class it did; (c)
Phase 6 narrative recaps restating an already-verified Phase 5 fact without re-showing evidence; (d)
a code comment (`// Wipe all TOTP state...`) inside a fenced block wider than the 5-line window; (e)
this very work-log's own Phase 3 meta-discussion of the linter concept, self-flagged. True-positive
count: approximately 7 of 131 (~5%) — dramatically below Phase 3's ~50% kill criterion. **Decision:
DROP.** Not wired into `npm run check`, `/pre-push`, or any `SessionStart` hook. The script is kept
in `scripts/` as the dry-run artifact (clearly commented as not wired in) rather than deleted, so the
evidence for this decision is reproducible rather than only asserted in prose.

**Revert-proofs (summarized here; full command output pasted in this response, not duplicated into
the work-log file):**
- `worklog-gate.mjs`: 46/46 unit tests pass (`scripts/worklog-gate.test.mjs`). Live CLI smoke tests
  against an isolated scratch git repo (not this repo, to get a controlled non-fresh/non-mentioning
  state): BLOCK on an unmentioned/non-fresh trigger path (exit 2, literal RULE8 message); ALLOW when
  a work-log mentions the path (exit 0); ALLOW via the same-day-freshness leg (untracked work-log,
  exit 0); ALLOW identically for both `Edit`-shaped and `Write`-shaped stdin payloads. Fail-open
  cases: unparseable stdin (exit 0, stderr warning), missing `docs/work-log/` directory (exit 0),
  git-plumbing failure / non-git cwd (exit 0) — see "What was NOT verified" for a caveat on the last
  one.
- `check-ledger.mjs`: passes on the real 46-file corpus (0 in scope, all grandfathered at the
  2026-09-07 cutoff). A throwaway fixture (`2026-09-08-zz-ledger-fixture.md`, Phase 3 marked
  Complete, no Claims Ledger table) fails with the exact expected violation message; deleted, and
  the corpus passes again.
- `check-agent-symbols.mjs`: passes trivially with `RETIRED = []` (9 files, 0 enforced). Planted a
  temporary `RETIRED` entry (`totallyFakeRetiredSymbolXYZ`) plus a matching fenced-code-block use in
  `qa.md`, confirmed FAIL citing the exact file:line; reverted both; confirmed PASS again, and
  `git diff --stat` on both files shows no residual change.

**Full gates (see this response for literal output):** `npm run typecheck` — PASS, zero errors.
`npm test` — 471 passed / 471, 37 files. `npm run check` — all four sub-checks PASS on the real repo
(`check:audit`, `check:sql-date`, `check:agent-symbols`, `check:ledger`). `npm run lint` — zero
output, zero warnings (`--max-warnings=0`).

**Critical self-test (hook cannot retroactively affect this session's completed edits, but every
remaining edit is outside the trigger set by construction):** every file touched in this Phase 4
implementation — `scripts/*`, `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.claude/settings.json`,
`.gitignore`, `package.json`, `docs/work-log/*.md` — falls under `scripts/`, `.claude/`, `docs/`, or
repo-root config files, none of which are in `TRIGGER_PREFIXES = ["src/", "drizzle/"]`. Verified by
listing every path in the Files Created/Modified sections above against that constant, not assumed.
`worklog-gate.mjs` registering live partway through this session (Increment 1 lands before
Increments 2/3/5) therefore could not have blocked any of my own subsequent edits even if the hook
reloaded mid-session — there was never a trigger-path edit in this implementation to block.

## What was NOT verified

- **The live PreToolUse mechanism has never fired from the actual Claude Code harness against a real
  `Edit`/`Write` tool call in a real session** — only against the CLI wrapper invoked directly via
  Bash (`echo '{"tool_input":...}' | node scripts/worklog-gate.mjs`), which exercises identical code
  and stdin-parsing logic but is not proof the harness sends the exact payload shape assumed
  (`tool_input.file_path`). This mirrors `pre-push-gate.mjs`'s own precedent (same assumption, same
  unverified gap) but is named explicitly here per Phase 2's mandate that Phase 4/qa smoke-test the
  live hook, not just the unit tests. **This is the single largest verification gap in this phase —
  qa should attempt a real `Edit` on a trigger-path file in a live session as part of Phase 5, or
  explicitly accept this residual risk if that's impractical to arrange safely.**
- **The `/trivial` skill's end-to-end flow is untested.** I wrote the skill file and the marker-read/
  consume logic in `worklog-gate.mjs` and unit-tested `readTrivialMarker`/`trivialMarkerMatches`
  against synthetic fixtures, but never actually invoked `/trivial` as a skill and then made a real
  blocked edit succeed against the stamped marker. The single-use deletion logic (`unlinkSync` after
  a matching exempt decision) is exercised only by code inspection, not by an end-to-end run.
- **The no-self-invocation rule for `/trivial` is a norm, not a mechanism**, exactly as Phase 3 named
  it — nothing in the skill file or the hook stops an agent from typing `/trivial` itself mid-task.
  Unchanged residual risk from Phase 3; not solved here, not silently assumed solved.
- **The git-plumbing fail-open path leaks the child process's raw stderr** (e.g. `fatal: not a git
  repository...`) to the hook's own stderr on exit 0, because `execFileSync` inherits the child's
  stderr by default (confirmed with an isolated Node repro this session) even though the error is
  correctly caught and the function still returns `true`/fails open. Whether the Claude Code harness
  surfaces stderr from an exit-0 PreToolUse hook anywhere user-visible was not verified — if it does,
  this is cosmetic noise; if it doesn't, it's nothing. Not fixed (would require redirecting the git
  calls' stdio explicitly), named instead since `pre-push-gate.mjs` has the identical unexamined
  behavior and this phase's job was to match house style, not silently expand scope to fix an
  adjacent script.
- **`check-agent-symbols.mjs`'s `isActuallyRetired()` self-validation has never fired for real**
  (the temporary revert-proof test proved the violation-detection path, not the stale-entry-ignored
  path, since `RETIRED` ships empty in the shipped state) — this mirrors the harvest's own posture
  exactly (Phase 3 Claims Ledger row 6 named the same gap) and is inherited, not newly introduced.
- **The quantifier-lint true-positive classification (approximately 7/131, ~5%) is my own single-pass
  reading**, not cross-checked by a second reviewer — a reasonable person could classify a handful of
  the borderline "Phase 6 recap" or "self-evidenced-but-not-fenced" lines differently. The margin
  below the ~50% kill criterion is wide enough (roughly 10x) that reasonable reclassification
  disagreement would not change the DROP decision, but the exact count should be treated as
  approximate, not audited.
- **Whether a fork with `docs/work-log/` present but genuinely empty (zero `.md` files besides
  `_template.md`) behaves correctly was not separately tested** — only the "directory missing
  entirely" fail-open case was live-tested; an empty-but-present directory falls through
  `evaluateWorklogGate`'s normal Step 4 (zero qualifying work-logs → block), which is covered by unit
  tests but not by a live CLI smoke test.

## Claims Ledger

| # | Claim | Class | Evidence |
|---|-------|-------|----------|
| 1 | `scripts/worklog-gate.mjs` blocks a trigger-path edit with no covering work-log (exit 2) and allows one covered by mention, freshness, or a trivial-marker match (exit 0), on both Edit- and Write-shaped stdin payloads | E1 | Live CLI smoke tests against an isolated scratch git repo, this session (7 scenarios, all pasted in this response); 46/46 `scripts/worklog-gate.test.mjs` unit tests pass |
| 2 | `scripts/check-ledger.mjs` fails on an in-scope work-log with a `Complete` phase and no Claims Ledger table, and passes on the real 46-file corpus (0 in scope, cutoff `2026-09-07`) | E1 | Throwaway fixture created, run, deleted, corpus re-verified passing — all three runs pasted in this response |
| 3 | `scripts/check-agent-symbols.mjs` fires on a real stale-symbol violation and returns to a clean pass after revert, with `git diff --stat` confirming no residual change | E1 | Planted `totallyFakeRetiredSymbolXYZ` in `qa.md` + a matching `RETIRED` entry, ran (FAIL), reverted both, ran again (PASS), ran `git diff --stat` — all pasted in this response |
| 4 | Agent-file roster net delta is +89 lines against Phase 3's stated ≤+80 cap; every contract's text and every named absorb-deletion matches Phase 3's literal spec exactly | E1 | `wc -l .claude/agents/*.md` before (545) and after (634) this session; `git diff --stat -- .claude/agents/` (101 insertions(+), 12 deletions(-)); each of the nine file diffs read in full and compared line-by-line against Phase 3's literal blocks |
| 5 | `npm run typecheck`, `npm test` (471/471), `npm run check` (all 4 sub-checks), and `npm run lint` all pass clean on the real repo with every Increment 1/2/3/5 file in place | E1 | All four commands run this session, full output pasted in this response |
| 6 | The quantifier linter's true-positive rate on the real 46-work-log corpus is approximately 7/131 (~5%), well under Phase 3's ~50% kill criterion, driving the DROP decision | E1/E3 | `node scripts/quantifier-lint.mjs` run against the real corpus (131 hits, E1); every hit read and classified by hand this session (E3 — a judgment call, not a mechanical count; see "What was NOT verified" for the honesty caveat on this row) |
| 7 | Every file touched in this Phase 4 implementation falls outside `TRIGGER_PREFIXES` (`src/`, `drizzle/`) | E1 | Every path in Files Created/Modified above checked against the constant; no `src/` or `drizzle/` path appears anywhere in this phase's diff |

## Handoff

→ **tech-lead (Increment 4)** — the CLAUDE.md pipeline-section rewrite (Evidence Classes and Entry
Checks subsection, per Phase 3's outline), plus landing the four Decisions Needed items from Phase 2
(new hook class, new script-naming convention + harvest provenance, the local Trivial-exemption
mechanism, the ledger grandfather cutoff and its date — now concretely `2026-09-07`) in
`docs/decisions.md`. Also: a judgment call on Deviation 1 above (the +89 vs ≤+80 net-line overage) —
whether it's material enough to loop back to Phase 3 for a lighter contract text, or acceptable as
shipped.

→ **qa (Phase 5)**, after Increment 4 lands. Specifically flagging for Phase 5: (1) the live-hook
harness gap named in "What was NOT verified" — attempt a real `Edit` on a trigger-path file in a
live session if practical; (2) run `npm run check`, `npm test`, `npm run typecheck`, `npm run lint`
independently rather than trusting this phase's pasted output (per the no-self-issued-verdicts
principle this whole feature exists to install); (3) confirm the Feature-Gate Audit table below can
correctly say "no protected routes touched" — there is no route, action, or UI in this feature to
audit, confirmed again at Phase 4.

---

## Increment 4 — CLAUDE.md Rewrite + Decisions Log (tech-lead)

### Prior-Phase Spot-Check (Increment 4's entry check)

Re-derived two of full-stack-developer's Increment 1-3/5 E1 claims from primary sources, before
reading their claimed numbers as settled:

1. **`npm run check` — all four sub-checks pass.** Ran `npm run check` fresh this session:
   `check:audit` PASS, `check:sql-date` PASS, `check:agent-symbols` PASS (9 files, 0 retired
   symbols enforced), `check:ledger` PASS (46 work-logs found, 0 in scope — dated after
   `2026-09-07` — 46 grandfathered). Matches Phase 4's Claims Ledger row 5 exactly. No diff.
2. **Agent-roster line delta is +89, not Phase 3's ≤+80 cap.** Ran `git diff --stat
   .claude/agents/` fresh: `9 files changed, 101 insertions(+), 12 deletions(-)` — net +89,
   matching Phase 4's Deviation 1 and Claims Ledger row 4 exactly (545 → 634 total, confirmed via
   `wc -l .claude/agents/*.md`). No diff.

**Verdict: no bounce.** Both re-derived claims check out against primary sources; proceeded to rule
on the two flagged deviations and write Increment 4 on that basis. (Also read every landed file
this Increment touches before editing anything: `scripts/worklog-gate.mjs`,
`scripts/check-ledger.mjs`, `scripts/check-agent-symbols.mjs`, `scripts/quantifier-lint.mjs`,
`.claude/skills/trivial/SKILL.md`, `.claude/settings.json`, `package.json`,
`.claude/skills/pre-push/SKILL.md` Steps 3e/3f, `docs/work-log/_template.md`, and all nine agent
files' Verification Contract sections — no diffs found against Phase 3/4's descriptions of any of
them.)

### Ruling 1 — Roster delta +89 vs Phase 3's ≤+80 cap: **accepted, with a corrected cap rationale**

The overage is real (confirmed above, not eyeballed) but it is not scope creep. Every one of the
nine Verification Contract blocks was copied verbatim from Phase 3's own literal text, and every
named absorb-deletion was applied exactly as specified — full-stack-developer's Deviation 1 note
is accurate that the gap is arithmetic, not improvisation. My own Phase 3 estimate (85 gross / 5
deleted / net +80) undercounted formatting overhead intrinsic to rendering the literal contract
text as real markdown — blank-line separators around each `**Entry check:**` / `**Exit ledger:**`
pair, and the section heading itself — which the Phase 3 arithmetic did not line-count. That is my
error to own, not the implementer's to absorb by cutting content. Per my own Phase 3 rule ("cutting
words to hit a line-count target is exactly the confidently-wrong theatre this design exists to
avoid"), I am not naming any trims. The cap was a planning estimate, not a hard budget with
independent justification — a 9-line (11%) overage, entirely explained by whitespace this phase's
own arithmetic failed to count, does not meet the bar for a loop-back. Ruling: **accept +89 as
shipped.** No agent-file content changes result from this ruling.

### Ruling 2 — Increment 5 (quantifier linter): **delete `scripts/quantifier-lint.mjs`**

full-stack-developer's dry run found a ~5% true-positive rate against the real 46-work-log corpus
(approximately 7 of 131 candidate hits), roughly 10x below Phase 3's own stated ~50% kill
criterion, and Phase 3's own wording was explicit that this is "not a soft commitment." Kept-but-
unwired was the implementer's instinct (preserve the dry-run artifact as reproducible evidence for
the drop decision) and it was a reasonable one, but on reflection it is the wrong shape for this
repo's convention: every other file under `scripts/` is either invoked by an `npm run` script or
registered as a hook — an orphan script with neither is dead code with no test coverage and no
CI attention, which will silently bit-rot against its two live imports (`extractPhaseSection` from
`worklog-gate.mjs`, `completedPhases` from `check-ledger.mjs`) the next time either of those
signatures changes, and nobody would notice. The dry-run's evidence (the exact regex, the 131-hit
count, the classified false-positive taxonomy) is already fully preserved in prose in
full-stack-developer's Phase 4 "Implementer Notes" and Claims Ledger row 6 above — reproducible
from the work-log alone if anyone ever wants to re-run the experiment, without needing the file to
persist in `scripts/`. **Ruling: delete.** Done this session (`rm scripts/quantifier-lint.mjs`);
confirmed via `grep -rn "quantifier-lint"` across `scripts/`, `package.json`, and `.claude/` that
nothing else references the file, and `npm run check` re-run clean after deletion (unaffected —
nothing wired ever pointed at it). This supersedes full-stack-developer's Phase 4 statement that
the file "is kept in `scripts/` as the dry-run artifact... rather than deleted" — that statement is
left intact above as the historical record of what Phase 4 actually did and why; this ruling is
the Increment 4 override of it, not a silent edit to their prose.

### Files Modified (Increment 4)

- `CLAUDE.md` — new `### Evidence Classes and Entry Checks` subsection (E1/E2/E3 definitions,
  entry-check derive-then-diff rule with load-bearing-vs-logged distinction, no-self-issued-
  verdicts rule including the Bug-Fix Variant's "implementer-verified is provisional until Phase 6"
  clause, P5/P6 cross-model override note), inserted between the existing loop-back sentence and
  `### Phase 1` — Phase 3's outline said to place it "before `### Classification`," which is not a
  reachable position given Classification precedes the loop-back sentence in the actual file; read
  as a typo in my own Phase 3 outline (the unambiguous instruction was "directly after the
  loop-back sentence," which is where it is) and corrected here rather than looped back over, since
  this is my own prior-phase text and the fix is non-load-bearing against anything Phase 1/2 ruled.
  One clause appended to each of the Phase 4/5/6 Gate bullets pointing at the new subsection (no
  bullet deleted or restated, per Phase 3's "what this replaces" instruction). One sentence added to
  the Agent Roster paragraph. Workflow Rule 8 updated to name `scripts/worklog-gate.mjs` and the
  `/trivial` skill as the enforcement mechanism, including the no-self-invocation instruction.
  Workflow Rule 5 updated to name `check:ledger`/`check:agent-symbols` as `/pre-push` hard blocks.
  Common Commands table updated to list `check:agent-symbols`/`check:ledger` and correct the
  now-stale "Both tripwires in sequence" line (was two, is now four) — a factual-accuracy fix
  outside Phase 3's literal outline but required by this feature's own "no enforcement claim may be
  false" standard once the two new tripwires existed. Net diff: `git diff --stat CLAUDE.md` → 1
  file changed, 23 insertions(+), 7 deletions(-).
- `docs/decisions.md` — four new numbered entries (DECISION-030 through DECISION-033, newest
  first): DECISION-030 (new `Edit|Write` `PreToolUse` hook class + mandatory fail-open posture),
  DECISION-031 (`worklog-gate.mjs`/`check-ledger.mjs` naming conventions + npvitals harvest
  provenance), DECISION-032 (local `/trivial` Trivial-exemption mechanism, operator-only,
  single-use), DECISION-033 (`check:ledger` grandfather cutoff, `2026-09-07`, mirroring
  `stats:escape`'s `2026-05-18` precedent). Each attributes its ruling chain (architect Phase 2 →
  tech-lead Phase 3 → full-stack-developer Phase 4) per the task instruction.
- `scripts/quantifier-lint.mjs` — **deleted** (Ruling 2 above).
- `docs/work-log/2026-09-07-verification-contracts.md` — this Increment 4 section; Per-Phase Status
  row 4 updated to reflect Increment 4 landing and the Ruling 2 outcome.

### Claims Ledger (Increment 4)

| # | Claim | Class | Evidence |
|---|-------|-------|----------|
| 1 | `npm run check` (all four sub-checks) passes clean on the real repo, both before and after deleting `scripts/quantifier-lint.mjs` | E1 | `npm run check` run twice this session, full output both times — pre-deletion matches Phase 4's Claims Ledger row 5; post-deletion re-run shows identical pass output |
| 2 | Agent-roster net delta is exactly +89 lines (101 insertions, 12 deletions across 9 files), matching Phase 4's Deviation 1 and Claims Ledger row 4 with no diff | E1 | `git diff --stat .claude/agents/` and `wc -l .claude/agents/*.md` (634 total) run fresh this session, independently of Phase 4's citation |
| 3 | No remaining reference to `quantifier-lint` anywhere in `scripts/`, `package.json`, or `.claude/` after deletion | E1 | `grep -rn "quantifier-lint" scripts/ package.json .claude/` run this session — zero hits |
| 4 | `.claude/skills/pre-push/SKILL.md` Steps 3e/3f exist exactly as Phase 3/4 described (Ledger-Presence Tripwire, Agent-Symbols Tripwire, both hard-blocking) | E1 | `sed -n` read of the live file this session, lines 89-127 — matches CLAUDE.md Rule 5's new clause and the pre-push additions named in my task instructions |
| 5 | All nine agent files carry a `## Verification Contract` (or `## 4. Verification Contract` for tech-lead.md) section matching Phase 3's per-file spec | E1 | `grep -n "Verification Contract"` run against all nine files this session — one match each, at the line numbers Phase 4 claimed |
| 6 | `CLAUDE.md`'s net diff for this Increment is 23 insertions / 7 deletions, staying within the spirit of Phase 3's "must not grow beyond the outline's budget" instruction (no new top-level sections beyond the one named subsection; all other changes are single-clause appends or factual corrections) | E1 | `git diff --stat CLAUDE.md` run this session |

### What was NOT verified (additions to the Phase 4 list above)

- **This ruling did not re-attempt the live-harness PreToolUse smoke test** that Phase 4's own "What
  was NOT verified" flagged as the single largest gap (whether the real Claude Code harness sends
  `tool_input.file_path` in the shape `worklog-gate.mjs` assumes). That remains qa's to attempt in
  Phase 5, unchanged from Phase 4's handoff.
- **The corrected line-count rationale in Ruling 1 (blank-line/heading overhead) was reasoned from
  reading the diffs, not independently re-derived by re-running Phase 3's original arithmetic
  line-by-line against the actual rendered markdown.** I read all nine diffs in full and the
  explanation is consistent with what I saw, but I did not construct a formal line-by-line
  reconciliation table proving the exact 16-gross/7-deleted gap full-stack-developer cited. This is
  an E2/E3 judgment, not an E1 recount — named honestly rather than dressed up as a verified tally.
- **Whether any fork or future contributor reads Phase 3's now-corrected "before `### Classification`"
  placement instruction literally and gets confused was not tested** — I resolved the apparent
  contradiction in my own outline text by inferring intent, not by asking the operator to confirm
  which half of the sentence was the typo. If that inference is wrong, the fix is a one-line CLAUDE.md
  move, not a structural problem.
- **The four `docs/decisions.md` entries were not cross-checked against a decisions-log linter or
  any automated numbering-collision check** — `docs/decisions.md` has no such tooling; I confirmed
  the next free number (030) by reading the file's top entry (029) directly, and assigned 030-033
  in ascending order by hand, then re-read the full inserted block once after writing to confirm no
  duplicate numbers or malformed headers.

### Handoff

→ **qa (Phase 5)**. Increment 4 is landed: CLAUDE.md's pipeline-section rewrite, the four
`docs/decisions.md` entries, and the Increment 5 deletion are all in place; `npm run check` is
green. Everything full-stack-developer flagged for Phase 5 in their own Handoff above still
applies unchanged (live-hook harness smoke test, independent re-run of `check`/`test`/`typecheck`/
`lint`, confirming "no protected routes touched" in the Feature-Gate Audit). Additionally for
Phase 5: (1) confirm `npm run check` is still green from a clean checkout perspective (this
session ran it against a working tree with uncommitted changes — qa should confirm the same result
holds once these edits are considered final); (2) spot-check that the CLAUDE.md edits above read
correctly in context (no orphaned cross-references, no duplicate "Evidence Classes" mentions) by
reading the rendered file, not just this diff summary.

---

# Phase 5 — Verification (qa)

## Verdict

**PASS**

Every mechanism this feature claims to install exists, and each one was re-proven from scratch this
session — the work-log gate blocks and allows on the specced conditions, the ledger tripwire fails
on my own throwaway fixture and grandfathers correctly, and the agent-symbols tripwire fires with a
precise `file:line`. No enforcement claim in the new CLAUDE.md text or the nine Verification
Contract sections names a mechanism that doesn't exist or doesn't do what's claimed. Two
non-blocking notes and the live-harness gap are recorded below rather than dressed up as verified.

*(Auth-touching diffs: PASS requires e2e against a real dev server with an MFA-enrolled seeded user;
deferred e2e = BLOCKED. **Not applicable here** — zero app-code changes, see End-to-End Tests.)*

**Date:** 2026-09-07
**Verified by:** qa (Opus 5 — cross-model override against Phase 4's implementers, per Phase 3's
Implementer section and CLAUDE.md → Evidence Classes and Entry Checks)

## Prior-Phase Spot-Check

Re-derived Phase 4's Claims Ledger (both subsections: full-stack-developer's Increments 1–3/5 and
tech-lead's Increment 4) by re-running every E1 command myself and comparing literal output, and by
reading each E2 claim's primary source. **No diffs found — load-bearing or otherwise.**

| Phase 4 row | Claimed | My re-derivation | Diff |
|---|---|---|---|
| FSD 1 — gate blocks/allows on both Edit- and Write-shaped payloads | block on uncovered trigger path, allow on mention/freshness/marker | Re-proven from scratch in a fresh isolated scratch repo (13 CLI scenarios, S1–S13 below) — I did not read Phase 4's transcripts as evidence | none |
| FSD 2 — `check:ledger` fails in-scope/no-ledger, passes on the real corpus | fixture fails, corpus passes, cutoff `2026-09-07` | My own fixture (`2026-09-08-zz-qa-ledger-fixture.md`) → `FAILED ... Phase 3 is Complete but has no Claims Ledger table`; deleted → `46 work-log(s) found, 0 in scope, 46 grandfathered` PASS | none |
| FSD 3 — `check:agent-symbols` fires and reverts clean | fires on a planted symbol, clean after revert | My own plant (`qaFixtureRetiredSymbolZZZ` + temporary `RETIRED` entry) → `FAILED  .claude/agents/qa.md:92`; reverted → PASS, and `md5` of both files byte-identical to their pre-plant hashes | none |
| FSD 4 / TL 2 — roster delta +89 (101 ins / 12 del), 634 total | +89 | `git diff --stat .claude/agents/` → `9 files changed, 101 insertions(+), 12 deletions(-)`; `wc -l` → 634 total (90/72/77/74/56/41/91/62/71) | none |
| FSD 5 / TL 1 — typecheck, 471 tests, `check` ×4, lint all green | all pass | `npm run typecheck` exit 0, zero errors · `npm run test` → `37 passed (37) / 471 passed (471)` · `npm run check` → all four sub-checks pass · `npm run lint` → zero output, exit 0 | none |
| FSD 6 — quantifier linter dropped | dry-run 131 hits, ~5% TP, DROP | Not re-derivable (the script is deleted per Ruling 2 — deliberately). Accepted as E3 on Phase 4's own labelling; see "What was NOT verified" | n/a |
| FSD 7 — every touched file outside `TRIGGER_PREFIXES` | no `src/`/`drizzle/` path in the diff | `git diff --name-only HEAD` + `git status --porcelain` filtered for `src/|drizzle/|e2e/` → NONE (both tracked and untracked) | none |
| TL 3 — no `quantifier-lint` references remain | zero hits in `scripts/`, `package.json`, `.claude/` | Widened the grep to the **whole repo including `docs/`**: hits exist only in this work-log, all historical narrative (what the dry-run found, and Ruling 2's deletion). **No doc anywhere claims the script exists or runs.** `ls scripts/quantifier-lint.mjs` → No such file | none (grep widened, same conclusion) |
| TL 4 — pre-push Steps 3e/3f exist as hard blocks | both present | `git diff .claude/skills/pre-push/SKILL.md` — Step 3e (Ledger-Presence) and 3f (Agent-Symbols), each ending in a bolded "Do not proceed if … fails" matching Steps 3b/3c's pattern | none |
| TL 5 — all nine agent files carry a Verification Contract | one match each | `grep -c "^## \(4\. \)\?Verification Contract" .claude/agents/*.md` → `1` for all nine | none |
| TL 6 — CLAUDE.md net diff 23 ins / 7 del | 23/7 | `git diff --stat CLAUDE.md` → `1 file changed, 23 insertions(+), 7 deletions(-)` | none |

E2 claims re-derived from primary sources (not from Phase 4's prose): `.claude/settings.json` carries
**two** `PreToolUse` objects — `matcher: "Bash"` → `pre-push-gate.mjs` first, `matcher: "Edit|Write"`
→ `node scripts/worklog-gate.mjs` second, appended not merged, exactly as Phase 2 ruled;
`.gitignore:40` is `.claude/trivial-ok.json` under its own comment, alongside the pre-existing
`.claude/pre-push-ok.json` at `:37`; `package.json` defines `check:agent-symbols` and `check:ledger`
and the `check` alias chains all four in the order Phase 3 specified.

## Type Check

`npm run typecheck`: **PASS** — `tsc --noEmit`, zero errors, exit 0.

## Unit Tests

Total: 491 | Passed: 491 | Failed: 0 | Duration: 0.53s (38 files)
Failures: none.

Baseline at Phase 4 handoff was 471 in 37 files, re-derived by me before adding anything. The +20 in
+1 file are this phase's additions (below).

## End-to-End Tests

**Not applicable — not deferred.** The Playwright suite exercises app routes; this feature changes
zero app code, so there is no e2e surface to regress. Evidence, run against the full tree rather
than asserted: `git diff --name-only HEAD | grep -E '^(src/|drizzle/|e2e/)'` → no matches, and
`git status --porcelain | grep '^??' | grep -E 'src/|drizzle/|e2e/'` → no matches. The entire diff
is `.claude/`, `scripts/`, `docs/`, `CLAUDE.md`, `.gitignore`, `package.json`.

This is a deliberate "not applicable," not the forbidden deferred-advisory PASS: the diff is also
not auth-touching (`src/auth.ts`, `src/app/(auth)/`, `src/app/api/auth/`, `src/lib/auth/` are all
untouched by the same evidence), so the stricter auth gate does not engage.

## Mechanism Verification (re-proven from scratch)

Phase 4's pasted transcripts were treated as unproven. I drove `scripts/worklog-gate.mjs` via stdin
the way the harness would, in a **fresh isolated scratch git repo** built this session (a stale
work-log made non-fresh on both freshness legs, so the block path is reachable — the real repo's
own work-log is dirty today and therefore always qualifies via freshness).

| # | Scenario | Expected | Actual |
|---|---|---|---|
| S1 | `Edit` `src/lib/anything.ts`, no covering work-log | exit 2 + RULE8 message | exit 2, literal specced message including the `/trivial` operator-only clause |
| S1b | Same as `Write`-shaped payload | identical | identical (matcher covers both tool shapes) |
| S1c | `Edit` `drizzle/0001_x.sql` | exit 2 | exit 2 — second trigger prefix live |
| S2 | `Edit` `scripts/x.mjs` / `docs/work-log/foo.md` | exit 0 | exit 0, no fs/git work (outside `TRIGGER_PREFIXES`) |
| S3 | Malformed stdin / empty stdin | exit 0 fail-open + warning | exit 0, `[worklog-gate] warning: could not parse stdin JSON (…); allowing` |
| S4 | Work-log mentions the target path | exit 0 | exit 0 |
| S5 | Work-log dirty today (freshness leg only) | exit 0 | exit 0 |
| S6 | `docs/work-log/` absent entirely | exit 0 fail-open | exit 0 — the branch the harvest lacked |
| S7 | Valid unexpired marker for the exact path | exit 0, marker consumed | exit 0; marker file gone; **immediate retry of the same edit → exit 2** (single-use proven, not inferred) |
| S8 | Marker expired 10 min ago | exit 2 | exit 2; marker left in place (not consumed) |
| S9 | Marker for a *different* path | exit 2 | exit 2; marker not consumed — single-path, not a glob |
| S10 | Marker file is corrupt JSON | exit 2, no throw | exit 2 — degrades to "no exemption" |
| S11 | Qualifying work-log, substantive Phase 4, no `## What was NOT verified` | exit 2 naming file + phase | exit 2, `…2026-01-02-p4.md's Phase 4 section is missing the required "## What was NOT verified" heading` |
| S12 | Same file with the heading added | exit 0 | exit 0 |
| S13 | Phase 4 still the bare template placeholder | exit 0 (not yet substantive) | exit 0 |

S7–S10 confirm the marker behaves exactly as **DECISION-032** describes it (one literal path,
10-minute expiry, deleted on the consuming call). `check:ledger` and `check:agent-symbols` were
re-proven with my own fixture and my own plant, both cited in the Prior-Phase Spot-Check table and
both fully cleaned up (final `git status` carries no fixture, no plant).

## Instructions-vs-Mechanisms Audit

This feature's whole point: no instruction may claim enforcement that doesn't exist. Every named
mechanism was spot-checked against the thing it names.

| Claim (location) | Mechanism | Verified |
|---|---|---|
| Rule 8 — "mechanically enforced on `src/**`/`drizzle/**` by `scripts/worklog-gate.mjs` PreToolUse hook on `Edit`/`Write` (`.claude/settings.json`)" | script + registration | Script exists and behaves so (S1–S13); registration present as a second matcher object. **Caveat:** script-level, not harness-level — see What was NOT verified |
| Rule 8 — "fails open only on a missing `docs/work-log/` directory, a stdin parse error, or a git-plumbing failure" | code paths | S6, S3, and the `catch { return true }` in `isSameDayFresh`. Accurate (see Note 3 for one unlisted, benign fail-open) |
| Rule 8 — "`/trivial <path> \"<reason>\"` … stamps a single-use, 10-minute exemption marker" | `.claude/skills/trivial/SKILL.md` | Skill directory exists with valid frontmatter and **is live in this session's registered skill roster**; marker semantics proven S7–S9 |
| Rule 5 — "plus the ledger-presence (`check:ledger`) and agent-symbols (`check:agent-symbols`) tripwires — hard blocks" | SKILL Steps 3e/3f | Both present, both closing with a bolded "Do not proceed if … fails", matching 3b/3c |
| Phase 4 Gate — "`scripts/worklog-gate.mjs` enforces the heading mechanically on any qualifying work-log's substantive Phase 4 section" | `hasNotVerifiedHeading` + `isPhaseSectionSubstantive` | Proven S11/S12/S13. The hedges ("qualifying", "substantive") are load-bearing and correctly stated — the claim is not overstated |
| Common Commands — `check:agent-symbols`, `check:ledger`, "All four tripwires in sequence" | `package.json` | All three accurate; the now-stale "Both tripwires" line was correctly fixed |
| Agent Roster — "Each agent file's own Verification Contract section states its phase's entry check and exit-ledger requirement in full" | nine agent files | One section per file; all nine match Phase 3's literal text verbatim |
| Every `scripts/*.mjs` and `npm run <script>` named anywhere in CLAUDE.md, the nine agent files, and the skills | filesystem / `package.json` | Enumerated and resolved mechanically — **9/9 scripts exist, 22/22 npm scripts defined**, zero dangling references |

**Result: no false enforcement claim found.** The nine Verification Contract sections describe agent
behaviour (norms), not code, and none of them claims a mechanism enforces it.

## Template Integrity

Ran the shipped detectors against `docs/work-log/_template.md` itself rather than reasoning about
it. All six phase sections extract cleanly; each matches `LEDGER_TABLE_RE`; each satisfies
`hasNotVerifiedHeading`; `isPhaseSectionSubstantive` correctly returns `false` for the unfilled
Phase 4 and Phase 5.

The template **is** exempted — by filename, in both consumers (`check-ledger.mjs:108` and
`worklog-gate.mjs:312` each filter `f !== "_template.md"`), so it is never self-checked. But the
hole worth naming is not the template's exemption; it is what a *copy* of the template gets away
with. I probed it: a work-log copied verbatim, dated post-cutoff, with a phase flipped to
`Complete` and its ledger left as the empty placeholder row, returns **zero violations** —
`LEDGER_TABLE_RE` matches the header row, so ledger *presence* is satisfied by an empty table.
This is a real lazy-work-log escape, and I report it as such. It is **not** a FAIL: the script's own
header calls itself "Not a proof; just a tripwire," Phase 3 only ever specified table presence, and
both CLAUDE.md and SKILL Step 3e describe it precisely ("has no … Claims Ledger table") rather than
overclaiming. Routed to Notes/TODO, and pinned by a test so a future tightening breaks deliberately.

## Regression Tests Added

Both are **coverage additions**, not fixes — I found no defect to write a failing-first test
against. Both were mutation-tested so they are demonstrably not vacuous.

- `scripts/check-ledger.test.mjs` (new, 18 tests) — `check-ledger.mjs` shipped with **no test file
  at all**, on Phase 2's "single-purpose grep tripwires need no test" ruling. That ruling doesn't fit
  this script: it carries the hardcoded grandfather cutoff Phase 3's own Edge Cases named as the
  feature's highest-risk constant, plus two real parsers. Nothing guarded either.
  - `should be a real YYYY-MM-DD date, never the YYYY-MM-DD placeholder Phase 3 warned about`
    — `check-ledger.test.mjs:59` — guards the exact "implementer leaves the placeholder" failure.
  - `should grandfather a work-log dated exactly ON the cutoff — the boundary is strictly after`
    — `:80` — pins the `>` boundary semantics.
  - `should pass an out-of-scope work-log even with a Complete phase and no ledger — regression for
    the grandfather cutoff` — `:143` — guards the "backdated cutoff turns /pre-push permanently red"
    failure.
  - `should be re-runnable on the same input — the module-level /g regex must not leak lastIndex`
    — `:122` — guards the classic `/g` + `lastIndex` statefulness bug in `STATUS_ROW_RE`.
  - `should match on the header row alone, so an EMPTY ledger table passes the check` — `:165` —
    **pins the known hole above** so tightening it is a deliberate, test-breaking act.
  - **Mutation-proof (run this session, all three reverted):** backdating the cutoff to `2026-01-01`
    → 2 tests fail; leaving the `YYYY-MM-DD` placeholder → 5 fail; loosening `>` to `>=` → 1 fails.
    Restored file re-verified green (18/18) and hash-checked.
- `scripts/worklog-gate.test.mjs` — 2 tests added to the `readTrivialMarker` block (`:229`, `:239`):
  corrupt-JSON and unreadable-path (directory) inputs must return `null` rather than throw. Only the
  missing-file path was covered; an uncaught throw here would crash a PreToolUse hook, the one
  failure mode the script's entire fail-open posture exists to prevent. Matches live scenario S10.

## Coverage on Critical Modules

Not re-measured, deliberately. The three critical modules are **untouched by this diff** (no `src/`
path appears anywhere in it — same evidence as the E2E section), so a coverage run would report the
pre-existing numbers and imply this feature moved them. Suite totals instead: **491/491 passing
across 38 files**, up from the 471/37 baseline I re-derived at entry. New-code coverage: the two
scripts carrying real logic each now have a co-located test file (`worklog-gate.test.mjs` 48 tests,
`check-ledger.test.mjs` 18); `check-agent-symbols.mjs` has none, matching this repo's norm for grep
tripwires and proven to fire by the plant/revert above instead.

## Feature-Gate Audit

*(Mandatory — see qa agent. Verified by reading route/action bodies, not by inferring from green tests. Write "no protected routes touched" if none.)*

**No protected routes touched.** No route handler, server action, page, or component was added or
changed — so there is no `auth()` / `hasFeature()` surface to audit.

Evidence (commands run against the full tree, not inferred from the Files Modified list):

```
git diff --name-only HEAD | grep -E '^(src/|drizzle/|e2e/)'      → no matches
git status --porcelain | grep '^??' | grep -E 'src/|drizzle/'    → no matches
git status --porcelain | grep -E 'route\.ts|actions\.ts'         → no matches
```

| Route or action | `auth()` present? | `hasFeature(...)` present? | Correct `FEATURES.*` key? |
|-----------------|-------------------|----------------------------|----------------------------|
| *(none — no protected routes touched)* | n/a | n/a | n/a |

`npm run check:audit` passes with zero findings, consistent with there being no mutation surface.

## Notes (non-blocking — cited, but not FAIL-grade)

1. **`check:ledger` has zero live coverage today, including over this feature's own work-log.**
   The cutoff is `2026-09-07` and `isInScope` is strictly `>`, so a work-log dated *on* the ship date
   is grandfathered: `isInScope("2026-09-07-verification-contracts.md")` → `false`, and the real
   corpus reports `0 in scope`. The first work-log the tripwire can act on is one dated 2026-09-08 or
   later. This matches DECISION-033's literal wording ("strictly after") and is spec-conformant, but
   it means the check that enforces the ledger format cannot see the first work-log to use it. (No
   substantive consequence: I confirmed this work-log would pass anyway — `checkWorklog` returns `[]`
   against it even when forced in scope.) Worth a conscious Phase 6 confirmation that on-cutoff
   exemption was intended rather than an off-by-one.
2. **Ledger presence ≠ ledger substance** — the empty-table hole documented under Template
   Integrity. Suggest a `docs/TODO.md` line to require ≥1 populated row.
3. **One fail-open case is unlisted in Rule 8's enumeration** — a payload with a missing or
   non-string `tool_input.file_path` also exits 0 (`worklog-gate.mjs:342`). Correct behaviour
   (nothing to check), just not among the three cases Rule 8 names. Cosmetic.
4. **An expired or wrong-path marker is never garbage-collected** (S8/S9 — only a *matching* marker
   is consumed). Harmless: it is gitignored and re-checked for expiry on every read, so it can never
   grant a stale exemption. Noting it so nobody later reads a lingering `trivial-ok.json` as an
   active bypass.
5. **Institutional memory deleted with qa.md's absorbed sentence.** The removed framing line carried
   a concrete incident ("two admin export routes once shipped without `hasFeature()` exactly this
   way") plus the operational instruction to verify *by reading route/action bodies, not by inferring
   from green tests*. Phase 3 explicitly authorised the deletion, and the instruction survives in the
   work-log template's Feature-Gate Audit note — but the incident itself now exists nowhere. A
   one-clause reinstatement would cost ~1 line. Phase 6's call, not a blocker.
6. **Ship-time housekeeping is outstanding, as expected at this phase.** `docs/TODO.md` (Rule 10) and
   `docs/decisions.md` (Rule 4, DECISION-030…033) are reconciled; the functionality-map line (Rule 14)
   and release notes named in design §8 are not yet written (`git status` shows `docs/product/` and
   `docs/release-notes/` untouched, `package.json` version still `0.7.0`). Both are explicitly
   ship-time / `/release-notes` items that land after Phase 6, so this is a reminder, not a finding.

## Claims Ledger

| # | Claim | Class | Evidence |
|---|-------|-------|----------|
| 1 | `npm run typecheck` clean, `npm run lint` clean (`--max-warnings=0`), `npm run check` green on all four sub-checks | E1 | All four run by me this session; `check` output: audit passed, sql-date passed, `9 agent file(s), 0 retired symbol(s)`, `46 work-log(s), 0 in scope, 46 grandfathered` |
| 2 | Unit suite 491/491 across 38 files after my additions; the pre-existing baseline I re-derived at entry was 471/471 across 37 | E1 | `npm run test` run before adding tests (471/37) and after (491/38) |
| 3 | `worklog-gate.mjs` blocks and allows on exactly the specced conditions across 13 stdin-driven scenarios, including both Edit- and Write-shaped payloads and both trigger prefixes | E1 | Fresh isolated scratch repo built and driven by me this session (S1–S13); scratch repo deleted afterwards |
| 4 | The trivial marker is single-use, single-path and expiry-honouring exactly as DECISION-032 describes | E1 | S7 (consumed + immediate retry blocked), S8 (expired → block), S9 (wrong path → block), S10 (corrupt → block) |
| 5 | `check:ledger` fails on a post-cutoff work-log with a `Complete` phase and no ledger, and grandfathers an otherwise-identical pre-cutoff one | E1 | My own two fixtures, created → run → deleted; run 1 FAILED citing `2026-09-08-zz-qa-ledger-fixture.md`, run 2 (pre-cutoff only) PASSED, run 3 (neither) PASSED at 46 logs |
| 6 | `check:agent-symbols` fires with a precise `file:line` and returns byte-identical after revert | E1 | Planted `qaFixtureRetiredSymbolZZZ` in a fenced block + temporary `RETIRED` entry → `FAILED  .claude/agents/qa.md:92`; reverted → PASS; `md5 -q` of both files matches the pre-plant hashes exactly |
| 7 | Zero dangling references to the deleted `quantifier-lint.mjs`; no doc claims it exists or runs | E1 | Repo-wide `grep -rn "quantifier"` (excluding `node_modules`/`.git`) — every hit is either the unrelated word in CLAUDE.md's E3 definition and analyst.md's contract, or historical narrative in this work-log and the design doc; `ls scripts/quantifier-lint.mjs` → No such file |
| 8 | No `src/`, `drizzle/`, or `e2e/` path appears anywhere in the feature diff, tracked or untracked — so the Feature-Gate Audit is legitimately "no protected routes touched" and e2e is legitimately not applicable | E1 | `git diff --name-only HEAD` and `git status --porcelain`, both filtered, both empty |
| 9 | Every `scripts/*.mjs` and `npm run <script>` named in CLAUDE.md, the nine agent files, and the skills resolves to a real file / defined script | E1 | Mechanically enumerated and resolved this session — 9/9 scripts, 22/22 npm scripts (one apparent miss, `test:e`, was my own regex truncating `test:e2e`) |
| 10 | `_template.md` is exempt from both consumers by filename, and a verbatim template copy marked `Complete` passes `check:ledger` with an empty ledger table | E1 | Detectors run directly against `_template.md` (all six phases parse, ledger + heading present, P4/P5 non-substantive); forged-copy probe → `checkWorklog(...)` returned `[]` |
| 11 | This feature's own work-log is out of `check:ledger` scope under the shipped strictly-after cutoff | E1 | `isInScope("2026-09-07-verification-contracts.md")` → `false`, evaluated against the shipped constant |
| 12 | The two new tests are non-vacuous — they catch the exact cutoff failure modes Phase 3's Edge Cases named | E1 | Three mutations applied and reverted this session: backdated cutoff → 2 failures; placeholder cutoff → 5; `>` → `>=` → 1; restored file green at 18/18 and hash-verified |
| 13 | Phase 4's Claims Ledger contains no diffs against my independent re-derivation | E1/E2 | The Prior-Phase Spot-Check table above, row by row — E1 for every re-run command, E2 for `.claude/settings.json`, `.gitignore`, `package.json`, and SKILL.md read directly |
| 14 | No enforcement claim in the new CLAUDE.md text or the nine Verification Contract sections names a mechanism that doesn't exist or misdescribes what it does | E1/E3 | The Instructions-vs-Mechanisms table above — each row's mechanism resolved and exercised (E1); "no false claim found" is my reading of that evidence (E3) |
| 15 | Working tree after this phase contains only the feature's own diffs plus my two test files — no fixture, plant, or scratch artefact survives | E1 | Final `git status --porcelain`: identical to the entry-state list plus `scripts/check-ledger.test.mjs`; scratch repo removed; both fixtures deleted; both plants reverted and hash-verified |

## What was NOT verified

- **The live PreToolUse mechanism has still never fired inside a real Claude Code harness session.**
  Everything in the Mechanism Verification table above drove the CLI directly over stdin. I could not
  close this gap, and I want to be precise about *why* rather than just repeating Phase 4's caveat:
  in this repo today the gate cannot be made to block at all, because the feature's own work-log is
  uncommitted and therefore same-day-fresh, which qualifies it for every `src/**` path — I confirmed
  a live-shaped `Edit` payload for `src/lib/anything.ts` exits 0 here. Forcing a live block would have
  required modifying or hiding the very work-log this phase is writing into. So the harness's payload
  shape (`tool_input.file_path`) and its handling of an exit-2 from an `Edit|Write` matcher remain
  **assumed, not proven**. Mitigating context, not proof: the identical assumption already ships in
  `pre-push-gate.mjs` under the `Bash` matcher, the registration is syntactically identical to that
  working hook, and every failure mode is fail-open. **Recommend Phase 6 or the operator run one
  deliberate live check** — stamp `/trivial` for a path, or attempt an `Edit` under `src/` from a
  clean tree where no work-log is dirty.
- **The freshness leg makes the gate very weak in normal working conditions, and I did not assess
  whether that is acceptable.** Any single work-log touched today qualifies *every* `src/**` and
  `drizzle/**` path for the whole session, regardless of relevance — Rule 8's mechanical enforcement
  is therefore closer to "some work-log is in flight" than "a work-log covers this file." This is
  exactly the `mention || fresh` semantics Phases 1–3 specified and ratified, so it is not a
  deviation and I am not calling it a defect; I simply did not evaluate whether the intended strength
  was higher. Phase 6's call against Phase 1's intent.
- **Phase 4's quantifier-linter dry-run numbers (131 hits, ~7 true positives, ~5%) are unverifiable
  by construction** — Ruling 2 deleted the script, so I cannot re-run it. I accept the DROP decision
  on its own merits (the margin below the ~50% kill criterion is ~10x, and Phase 4 labelled the
  classification E3 itself), but the count is taken on Phase 4's word, not re-derived. This is the one
  Phase 4 ledger row I could not independently check.
- **`isSameDayFresh`'s success paths were not exercised end-to-end against a committed work-log.**
  The scratch fixture drove non-freshness via an ignored, never-committed file (both git legs return
  empty), and freshness via an untracked one. The "committed today → fresh / committed yesterday →
  stale" branch is covered only by code reading. I avoided creating commits to prove it.
- **The `/trivial` no-self-invocation rule remains a norm, not a mechanism** — unchanged from Phases
  3 and 4, and I confirmed there is nothing in the hook or the skill that could enforce it. Nothing in
  my testing improves on this; I re-state it rather than let it drop out of the record.
- **`isActuallyRetired()`'s stale-entry-ignored path in `check-agent-symbols.mjs` was not exercised.**
  My plant proved the violation path; proving the self-validation path needs a `RETIRED` entry naming
  a symbol that *is* exported from `src/`, which I chose not to plant. Inherited gap, named by Phase 4.
- **I did not review `docs/decisions.md` DECISION-030 and DECISION-031 line by line** — I read 032
  and 033 in full (they carry the mechanism claims I was testing) and only confirmed 030/031 exist
  with the right numbering and headings.
- **Markdown rendering of the nine agent files and the rewritten CLAUDE.md was checked by reading,
  not by rendering.** I verified headings, numbering (architect's renumbered 1–5), and cross-reference
  targets textually; I did not view them rendered.

## Handoff

→ **analyst (Phase 6)**, on this PASS. Spawn with a `model` override distinct from both Phase 4's
implementers and this phase (Opus 5), per CLAUDE.md → Evidence Classes and Entry Checks.

Carry forward for Phase 6's independent judgment — none of these are things I resolved for you:
(1) **Note 1** — the strictly-after cutoff means this feature's own work-log is exempt from the
tripwire it introduces; confirm that's intent, not an off-by-one. (2) **Note 2 / Template
Integrity** — ledger *presence* is satisfied by an empty table; decide whether that meets Phase 1's
intent or becomes a `docs/TODO.md` follow-up. (3) **The freshness leg's real-world weakness** (first
"What was NOT verified" bullet) — measured against Phase 1's Flow 1, is `mention || same-day-fresh`
the enforcement strength the feature was asked for? (4) **Note 5** — whether the incident memory
deleted from `qa.md` should be reinstated in one clause. (5) The **live-harness gap** is the one
residual risk I could not retire; a single deliberate live `Edit` under `src/` from a clean tree
would close it.

Ship-time items still open per design §8 (expected at this point, flagged so they aren't lost):
functionality-map line (Rule 14) and release notes / version bump.

---

# Phase 6 — Shipped vs Intent (analyst)

## Prior-Phase Spot-Check

Re-derived four of Phase 5's E1 claims myself, before treating its PASS as settled (run on a model
distinct from Phase 4's implementers and Phase 5's qa, per the cross-model override plan):

1. **`npm run check`** re-run fresh — all four sub-checks green; `check:ledger` reports
   `46 work-log(s) found, 0 in scope (dated after 2026-09-07), 46 grandfathered`. Matches Phase 5
   Claims Ledger row 1 exactly. No diff.
2. **`npm run test`** re-run fresh — 491/491 across 38 files. Matches row 2. No diff.
3. **Working tree** — `git status --porcelain` filtered for `src/|drizzle/|e2e/` → empty; the full
   diff is `.claude/`, `scripts/`, `docs/`, `CLAUDE.md`, `.gitignore`, `package.json`. Matches
   row 8. No diff.
4. **`worklog-gate.mjs` driven with my own stdin payloads** (not Phase 4's or Phase 5's fixtures):
   in a scratch repo with a stale, non-mentioning work-log, an `Edit`-shaped payload for
   `src/lib/uncovered.ts` → exit 2 with the literal specced RULE8 message; a mentioned path →
   exit 0; a non-trigger path (`scripts/foo.mjs`) → exit 0. Matches row 3's behavior claims. No
   diff. **One methodological finding of my own** (not a diff, logged per the non-load-bearing
   rule): `REPO_ROOT` is anchored to the script's own location (`worklog-gate.mjs:47`), so a hook
   invocation whose absolute `file_path` lies *outside* this repo resolves to a `../…` relative
   path that never matches `TRIGGER_PREFIXES` — my first probe against an uncopied script exited 0
   for exactly this reason. Fail-open in the correct direction (the gate should never block edits
   to files outside this repo), consistent with design intent; noted so a future reader of the
   probe transcript doesn't misread it as a hole.

Also re-verified from disk (E1) that Increment 4's CLAUDE.md changes are real — `### Evidence
Classes and Entry Checks` at line 141, Rule 8's `worklog-gate.mjs`/`/trivial` rewrite, Rule 5's
`check:ledger`/`check:agent-symbols` clause, Common Commands' "All four tripwires", `git diff
--stat CLAUDE.md` → 23 insertions / 7 deletions — because the CLAUDE.md copy loaded into this
session's context was the pre-Increment-4 text (stale context snapshot, not a repo problem).

**No load-bearing diffs found against Phase 5. No loop-back.**

## VERDICT

SHIP WITH NOTES

## ONE-LINE TAKE

> Every mechanism Phase 1 asked for exists, blocks and allows on exactly the specced conditions,
> and every gap Phase 1 named has a shipped answer or an explicit, recorded acceptance — the one
> thing nobody has seen is the hook firing from inside a real harness session, and that residual
> plus three small holes ride out as tracked follow-ups rather than blockers.

## What's Working

- **Flow 1 (edit hits the gate):** the blocked messages meet Phase 1's own failure-microcopy bar,
  verified against the literal strings in `worklog-gate.mjs:72-90` and my own live block (E1).
  `rule8Message` names the target path, the trigger set, *both* failed conditions (no mention, not
  touched today), and two concrete remedies (`/new-feature`, add the path to today's Surface line)
  plus the operator-only `/trivial` route. `notVerifiedMessage` names the offending work-log, the
  phase, the missing heading, and points at `_template.md` for the format. This was Phase 1's
  explicit Flow 1 demand ("name *which* condition failed and *what to run*") — shipped verbatim.
- **Flow 2 (ledger → entry check):** the shipped mechanism is faithful to
  derive-then-diff-never-read-then-confirm. Read two contract sections myself (E2): `qa.md`'s
  entry check says "re-run Phase 4's E1 commands and re-derive its E2 claims *yourself* before
  trusting them"; `api-developer.md`'s says "re-derive Phase 3's design against the real
  `schema.ts`… before building — a design referencing a nonexistent symbol bounces back… never
  patched around silently." The template's Prior-Phase Spot-Check block carries the
  load-bearing-diff-loops-back / non-load-bearing-diff-logs rule inline, and CLAUDE.md's new
  subsection states it repo-wide. The old read-then-confirm prose (analyst.md's "Re-read your own
  Phase 1 review") is genuinely deleted, not just outvoted.
- **Flow 4 (`/pre-push`):** Steps 3e (Ledger-Presence) and 3f (Agent-Symbols) exist in
  `.claude/skills/pre-push/SKILL.md`, both closing with the bolded "Do not proceed if… fails"
  matching Steps 3b/3c, and both scripts run green (E1, re-run this session via `npm run check`).
- **This work-log practices what it ships:** every completed phase section (1, 2, 3, 4 + Increment
  4, 5) carries a populated Claims Ledger; Phases 4 and 5 carry substantive "What was NOT
  verified" sections — confirmed by reading the file end to end, not by trusting the status table.

## Intent-vs-Shipped Diff

- Phase 1 Flow 1 said: block Edit/Write on non-trivial paths unless a work-log mentions the file
  or is same-day-fresh, with actionable failure text. Shipped: exactly that, plus the
  operator-only `/trivial` escape and the missing-directory fail-open. Verdict: **matches.**
- Phase 1 Flow 2 said: entry checks re-derive prior-phase claims before reading answers; open
  question on diff semantics. Shipped: nine contracts + template blocks + CLAUDE.md rule, with the
  load-bearing-vs-logged distinction resolved (Phase 2 Notes item 5) and stated everywhere it's
  needed. Verdict: **matches.**
- Phase 1 Flow 4 said: ledger-presence check in `/pre-push`, hard-block-vs-advisory undecided.
  Shipped: hard block (Step 3e) with the grandfather cutoff (DECISION-033). Verdict: **matches**,
  with the open question resolved the way Phase 1's own gap analysis leaned.
- Phase 1 gap: Trivial-vs-Feature boundary at the hook layer. Shipped: `/trivial` skill —
  operator-invoked, single-path, single-use, 10-minute expiry (DECISION-032); the
  no-self-invocation residual is explicitly accepted as a norm, not papered over. Verdict:
  **acceptable drift** (a designed mechanism where Phase 1 only demanded *an* answer) — the norm
  residual is recorded in three places, which is what "accepted risk" should look like.
- Phase 1 gap: 45 pre-existing work-logs. Shipped: strictly-after `2026-09-07` cutoff, 46
  grandfathered, verified live. Verdict: **matches** (the `stats:escape` pattern Phase 1 itself
  suggested).
- Phase 1 gap: fork deletes `docs/work-log/`. Shipped: explicit Step 2 fail-open in
  `evaluateWorklogGate` (code read, E2; live-tested by Phase 5's S6). Verdict: **matches.**
- Phase 1 gap: multi-day builds vs the freshness leg. Shipped: unchanged `mention || fresh`
  semantics as Phases 1–3 ratified; the breadth of the freshness leg is the flip side (see
  carried-item ruling 3 below). Verdict: **matches intent as written**, follow-up filed on
  strength.
- Increment 5 (quantifier linter): Phase 1 treated it as truly droppable; dropped on a real
  dry-run (~5% true-positive vs the ~50% kill bar), file deleted, evidence preserved in prose.
  Verdict: **matches** — the "drop if noisy" clause was honored as a hard commitment.

## Rulings on Phase 5's Five Carried Items

1. **On-cutoff exemption (this work-log is exempt from its own tripwire):** **intent, not an
   off-by-one.** DECISION-033 says "strictly after" in so many words, mirroring `stats:escape`'s
   precedent semantics, and the exemption is materially empty: I confirmed by reading that every
   completed phase section of this work-log carries a populated ledger, and Phase 5 confirmed
   `checkWorklog` returns `[]` against it even when forced in scope. The first enforceable
   work-log being dated 2026-09-08+ is the correct bootstrap shape.
2. **Empty-placeholder-ledger hole (presence ≠ substance):** **acceptable tripwire scope, with a
   follow-up.** The design's own "no fourth layer" principle and the script's self-description
   ("Not a proof; just a tripwire") both cover it, and no shipped prose overclaims. But the
   tightening is cheap (require ≥1 populated row) and the hole is already pinned by a test —
   filed in `docs/TODO.md` (Backlog).
3. **Freshness leg's strength:** **acceptable as ratified, follow-up to revisit.** Phase 1 Flow 1
   specified `mention || same-day-fresh` verbatim and Phase 1's own Gap #3 worried about the leg
   being too *weak* for multi-day builds, not too strong — so the shipped semantics are what was
   asked for, and Rule 8's bar is "a work-log exists," not "the right work-log covers this file."
   The session-wide qualification is still worth instrumenting before tightening — filed in
   `docs/TODO.md` (Backlog) with the cheapest first step (advisory naming the qualifying log).
4. **Deleted qa.md incident memory:** **lost institutional memory worth one line back.** The
   deletion was Phase 3-authorized and the operational instruction survives (qa.md's checklist +
   the template's "reading route/action bodies" note), but the concrete incident — the kind of
   citation qa.md deliberately keeps elsewhere (sagacraft `dfe7add`, npvitals 2026-05-20) — now
   exists nowhere in the live instruction set. Not a blocker; one-clause reinstatement filed in
   `docs/TODO.md` (Backlog, batched with the DECISION-031 stale-sentence fix I found myself:
   DECISION-031 still says `check-ledger.mjs` has no test file, which Phase 5 made untrue).
5. **Live-fire gap:** **the known residual; tracked, not closed.** I could not probe it
   non-destructively: a genuine block in this repo requires no same-day work-log (this one is
   dirty and qualifies every `src/**` path), and an allowed edit cannot distinguish
   "hook passed" from "hook not loaded into this session." I did not contort the repo. Filed in
   `docs/TODO.md` (Next Up): operator attempts an uncovered `src/` edit at next session start from
   a clean tree and confirms the block message.

## Edge Cases

- Empty state: **pass, by analog** — no app UI; the nearest analogs are a missing
  `docs/work-log/` directory (fail-open, Step 2) and an empty-but-present one (blocks with the
  actionable RULE8 message), both correct.
- Failure microcopy: **pass** — both blocked messages verified against the literal strings and a
  live block (see What's Working).
- Permission gate: **not applicable** — no `FEATURES` key or role surface; the "users" are the
  operator and the nine agents, unmodeled in `src/lib/permissions.ts` (confirmed at every phase).
- Audit event: **not applicable** — no security-sensitive app mutation exists in this diff;
  `check:audit` runs green with nothing in scope. Dev-loop state (`trivial-ok.json`, work-log
  sections) is not `audit_events` material, matching every existing hook/skill.
- Mobile (360px): **not applicable** — no rendered surface.

## Follow-Ups (SHIP WITH NOTES — all filed in `docs/TODO.md` this session)

- **Next Up:** verify the work-log gate fires live at next session start (operator: attempt an
  uncovered `src/` edit from a clean tree, confirm the `[worklog-gate] BLOCKED` message).
- **Backlog:** tighten `check:ledger` to require ≥1 populated ledger row (presence ≠ substance).
- **Backlog:** revisit the freshness leg's session-wide qualification after live use; cheapest
  step is an advisory naming which work-log qualified.
- **Backlog:** one-line doc restorations — reinstate qa.md's "two admin export routes" incident
  clause; fix DECISION-031's stale "check-ledger.mjs has no test" sentence.

## Rules 12 & 13

- **Rule 12 (feedback row):** not applicable — the source was an operator request
  (Chris, 2026-09-07) plus the adapted design doc; no `feedback` row exists to mark `done`.
- **Rule 13 (what's-new advisory):** not applicable — internal dev-loop tooling with zero
  member-visible behavior; no `whats_new_entries` entry warranted.
- **Ship-time housekeeping still owed with the ship commit** (not this phase's writable scope):
  functionality-map line (Rule 14), release notes + version bump, and moving this feature's
  In Flight line in `docs/TODO.md` to Done (Rule 10) — Phase 5's Note 6 already flagged these;
  they land in the `/release-notes` housekeeping cluster with the commit.

## Claims Ledger

| # | Claim | Class | Evidence |
|---|-------|-------|----------|
| 1 | All four tripwires green; `check:ledger` reports 46 found / 0 in scope / 46 grandfathered | E1 | `npm run check` re-run this session — matches Phase 5 row 1, no diff |
| 2 | Unit suite 491/491 across 38 files | E1 | `npm run test` re-run this session — matches Phase 5 row 2, no diff |
| 3 | No `src/`, `drizzle/`, or `e2e/` path anywhere in the feature diff (tracked or untracked) | E1 | `git status --porcelain` filtered this session — matches Phase 5 row 8, no diff |
| 4 | The gate blocks an uncovered trigger path with the literal specced RULE8 message and allows mentioned + non-trigger paths, on payloads of my own construction | E1 | Scratch-repo probe this session (block exit 2 with full message text captured; two allow cases exit 0); scratch repo deleted after |
| 5 | Blocked-message strings name the failed condition and the remedy, meeting Phase 1 Flow 1's microcopy bar | E1/E2 | `worklog-gate.mjs:72-90` read directly; rule8Message additionally observed live in the probe |
| 6 | qa.md and api-developer.md contracts are derive-then-diff-phrased and match Phase 3's literal text; qa.md's incident sentence is gone | E2 | Both files read in full this session |
| 7 | `/pre-push` Steps 3e/3f exist with hard-block phrasing; `/trivial` skill exists with the no-self-invocation rule; DECISION-030–033 landed | E2 | `SKILL.md` (3d–3f region), `trivial/SKILL.md`, and `decisions.md` (030–033) read this session |
| 8 | Increment 4's CLAUDE.md changes are on disk (Evidence Classes §, Rules 5/8, Common Commands), 23 ins / 7 del | E1 | `grep` + `git diff --stat CLAUDE.md` this session — the stale copy was my session context, not the repo |
| 9 | Every completed phase section of this work-log carries a populated Claims Ledger, and P4/P5 carry substantive "What was NOT verified" sections | E2 | This file read end to end this session (the on-cutoff-exemption ruling rests on this) |
| 10 | An absolute `file_path` outside this repo can never trigger the gate (`REPO_ROOT` anchored at `worklog-gate.mjs:47`; `path.relative` yields a `../…` prefix) | E1/E2 | Observed live in my first probe (exit 0); mechanism confirmed by reading lines 46-56 |

## What was NOT verified

- **The live-harness firing of the PreToolUse hook** — unchanged from Phases 4 and 5, and now the
  feature's single tracked Next Up follow-up. Everything verified here drove the CLI over stdin;
  the harness payload shape and its handling of exit 2 from an `Edit|Write` matcher remain
  assumed, resting on `pre-push-gate.mjs`'s identical working precedent.
- **Phase 4's quantifier-linter dry-run numbers (131 hits, ~5% TP)** — unverifiable by
  construction (script deleted by Increment 4's Ruling 2); the DROP decision is accepted on the
  ~10x margin, same as Phase 5 accepted it.
- **The `/trivial` end-to-end skill flow** (stamp via actual skill invocation → blocked edit
  succeeds → marker consumed) — Phase 5's S7–S10 proved the marker semantics at the CLI layer;
  the skill-invocation half remains exercised only by reading `trivial/SKILL.md`.
- **DECISION-030 and the full text of DECISION-031's opening** — I read 031's Consequences (where
  I found the stale sentence), 032, and 033 in full; 030 I confirmed exists with correct
  numbering only, same posture Phase 5 declared.
- **Rendered-markdown appearance** of the nine contracts and CLAUDE.md — checked textually, same
  as Phase 5.
