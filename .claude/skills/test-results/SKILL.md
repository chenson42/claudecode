---
name: test-results
description: Process a completed pre-merge test file — auto-fill sign-off, fold results into release notes and run-history log, archive the full file, then delete the working copy
---

# Capture Test Results

When the user invokes `/test-results`, process the completed pre-merge test file, record the results in the appropriate places, archive the full file to `docs/test-results/`, and delete the working copy.

**Finding the test file:** Look for `docs/pre-merge-tests-v*.md`. If no such file exists, stop immediately and tell the user there is no open test file. Suggest running `/test` to generate one.

The file stays in its original location (`docs/pre-merge-tests-v*.md`) throughout all processing steps. It is only archived to `docs/test-results/` in Step 8, after all edits are complete.

---

## Step 1: Read the Test File

Read the pre-merge test file in full. Extract:

- **Version** — from the `**Version:**` line (e.g., `0.4.1`)
- **Test Suites** — from the `**Test Suites:**` line (comma-separated paths, or "none")
- **Opened** — from the `**Opened:**` line
- **Regression suite sections** — each `###` section under `## Regression Suites`
- **Release-specific checks** — all checkbox lines under `## Release-Specific Checks` (if section exists)
- **Notes** — content under `## Notes` (if any non-placeholder text)
- **Tested by** — from `**Tested by:**` in Sign-Off
- **Date** — from `**Date:**` in Sign-Off
- **Result** — from `**Result:**` in Sign-Off

Determine the release-notes file from the version: strip the patch segment and prepend `docs/release-notes/v`. Example: version `0.4.1` → `docs/release-notes/v0.4.md`.

---

## Step 2: Auto-Complete the Sign-Off

Before validating, scan the full file and auto-fill the Sign-Off section so the tester only needs to supply their name.

1. **Scan all checkbox lines** — collect every line matching `- [x]`, `- [!]`, or `- [ ]`. For each `[!]` line, record the item description text and the nearest parent `###` section heading above it.

2. **Auto-fill Date** — if `**Date:**` is blank or still shows a placeholder, set it to today's date (YYYY-MM-DD).

3. **Compute Result:**
   - No `[!]` items anywhere in the file → `All pass`
   - One or more `[!]` items → `Issues found — [N] item(s)`
   Write the computed value to `**Result:**`, replacing whatever placeholder text is there.

4. **Build Issues found list** — for each `[!]` item, write one bullet in the format:
   ```
   - [Section heading] Item description text
   ```
   Group by section if items span multiple sections. If no `[!]` items, write `- None`.
   Replace the existing placeholder content under `**Issues found:**`.

5. **Write the updated file** with the filled-in Sign-Off section.

6. **If `**Tested by:**` is blank**, pause. Show the user what was auto-filled and ask for their name. Write it to the file, then proceed to Step 3.

---

## Step 3: Validate Completeness

Check every line matching `- [ ]` in the file. If any unchecked boxes remain:

**STOP.** Do not proceed. Report:

- How many unchecked items remain
- Which sections they're in
- Tell the user to complete testing before running `/test-results`

---

## Step 4: Resolve Issues Found During Testing

### Part A — `[!]` checkbox items

Collect every line marked `- [!]` anywhere in the file. If none exist, skip to Part B.

If any `[!]` items exist, **STOP** and present them to the user as a numbered list with their section context and notes. Do not proceed until every issue is assigned a disposition:

