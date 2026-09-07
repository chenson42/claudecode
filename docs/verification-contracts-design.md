# Verification Contracts for the Agent Pipeline — Starter Adaptation

**Status:** adapted design, 2026-09-07 — pre-pipeline input. Implementation is a Feature-class
change (nine `.claude/agents/*.md` files, CLAUDE.md's pipeline section, the work-log template,
one new hook, two harvested tripwires) and goes through `/new-feature`, not this doc.
**Provenance:** adapted from the npvitals-monorepo design of the same date, whose evidence base
is `~/git/npvitals/apps/portal/docs/reviews/2026-09-07-retrospective.md` (six same-day escapes,
mechanisms known). Per this repo's commit standards, work landed from this doc that fixes a
latent defect cites `Caught-By: agent-review` and names the cross-repo harvest.
**Requested by:** Chris, 2026-09-07 — "make these agents super tight; each gate should check the
accuracy of the previous, as well as checking their own work."

This adaptation was produced the way the design says gates should treat work-logs: every claim
about *this* repo below was derived from the repo, not carried over from the source doc. The
closing Claims Ledger tags each load-bearing claim E1/E2/E3.

---

## 1. What transfers unchanged

The core design is repo-agnostic and transfers as-is:

- **Evidence classes (E1 executed / E2 derived / E3 reasoned).** Every factual claim in a phase
  output carries a tag. E3 is legal but must be labeled; a claim with no command attached is E3
  by definition. Both sibling root causes were E3 masquerading as E1/E2.
- **The claims ledger.** Each phase's work-log section ends with a 3–7-row table of load-bearing
  claims (`| # | Claim | Class | Evidence |`). Choosing which claims are load-bearing is itself
  the discipline.
- **Entry checks (derive-then-diff, never read-then-confirm).** Before building on the prior
  phase, each agent re-derives that phase's E2 claims and re-runs its E1 commands *without
  reading the claimed answers first*, then diffs. E3 claims the current phase depends on are
  either promoted (verified now) or explicitly carried forward as risk. Bounded to the ledger.
- **Mechanical self-checks.** Revert-proof every new test (pasted failing output against pre-fix
  code); every all/every/none/the-N claim gets its enumeration command inline or loses the
  quantifier; mandatory "What was NOT verified" section in Phase 4/5 outputs; no self-issued
  verdicts — a phase reports evidence, the next phase grades.
