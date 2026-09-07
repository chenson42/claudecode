#!/usr/bin/env node
/**
 * Ledger-presence tripwire. docs/work-log/2026-09-07-verification-contracts.md
 * (Phase 3, Increment 2) gives Workflow Rule 8's sibling requirement — "a
 * completed phase carries a Claims Ledger" — real teeth: a work-log whose
 * Per-Phase Status table marks any phase 3-6 "Complete" must have a
 * `| # | Claim | Class | Evidence |`-shaped table in that phase's own section.
 *
 * Wired as its own named, hard-blocking `/pre-push` step (Step 3e), the same
 * pattern Steps 3b/3c already use for check:audit / check:sql-date — per the
 * architect's Phase 2 ruling that an advisory-only ledger check would be
 * inconsistent with /pre-push already treating its sibling tripwires as hard
 * gates.
 *
 * GRANDFATHER CUTOFF: only work-logs dated strictly AFTER
 * LEDGER_GRANDFATHER_CUTOFF are in scope — mirrors stats:escape's own
 * hardcoded 2026-05-18 precedent for the Work-Log trailer requirement. The
 * scope test is the filename's own YYYY-MM-DD prefix, no git needed (the
 * `docs/work-log/YYYY-MM-DD-<slug>.md` naming convention is itself the
 * date-of-record). Without a cutoff, this check would fail on every one of
 * the ~45 work-logs that predate the Claims Ledger format entirely, the
 * moment this script starts running in /pre-push.
 *
 * Not a proof; just a tripwire — matching check-audit-coverage.mjs and
 * check-sql-date.mjs's own self-description.
 *
 * Run: `node scripts/check-ledger.mjs` (also `npm run check:ledger`,
 * folded into `npm run check`).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractPhaseSection } from "./worklog-gate.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const WORKLOG_DIR = path.join(REPO_ROOT, "docs", "work-log");

// Set to the calendar date Increment 2 merges to main (this feature's own
// ship date) — mirrors stats:escape's hardcoded "2026-05-18" precedent
// exactly. Do not leave this as a placeholder; do not backdate it.
export const LEDGER_GRANDFATHER_CUTOFF = "2026-09-07";

export const LEDGER_TABLE_RE = /^\|\s*#\s*\|\s*Claim\s*\|\s*Class\s*\|\s*Evidence\s*\|/m;

// Matches a Per-Phase Status table row for phases 3-6, capturing the Status
// cell (group 2). Row shape (docs/work-log/_template.md):
//   | 3 — Technical design | tech-lead | Pending | — | — |
//                          ^ owner      ^ status (captured)
export const STATUS_ROW_RE = /^\|\s*([3-6])\s*[—-][^|]*\|[^|]*\|\s*([^|]+?)\s*\|/gm;

/**
 * @param {string} filename — basename only, e.g. "2026-09-07-foo.md"
 * @returns {string} the leading YYYY-MM-DD prefix
 */
export function fileDate(filename) {
  return filename.slice(0, 10);
}

/**
 * @param {string} filename — basename only
 * @returns {boolean} true if strictly after the grandfather cutoff
 */
export function isInScope(filename) {
  return fileDate(filename) > LEDGER_GRANDFATHER_CUTOFF;
}

/**
 * @param {string} content — full work-log file content
 * @returns {number[]} phase numbers (3-6) whose Status cell reads "Complete"
 *   (trimmed, case-insensitive)
 */
export function completedPhases(content) {
  const completed = [];
  STATUS_ROW_RE.lastIndex = 0;
  let match;
  while ((match = STATUS_ROW_RE.exec(content)) !== null) {
    const phase = Number(match[1]);
    const status = match[2].trim().toLowerCase();
    if (status === "complete") completed.push(phase);
  }
  return completed;
}

/**
 * @param {string} filename — basename, used only for the isInScope check
 * @param {string} content
 * @returns {string[]} violation messages, one per phase missing its ledger
 */
export function checkWorklog(filename, content) {
  if (!isInScope(filename)) return [];

  const violations = [];
  for (const phase of completedPhases(content)) {
    const section = extractPhaseSection(content, phase);
    if (section === null || !LEDGER_TABLE_RE.test(section)) {
      violations.push(
        `${filename}: Phase ${phase} is Complete but has no Claims Ledger table`,
      );
    }
  }
  return violations;
}

function main() {
  let files;
  try {
    files = readdirSync(WORKLOG_DIR).filter(
      (f) => f.endsWith(".md") && f !== "_template.md",
    );
  } catch {
    console.log(
      "check:ledger — docs/work-log/ does not exist in this checkout; nothing to check.",
    );
    process.exit(0);
  }

  const allViolations = [];
  let inScopeCount = 0;
  for (const file of files) {
    if (isInScope(file)) inScopeCount++;
    const content = readFileSync(path.join(WORKLOG_DIR, file), "utf8");
    allViolations.push(...checkWorklog(file, content));
  }

  console.log(
    `check:ledger — ${files.length} work-log(s) found, ${inScopeCount} in scope ` +
      `(dated after ${LEDGER_GRANDFATHER_CUTOFF}), ${files.length - inScopeCount} grandfathered.`,
  );

  if (allViolations.length > 0) {
    console.error("\ncheck:ledger FAILED\n");
    for (const v of allViolations) console.error(`  ${v}`);
    console.error(
      "\nAdd the missing Claims Ledger table (`| # | Claim | Class | Evidence |`), or correct " +
        "the Per-Phase Status entry if the phase isn't actually complete.",
    );
    process.exit(1);
  }

  console.log("check:ledger passed — every in-scope Complete phase has a Claims Ledger.");
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("check-ledger.mjs");

if (isMain) main();
