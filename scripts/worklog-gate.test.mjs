/**
 * Unit tests for the work-log gate. Mirrors pre-push-gate.test.mjs's
 * structure: pure-function tests with real fixtures, plus a fixture pass
 * against the real docs/work-log/ corpus. isSameDayFresh() shells out to git;
 * only its fail-open catch path is exercised here (a bad cwd), matching
 * pre-push-gate.test.mjs's treatment of marker/HEAD gating as "integration
 * territory" — the full hook (stdin parsing, marker consumption) is smoke-
 * tested live, not unit-tested here (see the work-log's "What was NOT
 * verified" section).
 *
 * Run via: npm test
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  TRIGGER_PREFIXES,
  isTriggerPath,
  extractPhaseSection,
  worklogMentionsPath,
  isPhaseSectionSubstantive,
  hasNotVerifiedHeading,
  isSameDayFresh,
  readTrivialMarker,
  trivialMarkerMatches,
  evaluateWorklogGate,
} from "./worklog-gate.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKLOG_DIR = path.join(REPO_ROOT, "docs", "work-log");

// ── isTriggerPath / TRIGGER_PREFIXES ────────────────────────────────────────

describe("TRIGGER_PREFIXES", () => {
  it("is exactly src/ and drizzle/ — unchanged from the harvest", () => {
    expect(TRIGGER_PREFIXES).toEqual(["src/", "drizzle/"]);
  });
});

describe("isTriggerPath", () => {
  it("src/lib/foo.ts triggers", () => {
    expect(isTriggerPath("src/lib/foo.ts")).toBe(true);
  });

  it("drizzle/0006_add_x.sql triggers", () => {
    expect(isTriggerPath("drizzle/0006_add_x.sql")).toBe(true);
  });

  it("scripts/** does not trigger", () => {
    expect(isTriggerPath("scripts/worklog-gate.mjs")).toBe(false);
  });

  it(".claude/** does not trigger", () => {
    expect(isTriggerPath(".claude/agents/qa.md")).toBe(false);
  });

  it("docs/work-log/** does not trigger (the evidence, never the trigger)", () => {
    expect(isTriggerPath("docs/work-log/2026-09-07-foo.md")).toBe(false);
  });
});

// ── extractPhaseSection ──────────────────────────────────────────────────────

const SYNTHETIC = `# Phase 1 — Functional Refinement (analyst)

## VERDICT

READY WITH NOTES

---

# Phase 2 — Architectural Review (architect)

## Verdict

Approved

---

# Phase 4 — Implementation

## Files Created

- \`path/to/file\` — purpose

---

# Phase 5 — Verification (qa)

## Verdict

PASS
`;

describe("extractPhaseSection", () => {
  it("extracts Phase 1 up to the Phase 2 heading", () => {
    const section = extractPhaseSection(SYNTHETIC, 1);
    expect(section).toContain("READY WITH NOTES");
    expect(section).not.toContain("# Phase 2");
  });

  it("extracts Phase 2 up to the Phase 4 heading", () => {
    const section = extractPhaseSection(SYNTHETIC, 2);
    expect(section).toContain("Approved");
    expect(section).not.toContain("# Phase 4");
  });

  it("extracts the last phase section through EOF", () => {
    const section = extractPhaseSection(SYNTHETIC, 5);
    expect(section).toContain("PASS");
  });

  it("returns null when the phase heading is absent", () => {
    expect(extractPhaseSection(SYNTHETIC, 3)).toBeNull();
    expect(extractPhaseSection(SYNTHETIC, 6)).toBeNull();
  });

  it("returns null on content with no phase headings at all", () => {
    expect(extractPhaseSection("# Some other document\n", 1)).toBeNull();
  });
});

// ── worklogMentionsPath ──────────────────────────────────────────────────────

describe("worklogMentionsPath", () => {
  it("finds a literal substring match", () => {
    expect(
      worklogMentionsPath("Surface: touches src/lib/foo.ts and src/app/bar.tsx", "src/lib/foo.ts"),
    ).toBe(true);
  });

  it("returns false when the path is absent", () => {
    expect(worklogMentionsPath("Surface: touches src/lib/other.ts", "src/lib/foo.ts")).toBe(false);
  });
});

// ── isPhaseSectionSubstantive ────────────────────────────────────────────────

describe("isPhaseSectionSubstantive", () => {
  it("Phase 4 template placeholder is not substantive", () => {
    const placeholder = `# Phase 4 — Implementation

## Files Created

- \`path/to/file\` — purpose

## Files Modified

- \`path/to/file\` — what changed
`;
    expect(isPhaseSectionSubstantive(placeholder, 4)).toBe(false);
  });

  it("Phase 4 with real file paths is substantive", () => {
    const real = `# Phase 4 — Implementation

## Files Created

- \`scripts/worklog-gate.mjs\` — hook

## What was NOT verified

nothing
`;
    expect(isPhaseSectionSubstantive(real, 4)).toBe(true);
  });

  it("Phase 5 template placeholder is not substantive", () => {
    const placeholder = `# Phase 5 — Verification (qa)

## Verdict

[PASS | FAIL | BLOCKED — name the unmet prerequisite]
`;
    expect(isPhaseSectionSubstantive(placeholder, 5)).toBe(false);
  });

  it("Phase 5 with a real verdict is substantive", () => {
    const real = `# Phase 5 — Verification (qa)

## Verdict

PASS
`;
    expect(isPhaseSectionSubstantive(real, 5)).toBe(true);
  });

  it("null section is not substantive", () => {
    expect(isPhaseSectionSubstantive(null, 4)).toBe(false);
  });
});

// ── hasNotVerifiedHeading ────────────────────────────────────────────────────

describe("hasNotVerifiedHeading", () => {
  it("finds the heading", () => {
    expect(hasNotVerifiedHeading("## Files Created\n\n## What was NOT verified\n\ntext\n")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(hasNotVerifiedHeading("## what was not verified\n")).toBe(true);
  });

  it("returns false when absent", () => {
    expect(hasNotVerifiedHeading("## Files Created\n\n- foo\n")).toBe(false);
  });

  it("does not match the heading as a mid-sentence phrase", () => {
    expect(hasNotVerifiedHeading("This section covers what was not verified in prose.")).toBe(false);
  });
});

// ── isSameDayFresh — fail-open path only ────────────────────────────────────

describe("isSameDayFresh", () => {
  it("fails OPEN when git plumbing errors (bad cwd)", () => {
    expect(isSameDayFresh("docs/work-log/nonexistent.md", "/nonexistent/repo/root/for/tests")).toBe(true);
  });
});

// ── readTrivialMarker / trivialMarkerMatches ────────────────────────────────

describe("readTrivialMarker", () => {
  it("returns null for a missing file", () => {
    expect(readTrivialMarker("/nonexistent/path/trivial-ok.json")).toBeNull();
  });

  // Added in Phase 5 (qa): only the missing-file path was covered. A corrupt
  // marker on disk must degrade to "no exemption" (block), never throw out of
  // the hook — a throw here would be an uncaught crash in a PreToolUse hook,
  // which is the one failure mode this script's whole fail-open posture exists
  // to avoid. Live-verified against the CLI in Phase 5 as well.
  it("should return null rather than throw when the marker file is not valid JSON", () => {
    const corrupt = path.join(REPO_ROOT, "scripts", "worklog-gate.test.mjs");

    const marker = readTrivialMarker(corrupt);

    expect(marker).toBeNull();
  });

  it("should return null rather than throw when the marker path is unreadable (a directory)", () => {
    const notAFile = path.join(REPO_ROOT, "docs", "work-log");

    expect(readTrivialMarker(notAFile)).toBeNull();
  });
});

describe("trivialMarkerMatches", () => {
  const now = "2026-09-07T12:05:00.000Z";

  it("matches a valid, unexpired, same-path marker", () => {
    const marker = {
      path: "src/lib/foo.ts",
      reason: "typo",
      stampedAt: "2026-09-07T12:00:00.000Z",
      expiresAt: "2026-09-07T12:10:00.000Z",
    };
    expect(trivialMarkerMatches(marker, "src/lib/foo.ts", now)).toBe(true);
  });

  it("rejects a different path", () => {
    const marker = {
      path: "src/lib/other.ts",
      expiresAt: "2026-09-07T12:10:00.000Z",
    };
    expect(trivialMarkerMatches(marker, "src/lib/foo.ts", now)).toBe(false);
  });

  it("rejects an expired marker", () => {
    const marker = {
      path: "src/lib/foo.ts",
      expiresAt: "2026-09-07T12:00:00.000Z",
    };
    expect(trivialMarkerMatches(marker, "src/lib/foo.ts", now)).toBe(false);
  });

  it("rejects a null marker", () => {
    expect(trivialMarkerMatches(null, "src/lib/foo.ts", now)).toBe(false);
  });

  it("rejects a marker with an unparseable expiresAt", () => {
    const marker = { path: "src/lib/foo.ts", expiresAt: "not-a-date" };
    expect(trivialMarkerMatches(marker, "src/lib/foo.ts", now)).toBe(false);
  });
});

// ── evaluateWorklogGate — full block/allow matrix ───────────────────────────

describe("evaluateWorklogGate", () => {
  it("non-trigger path → allow, no other inputs consulted", () => {
    const result = evaluateWorklogGate({
      targetPath: "README.md",
      worklogDocsExists: false,
      worklogs: [],
      isFresh: () => {
        throw new Error("must not be called for a non-trigger path");
      },
      trivialExempt: false,
    });
    expect(result.decision).toBe("allow");
  });

  it("missing docs/work-log/ directory → allow (fork deleted the scaffolding)", () => {
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: false,
      worklogs: [],
      isFresh: () => false,
      trivialExempt: false,
    });
    expect(result.decision).toBe("allow");
    expect(result.reason).toContain("does not exist");
  });

  it("trivial marker exempt → allow even with zero work-logs", () => {
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [],
      isFresh: () => false,
      trivialExempt: true,
    });
    expect(result.decision).toBe("allow");
  });

  it("trigger path, docs exist, no qualifying work-log → BLOCK", () => {
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [{ path: "docs/work-log/2026-01-01-unrelated.md", content: "nothing relevant" }],
      isFresh: () => false,
      trivialExempt: false,
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCKED (Workflow Rule 8)");
  });

  it("trigger path, work-log mentions the path (not fresh) → ALLOW", () => {
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [
        {
          path: "docs/work-log/2026-01-01-foo.md",
          content: "Surface: touches src/lib/foo.ts\n\n# Phase 1 — x\n",
        },
      ],
      isFresh: () => false,
      trivialExempt: false,
    });
    expect(result.decision).toBe("allow");
  });

  it("trigger path, work-log doesn't mention path but IS fresh → ALLOW", () => {
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [{ path: "docs/work-log/2026-09-07-bar.md", content: "no mention here" }],
      isFresh: (p) => p === "docs/work-log/2026-09-07-bar.md",
      trivialExempt: false,
    });
    expect(result.decision).toBe("allow");
  });

  it("isFresh is never called when the mention check already matches (short-circuit)", () => {
    let called = false;
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [{ path: "docs/work-log/2026-01-01-foo.md", content: "src/lib/foo.ts" }],
      isFresh: () => {
        called = true;
        return true;
      },
      trivialExempt: false,
    });
    expect(result.decision).toBe("allow");
    expect(called).toBe(false);
  });

  it("qualifying work-log with substantive Phase 4, no 'What was NOT verified' heading → BLOCK", () => {
    const content = `Surface: src/lib/foo.ts

# Phase 4 — Implementation

## Files Created

- \`scripts/worklog-gate.mjs\` — hook
`;
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [{ path: "docs/work-log/2026-09-07-foo.md", content }],
      isFresh: () => false,
      trivialExempt: false,
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("Phase 4 section is missing");
  });

  it("qualifying work-log with substantive Phase 4 AND the heading → ALLOW", () => {
    const content = `Surface: src/lib/foo.ts

# Phase 4 — Implementation

## Files Created

- \`scripts/worklog-gate.mjs\` — hook

## What was NOT verified

Nothing outstanding.
`;
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [{ path: "docs/work-log/2026-09-07-foo.md", content }],
      isFresh: () => false,
      trivialExempt: false,
    });
    expect(result.decision).toBe("allow");
  });

  it("qualifying work-log with Phase 4 still the bare template placeholder → ALLOW (not yet substantive)", () => {
    const content = `Surface: src/lib/foo.ts

# Phase 4 — Implementation

## Files Created

- \`path/to/file\` — purpose
`;
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [{ path: "docs/work-log/2026-09-07-foo.md", content }],
      isFresh: () => false,
      trivialExempt: false,
    });
    expect(result.decision).toBe("allow");
  });

  it("first qualifying work-log fails the heading check but a second one passes → ALLOW", () => {
    const failing = `Surface: src/lib/foo.ts

# Phase 4 — Implementation

## Files Created

- \`scripts/worklog-gate.mjs\` — hook
`;
    const passing = `Surface: src/lib/foo.ts

# Phase 4 — Implementation

## Files Created

- \`scripts/other.mjs\` — hook

## What was NOT verified

Nothing outstanding.
`;
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [
        { path: "docs/work-log/2026-01-01-failing.md", content: failing },
        { path: "docs/work-log/2026-09-07-passing.md", content: passing },
      ],
      isFresh: () => false,
      trivialExempt: false,
    });
    expect(result.decision).toBe("allow");
  });

  it("qualifying work-log with substantive Phase 5, no heading → BLOCK naming Phase 5", () => {
    const content = `Surface: src/lib/foo.ts

# Phase 5 — Verification (qa)

## Verdict

PASS
`;
    const result = evaluateWorklogGate({
      targetPath: "src/lib/foo.ts",
      worklogDocsExists: true,
      worklogs: [{ path: "docs/work-log/2026-09-07-foo.md", content }],
      isFresh: () => false,
      trivialExempt: false,
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("Phase 5 section is missing");
  });
});

// ── Fixture pass against the real docs/work-log/ corpus ─────────────────────

describe("fixture pass — real docs/work-log/ corpus", () => {
  const files = readdirSync(WORKLOG_DIR).filter(
    (f) => f.endsWith(".md") && f !== "_template.md",
  );

  it("found the expected real work-log files (sanity check on the fixture path)", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it("extractPhaseSection and hasNotVerifiedHeading never throw on any real file, any phase 1-6", () => {
    for (const file of files) {
      const content = readFileSync(path.join(WORKLOG_DIR, file), "utf8");
      for (let phase = 1; phase <= 6; phase++) {
        expect(() => {
          const section = extractPhaseSection(content, phase);
          if (section !== null) hasNotVerifiedHeading(section);
        }, `${file} phase ${phase}`).not.toThrow();
      }
    }
  });

  it("spot-check: this work-log's own Phase 1 section extracts to the analyst's READY WITH NOTES verdict", () => {
    const content = readFileSync(
      path.join(WORKLOG_DIR, "2026-09-07-verification-contracts.md"),
      "utf8",
    );
    const phase1 = extractPhaseSection(content, 1);
    expect(phase1).toContain("READY WITH NOTES");
    expect(phase1).not.toContain("# Phase 2 — Architectural Review");
  });

  it("spot-check: this work-log's own Phase 2 section extracts to the architect's verdict, bounded before Phase 3", () => {
    const content = readFileSync(
      path.join(WORKLOG_DIR, "2026-09-07-verification-contracts.md"),
      "utf8",
    );
    const phase2 = extractPhaseSection(content, 2);
    expect(phase2).toContain("Approved with suggestions");
    expect(phase2).not.toContain("# Phase 3 — Technical Design");
  });

  it("spot-check: this work-log's own Phase 3 section extracts and is bounded before Phase 4", () => {
    const content = readFileSync(
      path.join(WORKLOG_DIR, "2026-09-07-verification-contracts.md"),
      "utf8",
    );
    const phase3 = extractPhaseSection(content, 3);
    expect(phase3).toContain("Two new mechanisms give CLAUDE.md's process rules");
    expect(phase3).not.toContain("# Phase 4 — Implementation");
  });
});
