#!/usr/bin/env node
/**
 * Work-log gate — mechanizes Workflow Rule 8 ("no code before the work-log"),
 * which previously existed only as prose (docs/verification-contracts-design.md,
 * Increment 1; harvested from ~/git/npvitals/apps/npvitals/scripts/check-worklog.mjs
 * and adapted per docs/work-log/2026-09-07-verification-contracts.md Phase 3).
 *
 * Registered as a PreToolUse hook on Edit|Write (.claude/settings.json). Reads
 * the tool call as JSON on stdin; if `tool_input.file_path` falls under
 * TRIGGER_PREFIXES (src/**, drizzle/**), requires a work-log under
 * docs/work-log/ that either MENTIONS the target path, or was touched TODAY
 * (same calendar date, UTC) — see isSameDayFresh(). A qualifying work-log
 * whose Phase 4/5 section is substantive (not the bare template placeholder)
 * must also carry a "## What was NOT verified" heading in that section.
 *
 * Hook mode ONLY — no `--ci`, no PR-label escape hatch, no session-handoff
 * freshness signal. Phase 2's architectural ruling (see the work-log) excluded
 * porting the harvest's CI layer (would touch .github/workflows/*, outside
 * this feature's declared blast radius) and its GitHub-PR-label Trivial
 * exemption (this repo's CI has no label mechanism). The local replacement is
 * the `.claude/trivial-ok.json` marker, stamped ONLY by the `/trivial` skill
 * (never by an agent mid-task on its own initiative — see that skill's file
 * for the no-self-invocation rule).
 *
 * Fails OPEN on every ambiguous condition, matching pre-push-gate.mjs's house
 * style: unparseable stdin, a missing docs/work-log/ directory (a fork that
 * deleted the pipeline scaffolding — Phase 1 Gap #4 / Phase 2 Notes item 6),
 * and any git-plumbing failure inside isSameDayFresh() all resolve to allow.
 * This is the FIRST hook that can block an in-session Edit/Write call
 * repo-wide — a bug here has a categorically higher blast radius than
 * pre-push-gate.mjs (which only ever blocks `git push`), which is why every
 * failure mode below chooses "let the edit through" over "brick the session."
 *
 * Exported for unit testing (all pure — no I/O except isSameDayFresh, which
 * shells out to git and is exercised only for its fail-open catch path in
 * the test file, mirroring pre-push-gate.test.mjs's "integration territory"
 * treatment of marker/HEAD gating):
 *   isTriggerPath, extractPhaseSection, worklogMentionsPath, isSameDayFresh,
 *   hasNotVerifiedHeading, isPhaseSectionSubstantive, readTrivialMarker,
 *   trivialMarkerMatches, evaluateWorklogGate
 */