- **Fix now** — a bug introduced in this release; help implement the fix, then add a `#### Defect Fix` entry to the release notes for this version. After the fix is implemented, list the specific test steps that must be re-run and wait for the user to confirm they pass before proceeding.
- **Known issue** — a pre-existing or out-of-scope bug; add an entry to `docs/KNOWN-ISSUES.md` (create the file if it doesn't exist, using a simple numbered format: `## KI-001: [Title]` with Description, Workaround, and Version Introduced).
- **Task** — a UX improvement or deferred work; add a line to `docs/TODO.md` under the appropriate section.
- **Test gap** — the case couldn't be run (no test data, environment limit, unclear steps); update the test case in the relevant `docs/test-cases/` doc to add setup instructions or mark it as requiring a specific environment. Do not leave a `[!]` item undispositioned.
- **Stale case** — the case no longer applies (feature removed, behavior changed); remove or update the case in the test bank doc.

After each `[!]` item is assigned a disposition, add a `> **Disposition:** ...` line directly below that item's existing notes in the pre-merge test file. Format:

```
> **Disposition:** [Disposition type] — [one-sentence explanation]
```

Walk through each issue with the user. Once all issues have a disposition, fixes are validated, any docs are written, and dispositions are recorded in the file, proceed to Part B.

### Part B — Notes section

Read the `## Notes` section of the test file. If it contains only the placeholder text, skip to Step 5.

If there is any non-placeholder content, extract every distinct observation or request and present them to the user as a numbered list. Do not proceed until each note is assigned a disposition:

- **Task** — a new feature idea, UX improvement, or deferred work; add a line to `docs/TODO.md` under the appropriate section. Include a source reference on the same line or as a follow-up line:
  ```
  <!-- Context: test-results/pre-merge-tests-v[VERSION]-[DATE].md § Notes -->
  ```
- **Known issue** — a confirmed bug that won't be fixed now; add an entry to `docs/KNOWN-ISSUES.md`.
- **Already handled** — the note was addressed during testing (e.g., a fix was applied and retested); no further action needed.

Once all notes have a disposition and any `docs/TODO.md` / `docs/KNOWN-ISSUES.md` entries are written, proceed to Step 5.

---

## Step 5: Update Release Notes

Read the release-notes file determined in Step 1 (e.g., `docs/release-notes/v0.4.md`). This file follows the structure maintained by the `/release-notes` skill — a Table of Contents at the top, entries newest-first, each entry anchored with `<a name="X.Y.Z"></a>`.

Find the entry for this version. Add a `#### Testing` section at the **end** of that entry, before the next `---` separator.

**Format when there were release-specific checks and regression suites:**

```markdown
#### Testing

**Release-specific:**
- [x] [each release-specific check, copied verbatim from the file]

**Regression suites:**
> [Auth](../test-cases/auth.md) — all cases pass, tested by [Name] [Date]
> [Account](../test-cases/account.md) — all cases pass, tested by [Name] [Date]
```

**Format when there were only regression suites (no release-specific checks):**

```markdown
#### Testing

> [Auth](../test-cases/auth.md) — all cases pass, tested by [Name] [Date]
```

**Format when there were only release-specific checks (no suites):**

```markdown
#### Testing

- [x] [each release-specific check]

> All release-specific checks passed — tested by [Name] [Date]
```

If the Notes section had non-placeholder content, add a `**Notes:**` summary line before the archive link. Notes that resulted in defects should already have been fixed and added as separate release notes entries — record them here only as a brief summary.

Always end the Testing section with a link to the archived test results file (the archive path is known at this point: `docs/test-results/pre-merge-tests-v[VERSION]-[DATE].md`):

```markdown
> Full test results: [pre-merge-tests-v[VERSION]-[DATE].md](../test-results/pre-merge-tests-v[VERSION]-[DATE].md)
```

---

## Step 6: Update Test Run History

For each test suite path listed in `**Test Suites:**` (skip if "none"):

1. Read the test cases doc.
2. Find the `## Test Run History` table. If it doesn't exist, add it at the bottom of the file:
   ```markdown
   ## Test Run History

   | Date | Version | Tested By | Result | Notes |
   |------|---------|-----------|--------|-------|
   ```
3. Add a new row at the top of the table (most recent first):
   ```markdown
   | [Date] | [Version] | [Tested By] | Pass | [Notes — or blank if clean] |
   ```
4. Write the updated file.

---

## Step 7: Reset the Regression Suite Checkboxes

For each test suite doc updated in Step 6:

Reset all `- [x]` checkboxes back to `- [ ]` so the doc is ready for the next test cycle. Do not change any other content.

---

## Step 8: Archive, Delete, and Commit

The pre-merge test file has been edited throughout Steps 2–7. Now that all edits are final, archive it:

1. **Create the archive directory** if it doesn't exist: `docs/test-results/`.

2. **Copy** the test file to `docs/test-results/pre-merge-tests-v[VERSION]-[DATE].md` (e.g., `docs/test-results/pre-merge-tests-v0.4.1-2026-07-01.md`), where VERSION is the full patch version from the Sign-Off and DATE is the test date from the Sign-Off.

3. **Strip placeholder notes from the archive.** Any `> Notes: _______________` line where the notes field was never filled in adds noise. Remove every line that matches the placeholder pattern (the underscores) — keep only lines where actual notes were written.

4. **Delete** the original `docs/pre-merge-tests-v*.md` file.

5. **Stage all changed files:**
   - `docs/pre-merge-tests-v*.md` (deleted)
   - `docs/test-results/pre-merge-tests-v[VERSION]-[DATE].md` (new archive)
   - `docs/release-notes/v[X.Y].md` (updated)
   - Each test cases doc that was updated (run-history + checkbox reset)
   - `docs/KNOWN-ISSUES.md` if created or updated
   - `docs/TODO.md` if updated

6. **Commit:**
   ```bash
   git add -A
   git commit -m "test: record v[VERSION] test results and close test file"
   ```

---

## Step 9: Report to User

Tell the user:

- Test results recorded in release notes (link the entry in `docs/release-notes/v[X.Y].md`)
- Test run history updated in each suite doc (list which ones)
- Suite checkboxes reset for next cycle
- Full test file archived to `docs/test-results/pre-merge-tests-v[VERSION]-[DATE].md`
- Original pre-merge test file deleted
- Ready to run `/pre-push`
