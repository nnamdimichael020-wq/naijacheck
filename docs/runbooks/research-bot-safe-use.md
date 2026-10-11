# Research Bot Safe-Use Runbook (Bot Type 1)

## 1. Purpose and Hard Boundaries

NaijaCheck uses a **human-first editorial pipeline**. "Bot Type 1" (Topic / Gap Research) is strictly a discovery aid that helps identify high-value questions Nigerians are asking where existing forum threads are outdated, noisy, or unsafe.

### Non-Negotiable Rules

1. **Manual or local-only execution**:
   - Topic and gap research is performed **manually** by an editor or via **local-only** scripts on a developer machine.
   - **No CI spider against third-party forums by default**: GitHub Actions (`.github/workflows/*`) must never run Scrapy or automated spiders against Nairaland or other community forums.
2. **Output ONLY gap-queue rows**:
   - The sole permitted artifact of gap research is candidate Markdown table rows for [`docs/content-gap-queue.md`](../content-gap-queue.md) (`Topic | User Intent | Why Forums Are Weak | Sources to Verify | Priority | Status`).
   - Every new candidate row starts with status `queued`.
3. **NEVER commit scraped Nairaland HTML or forum text**:
   - Never commit `.html`, `.json`, `.csv`, or `.txt` dumps of scraped forum threads, user comments, or third-party articles into Git.
   - Never quote, paraphrase, or republish unverified forum claims as factual NaijaCheck content.
4. **NEVER auto-publish pages**:
   - No research script or bot may write to `data/*.json`, `content/generated/articles.json`, `scripts/generate-content.ts`, or `app/**`.
   - Humans verify facts against official primary portals (`.gov.ng`, `.edu.ng`, NBS, CBN) and publish articles following [`docs/article-writing-guide.md`](../article-writing-guide.md).

---

## 2. Allowed Signals vs Forbidden Actions

| Signal / Action | Permitted? | Policy |
|---|---|---|
| Reading public Google News RSS & Wikimedia Pageviews (`scripts/monitor/run.ts`) | **Yes** | Already implemented for monitored headlines and public attention signals; attributed with source timestamps. |
| Fingerprinting official agency public pages (`JAMB`, `NIMC`, `NIS`, `CBN`) | **Yes** | Flags wording changes in `data/live/watch.json` (`reviewRequired: true`). Never auto-edits fees. |
| Manual or local review of recurring public questions to draft `docs/content-gap-queue.md` rows | **Yes** | Output must be a structured gap-queue row with official sources to verify. |
| Committing raw HTML/text scraped from Nairaland or other forums | **NO — Forbidden** | Copyright, privacy, and unverified-rumour risk. Keep all scratch notes outside the repo. |
| Running a scheduled GitHub Actions crawler against third-party forums | **NO — Forbidden** | Violates acceptable-use norms and is blocked by repository policy. |
| Auto-generating or auto-publishing articles from scraped questions or LLMs | **NO — Forbidden** | Scaled content abuse risk; violates Google Search spam policies and NaijaCheck's trust model. |

---

## 3. Safe Local Research Procedure

When researching new utility gaps locally:

1. **Identify the recurring user question**:
   - Focus on concrete Nigerian daily utilities: statutory government fees (NIS, NIMC, FRSC, CAC), exam cut-offs (JAMB/institutional portals), tariff bands (NERC/DisCos), or staple market planning questions.
2. **Record why forum threads fail**:
   - Note the specific failure mode (e.g., outdated 2021 fees, middlemen/tout phone numbers, missing state/market units, or conflicting answers across dozens of pages).
3. **Locate the authoritative primary source**:
   - Every row must name the official agency URL or primary dataset (`https://immigration.gov.ng/passports/`, `https://nimc.gov.ng/`, `https://www.cac.gov.ng/`, `https://www.jamb.gov.ng/`, `https://microdata.nigerianstat.gov.ng/`).
   - If no authoritative source exists to verify the answer, do not queue the topic as a factual fee/rule guide.
4. **Append ONLY the structured row to `docs/content-gap-queue.md`**:
   - Set `Status` to `queued`.
   - Verify `git status` and `git diff` to confirm zero scratch files or raw HTML exist in the working tree before committing.

---

## 4. Future Phase D Note: Telegram Bot (Out of Scope for Live Wiring in Phase A)

When Phase D (Telegram integration) is scheduled in a later PR:

- **Read-only utility / owner alert scope**: A future Telegram channel or bot may broadcast verified monitor changes (mirroring the strict Web Push gates: healthy `aboki` parallel USD move ≥ ₦5 or healthy `awajis` depot petrol median change, with source and WAT timestamp) or notify the owner when `data/live/watch.json` / `scripts/audit-content.mjs` flags a page for human review.
- **Zero cost (₦0/$0)**: Uses the free Telegram Bot API via standard HTTPS `fetch` with encrypted secrets (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) stored only in Cloudflare Worker / GitHub Actions secrets — never in Git.
- **No auto-publishing**: Telegram messages or commands must never auto-publish unreviewed text or bypass the human PR review gate.
