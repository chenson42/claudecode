/**
 * Unit tests for the ledger-presence tripwire (scripts/check-ledger.mjs).
 *
 * Added in Phase 5 (qa) of docs/work-log/2026-09-07-verification-contracts.md.
 * Coverage addition, not a defect fix: Phase 4 shipped check-ledger.mjs with no
 * test file at all, on Phase 2's "single-purpose grep tripwires need no test"
 * ruling — but this script is not a grep tripwire. It carries a hardcoded
 * grandfather cutoff that Phase 3's own Edge Cases named as the feature's
 * highest-risk constant ("get it wrong and either every historical work-log
 * fails /pre-push simultaneously, or a work-log that should be in scope
 * silently isn't"), plus two real parsers. Nothing guarded either one.
 *
 * The boundary is deliberately STRICT (`>`): a work-log dated ON the cutoff is
 * grandfathered. That is what the shipped code does, so it is what these tests
 * pin — see the work-log's Phase 5 Notes for why it means this feature's own
 * work-log is out of scope.
 *
 * Run via: npm test
 */
import { describe, it, expect } from "vitest";
import {
  LEDGER_GRANDFATHER_CUTOFF,
  LEDGER_TABLE_RE,
  fileDate,
  isInScope,
  completedPhases,
  checkWorklog,
} from "./check-ledger.mjs";

const LEDGER_TABLE = [
  "| # | Claim | Class | Evidence |",
  "|---|-------|-------|----------|",
  "| 1 | something | E1 | a command |",
].join("\n");

/** @param {string} status @param {string} [body] */
function worklog(status, body) {
  return [
    "# Fixture",
    "",
    "| Phase | Owner | Status | Verdict | Date |",
    "|-------|-------|--------|---------|------|",
    "| 1 — Functional refinement | analyst | Complete | READY | 2026-10-01 |",
    `| 3 — Technical design | tech-lead | ${status} | — | — |`,
    "| 5 — Verification | qa | Pending | — | — |",
    "",
    "# Phase 3 — Technical Design (tech-lead)",
    "",
    body ?? "No ledger here.",
    "",
  ].join("\n");
}

// ── The cutoff constant itself ──────────────────────────────────────────────

describe("LEDGER_GRANDFATHER_CUTOFF", () => {
  it("should be a real YYYY-MM-DD date, never the YYYY-MM-DD placeholder Phase 3 warned about", () => {
    expect(LEDGER_GRANDFATHER_CUTOFF).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(Number.isFinite(Date.parse(LEDGER_GRANDFATHER_CUTOFF))).toBe(true);
  });
});

// ── isInScope / fileDate ────────────────────────────────────────────────────

describe("fileDate", () => {
  it("should read the YYYY-MM-DD prefix off a work-log filename", () => {
    expect(fileDate("2026-09-08-some-slug.md")).toBe("2026-09-08");
  });
});

describe("isInScope", () => {
  it("should put a work-log dated the day AFTER the cutoff in scope", () => {
    const dayAfter = new Date(Date.parse(LEDGER_GRANDFATHER_CUTOFF) + 86400000)
      .toISOString()
      .slice(0, 10);

    expect(isInScope(`${dayAfter}-slug.md`)).toBe(true);
  });

  it("should grandfather a work-log dated exactly ON the cutoff — the boundary is strictly after", () => {
    expect(isInScope(`${LEDGER_GRANDFATHER_CUTOFF}-slug.md`)).toBe(false);
  });

  it("should grandfather a work-log dated the day BEFORE the cutoff", () => {
    const dayBefore = new Date(Date.parse(LEDGER_GRANDFATHER_CUTOFF) - 86400000)
      .toISOString()
      .slice(0, 10);

    expect(isInScope(`${dayBefore}-slug.md`)).toBe(false);
  });

  it("should grandfather the whole pre-format corpus (a 2026-05 work-log)", () => {
    expect(isInScope("2026-05-16-api-keys.md")).toBe(false);
  });
});

// ── completedPhases (Per-Phase Status table parsing) ────────────────────────

describe("completedPhases", () => {
  it("should report a phase whose Status cell reads Complete", () => {
    expect(completedPhases(worklog("Complete"))).toEqual([3]);
  });

  it("should ignore a phase whose Status cell reads Pending", () => {
    expect(completedPhases(worklog("Pending"))).toEqual([]);
  });

  it("should match the Status cell case-insensitively", () => {
    expect(completedPhases(worklog("COMPLETE"))).toEqual([3]);
  });

  it("should ignore phases 1 and 2 — only 3 through 6 carry the ledger requirement", () => {
    const content = completedPhases(worklog("Pending"));

    expect(content).not.toContain(1);
    expect(content).not.toContain(2);
  });

  it("should be re-runnable on the same input — the module-level /g regex must not leak lastIndex", () => {
    const content = worklog("Complete");

    const first = completedPhases(content);
    const second = completedPhases(content);

    expect(second).toEqual(first);
  });
});

// ── checkWorklog ────────────────────────────────────────────────────────────

describe("checkWorklog", () => {
  it("should flag an in-scope work-log whose Complete phase has no Claims Ledger table", () => {
    const violations = checkWorklog("2099-01-01-lazy.md", worklog("Complete"));

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("Phase 3 is Complete but has no Claims Ledger");
  });

  it("should pass an in-scope work-log whose Complete phase carries the ledger table", () => {
    expect(checkWorklog("2099-01-01-good.md", worklog("Complete", LEDGER_TABLE))).toEqual([]);
  });

  it("should pass an out-of-scope work-log even with a Complete phase and no ledger — regression for the grandfather cutoff", () => {
    expect(checkWorklog("2026-05-16-old.md", worklog("Complete"))).toEqual([]);
  });

  it("should pass an in-scope work-log whose phases are all still Pending", () => {
    expect(checkWorklog("2099-01-01-wip.md", worklog("Pending"))).toEqual([]);
  });

  it("should flag a Complete phase whose section heading is missing entirely", () => {
    const noSection = worklog("Complete").replace("# Phase 3 — Technical Design (tech-lead)", "");

    expect(checkWorklog("2099-01-01-nosection.md", noSection)).toHaveLength(1);
  });
});

// ── Documented limitation: presence, not substance ──────────────────────────

describe("LEDGER_TABLE_RE — known scope of the tripwire", () => {
  it("should match on the header row alone, so an EMPTY ledger table passes the check", () => {
    // Pinning current, intended behaviour: check:ledger is a presence tripwire,
    // not a proof (see the script's own header comment). A work-log copied
    // verbatim from _template.md and marked Complete satisfies it with a ledger
    // containing no claims. If a future change tightens this to require at least
    // one populated row, this test SHOULD fail — that is the point of pinning it.
    const emptyLedger = ["| # | Claim | Class | Evidence |", "|---|-------|-------|----------|", "| | | E1 / E2 / E3 | |"].join("\n");

    expect(checkWorklog("2099-01-01-empty.md", worklog("Complete", emptyLedger))).toEqual([]);
  });

  it("should not match prose that merely mentions a Claims Ledger", () => {
    expect(LEDGER_TABLE_RE.test("This phase has a Claims Ledger, honest.")).toBe(false);
  });
});