- **The three-layer stack, no fourth.** Mechanical self-checks → one fresh-context
  spot-verification per gate → mechanical tripwires. No verification-of-verification regress,
  no new phases, no trust in this document (§6's implementation pass re-derives everything).
- **Calibration.** A check either blocks with citable evidence or routes to `docs/TODO.md`.
  This repo already practices the citation-bound bar (qa's FAIL requires `file:line`).

## 2. What the starter already has (don't rebuild)

The adaptation's biggest difference from the sibling: several pieces the design asks for
already exist here in embryonic form. Contracts must **absorb** these, not duplicate them.

| Existing mechanism | Where | Relation to the design |
|---|---|---|
| Feature-gate audit "read the route file, not green tests" | `qa.md` + template Phase 5 table | Already an entry-check lens; becomes one row-family of qa's ledger verification |
| No self-agreeing DB mocks (sagacraft `dfe7add`) | `qa.md` | Already the effect-not-invocation rule for the DB boundary; P4 contracts generalize it to all mutations |
| Regression discipline: failing-then-passing, watched | `qa.md` | Already revert-proofing in prose; the contract adds *pasted output* as the required evidence |
| Phase 6 walks flows against the actual implementation | `analyst.md` | Already fresh-context re-verification; the contract adds derive-then-diff on the P4/P5 ledgers |
| `Work-Log:` commit trailer, hook + CI enforced | `scripts/commit-msg.mjs`, CI | The commit↔pipeline join the sibling doc wanted already exists here |
| Pre-push PreToolUse gate (stamp at HEAD, fails closed) | `scripts/pre-push-gate.mjs` | The template for any new blocking hook: tested, documented false-positive classes, fails open only on parse error |
| `check:audit`, `check:sql-date` tripwires | `scripts/check-*.mjs` | `check:audit` is the same adjacency heuristic the sibling retrospective flagged as theatre-risk — but its header already says "Not a proof; just a tripwire." Keep; do not upgrade its claims. The open wrong-vs-missing gap stays descoped (real static analysis, not a grep). |

## 3. What does NOT transfer (sibling-specific, dropped or remapped)

- **`check-worklog.mjs` "extend"** → there is nothing to extend. This repo's Rule 8 (no code
  before work-log) is **prose-only**: the only PreToolUse hook is the pre-push gate on Bash
  (verified in `.claude/settings.json`). Increment 1 becomes *harvest and create*, not extend —
  source: `~/git/npvitals/apps/npvitals/scripts/check-worklog.mjs` (821 lines, ships with
  `check-worklog.test.mjs`). The freshness check (work-log must mention the files being edited,
  or be same-day-fresh) comes in from day one rather than as a patch.
- **"Both apps that have one; create ADMIN's"** → monorepo-speak. One `docs/work-log/_template.md`
  here; it gets the ledger format, the entry-check record, and the NOT-verified section.
- **`check:agent-symbols` "green throughout"** → doesn't exist here. Harvest from
  `~/git/npvitals/scripts/check-agent-symbols.mjs` *before* Increment 3 rewrites nine agent
  files, so the rewrite lands with the tripwire watching it.
- **`check:driver-capability`** → not found under that filename in the sibling checkout and
  Neon-driver-specific regardless. Cited only as the proven-by-revert exemplar; nothing to port.
- **`apps/portal` / `apps/npvitals` paths, staging-query examples** → replaced by starter
  equivalents in the per-agent table below.
- **"Files must net shorter."** Written against bloated sibling files. This repo's nine agent
  files are already lean — 31–83 lines, 545 total (measured). Strict net-shorter would force
  deleting live guidance to make room. Recalibrated rule: **each contract section is ≤ 12
  lines; any prose it supersedes (per §2's absorb table) is deleted in the same edit; the
  roster's total may grow by at most ~80 lines (~15%).** The anti-bloat rationale stands —
  the cap just reflects the different starting point.

## 4. Per-agent contracts (starter-mapped)

Each of the nine files gains one short **Verification Contract** section. The §2 absorb rule
applies: where a row below restates something the file already says, the contract replaces the
prose, it doesn't join it.

| Agent | Entry check (derive-then-diff on…) | Exit ledger must contain | Self-check emphasis |
|---|---|---|---|
| analyst (P1) | the request itself — every "user can currently X" claim checked against live routes/nav (`src/app/`), not memory | flows, auth gates per flow, named exclusions with reasons | quantifier rule: "all pages", "every flow" get enumeration commands |
| architect (P2) | P1's route/component inventory; any "X already exists in `src/components/ui/` / `package.json`" claim | rulings each citing the invariant or file they rest on | a ruling that cites a file quotes the line |
| tech-lead (P3) | P2's rulings against the code; every API/prop shape gets literal code, not description | implementation order, per-increment implementer, literal contracts | flag deviations from P2 loudly, never silently fix |
| database-admin / api-developer / ux-developer / full-stack-developer (P4) | P3's design against the real `schema.ts`/routes before building — a design referencing a nonexistent symbol bounces to P3, never gets patched silently | files changed, revert-proofs (pasted failing output), literal gate output, "What was NOT verified" | effect-not-invocation: a mutation's test asserts the state change or row count, not that a function was called (generalizes qa's existing DB-mock rule to the author's side) |
| qa (P5) | P4's ledger — re-run its E1 commands, re-derive its E2 claims; treat implementer-verified as unproven | PASS/FAIL/BLOCKED + per-claim confirmation + what each mocked boundary leaves unproven | the existing feature-gate audit and no-self-agreeing-mocks rules become the entry-check lens, not a parallel list |
| analyst (P6) | the shipped diff against P1's intent, deriving inventories independently | verdict + notes routed to `docs/TODO.md`; never flips a verdict on same-session rework | citation-bound blocking; backlog for the rest |
| deployment-engineer / tech-lead (reviews) | the review target's own claims — a review runs the thing it reviews | parseable `docs/reviews/log.md` line + TODO routing | reviews read code directly, never green suites |

**Bug-fix variant:** where the same session records its own Phase 5, the verdict is labeled
`implementer-verified` and stays provisional until Phase 6 — matching the existing
Bug-Fix Variant table in CLAUDE.md.

## 5. Cross-model hardening (cheap, secondary)

All nine files pin `model: sonnet` (verified) — the at-risk same-family configuration the
self-preference research describes. But the sibling data says fresh-context independence does
most of the work even same-family. So: keep the frontmatter pins; at the two judgment gates —
qa (P5) and the **P6 invocation** of analyst — spawn with a per-invocation `model` override
(the Agent tool supports it) to a different model than the implementer of record. Note in
CLAUDE.md's pipeline section, since analyst's single file serves both P1 (sonnet fine) and P6
(override applies). Worth doing because it's nearly free, not because the pipeline depends on it.

## 6. Mechanical enforcement (hooks, not prose)

1. **Work-log gate hook (new).** Harvest `check-worklog.mjs` + its test file; adapt paths;
   register as PreToolUse on Edit/Write. Checks: (a) a non-trivial edit requires a work-log
   that mentions the files being edited or is same-day-fresh — closes the gap Rule 8 currently
   leaves to prose; (b) a Phase 4/5 section without a "What was NOT verified" heading fails.
   Follow `pre-push-gate.mjs` house style: fails open only on parse error, unit-tested,
   false-positive classes documented. Fixture-test against the real files in `docs/work-log/`.
2. **Ledger presence check (new, small).** A work-log whose Per-Phase Status table shows any
   phase ≥ 3 complete must have a `| Claim |`-shaped table in each completed phase section.
   Wire into `npm run check` and the `/pre-push` skill.
3. **`check:agent-symbols` (harvested).** Lands before the agent-file rewrite (Increment 3).
4. **Quantifier linter (advisory only, never blocking).** Flag `\b(all|every|none|the \d+)\b`
   in completed-phase sections with no fenced command block within N lines. Natural home:
   alongside `cadence-check.mjs` in the SessionStart hooks, or a `/pre-push` advisory line.
   Drop it if noisy — it's the optional increment.
5. **Descoped:** `check:audit`'s wrong-vs-missing gap (see §2 table) — stays a TODO line, not
   a hook. Forcing it into a grep would produce a confidently-wrong checker.

Every new tripwire is proven by making it fail on the day it's written. A gate nobody has seen
fail is not a gate.

## 7. Template changes (`docs/work-log/_template.md`)

- Each phase section gains a closing **Claims Ledger** table (`| # | Claim | Class | Evidence |`).
- Phase 2–6 sections open with a **Prior-Phase Spot-Check** line: which ledger rows were
  re-derived, and any diffs found (diffs found = the entry check earning its keep; log them).
- Phase 4 and Phase 5 gain a required **What was NOT verified** heading (hook-enforced, §6.1).
- Phase 5's existing Feature-Gate Audit table stays — it is already ledger-shaped.

## 8. Implementation plan (own pipeline run, via `/new-feature`)

| Inc | Content | Risk / notes |
|---|---|---|
| 1 | Harvest + adapt work-log gate hook (freshness + NOT-verified checks), tests, settings.json registration | New blocking hook — fixture against every real work-log in `docs/work-log/`; follow pre-push-gate house style |
| 2 | Ledger + spot-check + NOT-verified format into `_template.md`; ledger presence check wired into `npm run check` + `/pre-push` | Low |
| 3 | Harvest `check:agent-symbols`; then the nine contract sections per §4, absorb rule enforced, ≤ +80 lines roster-wide | The big one; each file individually verified |
| 4 | CLAUDE.md pipeline section: evidence classes, entry-check rule, self-check rules, P5/P6 model-override note — replacing prose it supersedes | Doc |
| 5 | Quantifier linter, advisory | Optional; drop if noisy |

Sequenced so mechanical gates land before the instructions that reference them — instructions
claiming enforcement that doesn't exist is the signature failure this design exists to kill.
At ship time: functionality-map line (Rule 14), release notes, TODO reconciliation (Rule 10),
and — since the pipeline itself changed — a `docs/decisions.md` entry.

## 9. Claims Ledger for this adaptation

| # | Claim | Class | Evidence |
|---|---|---|---|
| 1 | Nine agent files, 31–83 lines each, 545 total | E1 | `wc -l .claude/agents/*.md` (output in session, 2026-09-07) |
| 2 | All nine pin `model: sonnet` | E1 | `grep -n "model:" .claude/agents/*.md` — 9/9 shown |
| 3 | Rule 8 has no hook enforcement; only PreToolUse hook is `pre-push-gate.mjs` on Bash | E2 | `.claude/settings.json` hooks block read in full |
| 4 | Harvest sources exist: `check-worklog.mjs` (821 lines + test), `check-agent-symbols.mjs` | E1 | `wc -l`/`find` against `~/git/npvitals` |
| 5 | `check:driver-capability` not present under that filename in the sibling checkout | E2 | `find ~/git/npvitals -name "check-driver-capability*"` → no hits (npm-script name may map elsewhere — re-verify at harvest time) |
| 6 | `check:audit` here is a mutation/audit adjacency heuristic that self-describes as "Not a proof" | E1 | `scripts/check-audit-coverage.mjs` header read |
| 7 | `Work-Log:` trailer is enforced by the local commit-msg hook AND in CI | E1 | trailer check read inside the exported `validateCommitMessage` (`commit-msg.mjs:125–146`); `validate-commit-range.mjs` imports and runs that same function on every commit in the PR range |
| 8 | The sibling retrospective file exists at the cited path | E1 | `ls ~/git/npvitals/apps/portal/docs/reviews/2026-09-07-retrospective.md` |

Claim 7's history is itself a lesson this design should carry: a first-pass literal grep for
"Work-Log" in `validate-commit-range.mjs` found no hits and produced a confident (wrong)
"CI doesn't enforce it" finding. Reading the code showed CI imports the hook's shared
`validateCommitMessage`, which contains the check — the claim in CLAUDE.md is true. Moral for
the contracts: an entry check derives by *reading the mechanism*, not by grepping for the
literal string a claim happens to use. A grep miss is absence of evidence, not evidence of
absence.

---

*Sources: the npvitals-monorepo design doc of 2026-09-07 and its citations — Anthropic
"Building Effective Agents" / Claude Code Best Practices; Panickssery et al. (NeurIPS 2024);
arXiv 2410.21819; arXiv 2508.06709; Dhuliawala et al., Chain-of-Verification (arXiv 2309.11495);
`~/git/npvitals/apps/portal/docs/reviews/2026-09-07-retrospective.md`.*