import { readFileSync, readdirSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const WORKLOG_DIR = path.join(REPO_ROOT, "docs", "work-log");
const MARKER_PATH = path.join(REPO_ROOT, ".claude", "trivial-ok.json");

// ── Constants ────────────────────────────────────────────────────────────────

// UNCHANGED from the harvest — do not widen. scripts/** and .claude/** are
// never in the trigger set (process tooling, per Phase 2's bootstrap-ordering
// ruling); docs/work-log/** is the evidence itself, never the trigger.
export const TRIGGER_PREFIXES = ["src/", "drizzle/"];

// Literal placeholder markers from docs/work-log/_template.md's unfilled
// Phase 4 / Phase 5 sections, embedded as constants rather than read from the
// template file at runtime — keeps evaluateWorklogGate() a pure function with
// no I/O, mirroring the harvest's own VERDICT_PLACEHOLDER approach. NOTE: this
// specific placeholder-detection mechanism is an addition beyond Phase 3's
// literal spec (which described the "substantive Phase 4/5" test but not how
// to implement it) — see the Phase 4 work-log section, Implementer Notes, for
// the flagged deviation.
const PHASE4_PLACEHOLDER_MARKER = "`path/to/file` — purpose";
const PHASE5_PLACEHOLDER_MARKER =
  "[PASS | FAIL | BLOCKED — name the unmet prerequisite]";

// ── Denial messages ──────────────────────────────────────────────────────────

function rule8Message(targetPath) {
  return `[worklog-gate] BLOCKED (Workflow Rule 8): this edit touches \`${targetPath}\` (trigger: src/** or
drizzle/**), but no work-log in docs/work-log/ mentions that path or was touched today.

Run /new-feature to scaffold one, or add this path to today's work-log's Surface line, then retry
the edit.

If this change is genuinely Trivial per the Classification table, ask the operator to run
\`/trivial <path> "<reason>"\` first — this hook has no self-service bypass an agent can trigger on
its own mid-task.`;
}

function notVerifiedMessage(worklogPath, phase) {
  return `[worklog-gate] BLOCKED (Workflow Rule 8): ${worklogPath}'s Phase ${phase} section is missing the
required "## What was NOT verified" heading.

Add the heading (docs/work-log/_template.md has the current format) before continuing — a Phase
4/5 output without it doesn't satisfy this feature's own verification-contract requirement.`;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * @param {string} relativePath — repo-root-relative path
 * @returns {boolean}
 */
export function isTriggerPath(relativePath) {
  return TRIGGER_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

/**
 * Text between `^# Phase N —` and the next `^# Phase [1-6] —` heading, or EOF.
 * Generalizes the harvest's extractPhase1Section() to any phase 1-6.
 *
 * @param {string} content
 * @param {number} phaseNumber — 1 through 6
 * @returns {string | null} null if no heading for this phase is found
 */
export function extractPhaseSection(content, phaseNumber) {
  const startRe = new RegExp(`^#\\s*Phase\\s*${phaseNumber}\\s*—`, "m");
  const nextRe = /^#\s*Phase\s*[1-6]\s*—/m;

  const startMatch = startRe.exec(content);
  if (!startMatch) return null;

  const rest = content.slice(startMatch.index);
  const afterHeading = rest.slice(startMatch[0].length);
  const nextMatch = nextRe.exec(afterHeading);
  if (!nextMatch) return rest;
  return rest.slice(0, startMatch[0].length + nextMatch.index);
}

/**
 * Literal substring match of the repo-relative targetPath anywhere in
 * content — covers the Surface line, a Files Modified/Files Changed bullet,
 * a Prior-Phase Spot-Check reference, etc.
 *
 * @param {string} content
 * @param {string} targetPath
 * @returns {boolean}
 */
export function worklogMentionsPath(content, targetPath) {
  return content.includes(targetPath);
}

/**
 * Is this Phase 4/5 section substantive (i.e. not just the bare template
 * placeholder)? See the module-level comment on PHASE4_PLACEHOLDER_MARKER /
 * PHASE5_PLACEHOLDER_MARKER for why this is a literal-marker check rather
 * than a template diff.
 *
 * @param {string} sectionText
 * @param {4 | 5} phaseNumber
 * @returns {boolean}
 */
export function isPhaseSectionSubstantive(sectionText, phaseNumber) {
  if (sectionText === null || sectionText === undefined) return false;
  const marker =
    phaseNumber === 4 ? PHASE4_PLACEHOLDER_MARKER : PHASE5_PLACEHOLDER_MARKER;
  return !sectionText.includes(marker);
}

/**
 * @param {string} phaseSectionText
 * @returns {boolean}
 */
export function hasNotVerifiedHeading(phaseSectionText) {
  return /^##\s+What was NOT verified\s*$/im.test(phaseSectionText);
}

/**
 * Calendar-date freshness (Phase 2 Notes item 3 — NOT the harvest's
 * session-handoff-file mechanism, which this repo doesn't have): a work-log
 * is fresh if it has an uncommitted/untracked change, OR its last commit
 * landed on today's UTC calendar date.
 *
 * Fails OPEN on any git-plumbing error (missing `git`, not a repo, detached
 * HEAD weirdness) — returns true rather than throwing, matching
 * pre-push-gate.mjs's house style.
 *
 * @param {string} worklogRelPath — repo-root-relative path, e.g.
 *   "docs/work-log/2026-09-07-foo.md"
 * @param {string} repoRoot
 * @returns {boolean}
 */
export function isSameDayFresh(worklogRelPath, repoRoot) {
  try {
    const statusOut = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=normal", "--", worklogRelPath],
      { cwd: repoRoot, encoding: "utf8" },
    );
    if (statusOut.trim() !== "") return true;

    const iso = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", worklogRelPath],
      { cwd: repoRoot, encoding: "utf8" },
    ).trim();
    if (iso === "") return false; // never committed, and status is clean — no signal
    const commitDate = new Date(iso).toISOString().slice(0, 10);
    const todayUtc = new Date().toISOString().slice(0, 10);
    return commitDate === todayUtc;
  } catch {
    return true; // fail open — a git-plumbing failure must never brick every edit
  }
}

/**
 * @param {string} markerPath
 * @returns {{ path: string, reason: string, stampedAt: string, expiresAt: string } | null}
 */
export function readTrivialMarker(markerPath) {
  try {
    return JSON.parse(readFileSync(markerPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * @param {ReturnType<typeof readTrivialMarker>} marker
 * @param {string} targetRelativePath
 * @param {string} nowISO
 * @returns {boolean}
 */
export function trivialMarkerMatches(marker, targetRelativePath, nowISO) {
  return (
    !!marker &&
    marker.path === targetRelativePath &&
    Number.isFinite(Date.parse(marker.expiresAt)) &&
    Date.parse(nowISO) < Date.parse(marker.expiresAt)
  );
}

// ── Core pure decision function ─────────────────────────────────────────────

/**
 * @param {{
 *   targetPath: string,
 *   worklogDocsExists: boolean,
 *   worklogs: Array<{ path: string, content: string }>,
 *   isFresh: (worklogPath: string) => boolean,
 *   trivialExempt: boolean,
 * }} input
 * @returns {{ decision: "allow" | "block", reason: string }}
 */
export function evaluateWorklogGate({
  targetPath,
  worklogDocsExists,
  worklogs,
  isFresh,
  trivialExempt,
}) {
  // Step 1 — trigger check (fast exit, no fs/git work at all).
  if (!isTriggerPath(targetPath)) {
    return { decision: "allow", reason: `${targetPath} is not under TRIGGER_PREFIXES` };
  }

  // Step 2 — missing docs/work-log/ directory (Phase 1 Gap #4 / Phase 2 Notes
  // item 6): a fork that deleted the pipeline scaffolding must not be
  // permanently blocked with no recovery path.
  if (!worklogDocsExists) {
    return {
      decision: "allow",
      reason: "docs/work-log/ does not exist in this checkout",
    };
  }

  // Step 3 — trivial escape hatch (single-use marker, stamped only by the
  // /trivial skill — never self-issued mid-task by an agent).
  if (trivialExempt) {
    return { decision: "allow", reason: `trivial marker matched ${targetPath}` };
  }

  // Step 4 — work-log qualification: mentions the target path, OR is
  // same-day-fresh. `||` short-circuits, so isFresh() is only invoked when
  // the (cheap, I/O-free) mention check misses.
  const qualifying = worklogs.filter(
    (w) => worklogMentionsPath(w.content, targetPath) || isFresh(w.path),
  );
  if (qualifying.length === 0) {
    return { decision: "block", reason: rule8Message(targetPath) };
  }

  // Step 5 — "What was NOT verified" heading requirement on any qualifying
  // work-log's substantive Phase 4/5 section. Any one fully-qualifying
  // work-log (qualifies AND, where substantive, carries the heading) is
  // sufficient — a branch may carry an unrelated/incomplete work-log.
  const failing = [];
  for (const w of qualifying) {
    const phase4 = extractPhaseSection(w.content, 4);
    const phase5 = extractPhaseSection(w.content, 5);
    const substantive4 = isPhaseSectionSubstantive(phase4, 4);
    const substantive5 = isPhaseSectionSubstantive(phase5, 5);

    if (substantive4 && !hasNotVerifiedHeading(phase4)) {
      failing.push({ path: w.path, phase: 4 });
      continue;
    }
    if (substantive5 && !hasNotVerifiedHeading(phase5)) {
      failing.push({ path: w.path, phase: 5 });
      continue;
    }

    return {
      decision: "allow",
      reason: `work-log ${w.path} qualifies (mentions ${targetPath} or is same-day-fresh) with no unheaded substantive Phase 4/5 section`,
    };
  }

  const first = failing[0];
  return { decision: "block", reason: notVerifiedMessage(first.path, first.phase) };
}

// ── CLI wrapper (hook mode only) ─────────────────────────────────────────────

function collectWorklogs() {
  if (!existsSync(WORKLOG_DIR)) return [];
  return readdirSync(WORKLOG_DIR)
    .filter((f) => f.endsWith(".md") && f !== "_template.md")
    .map((f) => {
      const relPath = `docs/work-log/${f}`;
      let content = "";
      try {
        content = readFileSync(path.join(WORKLOG_DIR, f), "utf8");
      } catch {
        content = "";
      }
      return { path: relPath, content };
    });
}

function runHook() {
  let stdinRaw = "";
  try {
    stdinRaw = readFileSync(0, "utf8");
  } catch {
    process.exit(0); // no stdin — nothing to evaluate, fail open
  }

  let filePath;
  try {
    const payload = JSON.parse(stdinRaw);
    filePath = payload?.tool_input?.file_path;
  } catch (err) {
    console.error(`[worklog-gate] warning: could not parse stdin JSON (${err.message}); allowing`);
    process.exit(0);
  }

  if (typeof filePath !== "string" || filePath === "") {
    process.exit(0); // nothing to check
  }

  const targetPath = path.isAbsolute(filePath)
    ? path.relative(REPO_ROOT, filePath)
    : filePath;

  // Fast exit — skip all fs/git work for anything outside the trigger set.
  if (!isTriggerPath(targetPath)) {
    process.exit(0);
  }

  const worklogDocsExists = existsSync(WORKLOG_DIR);
  const worklogs = collectWorklogs();
  const marker = readTrivialMarker(MARKER_PATH);
  const trivialExempt = trivialMarkerMatches(marker, targetPath, new Date().toISOString());

  const result = evaluateWorklogGate({
    targetPath,
    worklogDocsExists,
    worklogs,
    isFresh: (worklogPath) => isSameDayFresh(worklogPath, REPO_ROOT),
    trivialExempt,
  });

  // Single-use: a stamped exemption never silently covers a second, unrelated
  // edit. Delete on the matching call that consumed it, regardless of the
  // (necessarily "allow") outcome.
  if (trivialExempt) {
    try {
      unlinkSync(MARKER_PATH);
    } catch {
      // Already gone / unreadable — nothing to clean up.
    }
  }

  if (result.decision === "block") {
    console.error(result.reason);
    process.exit(2); // exit 2 = block; PreToolUse reads stderr as the denial reason
  }
  process.exit(0);
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("worklog-gate.mjs");

if (isMain) runHook();
