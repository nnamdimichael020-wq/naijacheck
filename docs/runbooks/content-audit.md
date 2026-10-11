# Content Audit Bot Runbook (Bot Type 4 Foundation)

## 1. Purpose and Safety Guarantees

The Content Audit Bot (`scripts/audit-content.mjs` + `.github/workflows/content-audit.yml`) is NaijaCheck's read-only editorial quality scanner. It inspects generated articles (`content/generated/articles.json`), built static HTML (`out/`), and official-page watch flags (`data/live/watch.json`) to surface items that need human verification.

### Non-Negotiable Safety Rules

1. **NEVER auto-edits article bodies or data files**:
   - `scripts/audit-content.mjs` opens `content/`, `data/`, and `out/` in read-only mode.
   - `.github/workflows/content-audit.yml` runs with `permissions: contents: read`. It cannot commit or push changes to the repository.
2. **NEVER fails the production site or build**:
   - `npm run audit:content` is intentionally decoupled from `prebuild` and `build`.
   - `scripts/audit-content.mjs` always exits with status `0` by default, and the GitHub Actions job sets `continue-on-error: true`. Even if an article becomes stale or an official agency changes its page wording, the production site continues serving normally until a human editor reviews and merges a fix.
3. **Zero cost (₦0 / $0)**:
   - Uses standard Node 20 built-ins (`node:fs`, `node:path`) and GitHub's built-in `GITHUB_TOKEN` + `gh` CLI on standard `ubuntu-latest` runners. No paid third-party APIs or external SaaS scanners are used.

---

## 2. What the Scanner Checks

`scripts/audit-content.mjs` exports two pure functions (`scanArticleRecord` and `scanOfficialWatchState`) plus `runRepositoryContentAudit`:

| Check Category | What It Detects | Recommended Human Action |
|---|---|---|
| `outdated-year-headline` | Titles or `<h1>` headings containing past years (`2020`–`2025` when current reference year is `2026`). | Check the official portal (JAMB, NIS, NIMC, CAC, NERC) for current-year policy/fees before updating the heading. |
| `outdated-year-body` | Body claims tying a `fee`, `cut-off`, `registration`, `portal`, `tariff`, or `schedule` to an older year (`2020`–`2025`). | Verify whether the statutory fee or rule changed for `2026` and update via PR with the new verification date. |
| `stale-verification-date` | Manual/editorial `updatedAt` timestamps older than `45` days. | Re-verify the guide's numbers against its named sources and refresh `updatedAt`. |
| `live-label-risk` | Any sentence in a manual/seeded section (`prices*`, `howto`, `exam`, `telecom`, `cookbook`, `hustle*`) that mentions `"live price"`, `"live rate"`, or `"live fee"` without an explicit negation/distinction (`"not a live"`, `"never"`, `"separate from"`, `"unlike"`). | Replace misleading wording immediately so seeded/manual/survey figures are never described as `live`. |
| `official-watch-changed` | Entries in `data/live/watch.json` where `changedSincePrevious === true` or `reviewRequired === true` (`JAMB`, `NIMC`, `NIS`, `CBN`). | Open the official agency URL, inspect what changed on the public page, and update any affected guide in a human-reviewed PR. |

---

## 3. Running Locally

Run the scanner at any time after `npm run generate` (or after `npm run build` to also scan static HTML routes in `out/`):

```bash
npm run audit:content
```

To write both the full JSON payload and a Markdown table report locally:

```bash
npm run audit:content -- --output .content-audit-report.json --markdown .content-audit-report.md
```

Note: `.content-audit-report.json` and `.content-audit-report.md` are temporary local/CI artifacts and should not be committed to Git.

---

## 4. Exact Free GitHub Actions Approach

`.github/workflows/content-audit.yml` implements the zero-cost Actions workflow:

1. **Triggers**:
   - Weekly schedule (`23 6 * * 1`, Mondays at 07:23 WAT) on the default branch.
   - Manual `workflow_dispatch` with an optional boolean input `open_issue` (default `false`).
2. **Permissions**:
   ```yaml
   permissions:
     contents: read
     issues: write
   ```
   Using `contents: read` guarantees the workflow can never alter repository code or content.
3. **Step Summary**:
   - Every run appends the Markdown report to `$GITHUB_STEP_SUMMARY` so the owner can read findings directly in the Actions UI without noise.
4. **Deduplicated GitHub Issue Creation**:
   - When `open_issue` is set to `true` (and in Phase E when scheduled issue opening is enabled), the workflow checks `gh issue list --state open --search "[content-audit] in:title"` using the built-in `secrets.GITHUB_TOKEN`.
   - If an open `[content-audit]` issue already exists, it appends a comment with the latest report instead of opening duplicate issues.
   - If zero findings exist (`findingsCount === 0`), no issue or comment is created.

---

## 5. Phase E Expansion Path

In Phase E (Full Audit Bot), this scaffold can be extended safely by:

- Adding per-dataset fee-table cross-checks (comparing numbers cited in `data/govhowto.json` / `data/exam.json` / `data/telecom.json` against structured verification metadata).
- Enabling automatic deduplicated issue opening on the Monday scheduled run once the owner is happy with the signal-to-noise ratio.
- Optionally sending a read-only notification to the owner's Telegram channel (Phase D) when a new `[content-audit]` issue is opened.
