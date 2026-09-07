# Retrospective — 2026-09-07

**Owner:** tech-lead (run inline by the orchestrating session — a full nine-agent brief
synthesis was skipped because the window contains almost no pipeline activity; noted per the
no-silent-skips rule).
**Window:** 2026-08-09 → 2026-09-07 (previous retrospective: 2026-07-11, run 44 days late
against the 14-day cadence).
**Input artifacts:** `npm run stats:escape` output (verbatim below), `docs/reviews/log.md`,
`docs/TODO.md`, `git log` since 2026-08-09, `docs/verification-contracts-design.md`,
`~/git/npvitals/apps/portal/docs/reviews/2026-09-07-retrospective.md` (sibling).

## Escape-Rate Stats (`npm run stats:escape`, verbatim)

```
Escape-Rate Report — 30-day window
Grandfather cutoff: 2026-05-18 (commits before this date lacked trailers by design)

Total commits (30d):         4
fix: commits (30d):          0
  With trailers:             0
  Missing trailers (bypass): 0   ← hook bypassed or pre-cutoff

Caught-By breakdown (no tagged fix: commits in the last 30 days)
Discovered-In breakdown: all zeros
```

Missing-trailers (bypass) count: **0** — the standard to hold.

## Post-merge trend (carried retrospective-to-retrospective)

| Retro | post-merge Discovered-In |
|---|---|
| 2026-07-11 | 57% (4 of 7 tagged fixes) |
| 2026-09-07 | n/a — zero fix commits in window |

The trend line cannot move on an idle window. The 57% figure from July stands as this repo's
last real measurement, and it points the same direction as the sibling's data (76% post-merge
or production, 50 fixes/30d in npvitals): **the pipeline's gates fire late and verify claims
rather than effects.** That is precisely the failure class the verification-contracts feature
(`docs/verification-contracts-design.md`) targets.

## Findings

1. **The window was idle, not healthy.** Four commits in 30 days (v0.7.0 release cluster +
   dependency bump). Zero fixes means zero escapes measured, not zero escapes latent. No
   process conclusions can be drawn from this repo's own 30-day data.
2. **Contract-weighting decision (the reason this retro was run now):** with no local escape
   data contradicting it, the sibling retrospective's mechanism split — (A) effect-not-invocation
   verification gaps, (B) unverified completeness/quantifier claims — is **adopted as the
   weighting basis for Increment 3** of the verification-contracts feature. The July local data
   is consistent: BUG-1..4 were all post-merge discoveries where green unit suites verified
   invocation, not effect (`db.transaction` on neon-http being the canonical example — the same
   bug class as the sibling's mocked-transaction escape).
3. **Cadence slippage is the real local process failure.** Retrospective 44d overdue,
   test-coverage 54d, all five monthly types 28d. An idle repo stops running its own reviews —
   the SessionStart cadence hook surfaced this correctly today and the operator deferred all but
   this one. No mechanism change proposed; the hook works, the backlog is the record.

## Punch list

1. Proceed with the verification-contracts pipeline (Increments 1–5) using the sibling
   mechanism split as contract emphasis — in flight as of today.
2. `check:audit` wrong-vs-missing gap → tracked in `docs/TODO.md` (descoped from mechanical
   enforcement; see design doc §6.5).
3. Remaining overdue reviews (test-coverage + the five monthly types) stay deferred by operator
   decision 2026-09-07; next session's cadence hook re-surfaces them.
