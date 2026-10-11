# NaijaCheck Article Writing Guide

Every article on NaijaCheck exists to save a Nigerian reader time, money, or mistakes. We write structured, verifiable reference guides — **never** forum gossip, clickbait blog posts, or mass AI-generated filler.

---

## 1. Answer-First Structure

A reader on a 3G mobile connection should get the exact answer within the first screenful — before scrolling past background history.

1. **Opening paragraph (`intro[0]`)**:
   - State the direct answer, statutory fee, or planning range in the very first sentence.
   - Immediately name the **source** (e.g. Nigeria Immigration Service, CBN NFEM, Awajis depot table, JAMB Policy Meeting, or dated editorial estimate) and the **last-verified date** (e.g. `9 October 2026`).
   - State the verification status honestly (`live`, `recent`, `stale`, `seeded`, `manual`, or `unavailable`).
2. **Quick Take card (`takeaways`)**:
   - Provide 3–4 scannable bullet points with the exact numbers, required documents, official portal URL, and the single biggest mistake to avoid (such as paying cash to an unaccredited agent).
3. **Step-by-Step & Sections (`steps`, `sections`)**:
   - Order sections by what the reader must do first: eligibility/requirements → official portal steps → breakdown of costs → common delays and how to resolve them.
4. **FAQs (`faqs`)**:
   - Answer concrete edge cases Nigerians ask ("Can I renew my passport 6 months before expiry?", "Does a Business Name require annual returns?", "Why is depot petrol cheaper than my local filling station?").

---

## 2. Human Nigerian English (Clear, Respectful, Grounded)

Write like a knowledgeable, trustworthy Nigerian colleague explaining a process clearly:

- **Use natural Nigerian everyday terms accurately**:
  - Use terms Nigerians actually use: *filling station*, *pump price*, *black market / parallel market*, *depot gantry*, *50kg bag*, *derica*, *mudu*, *paint bucket*, *CBT centre*, *local government secretariat*, *POS operator*, *keke*, *danfo*, *prepaid meter token*.
  - When a local unit is mentioned (e.g. *paint rubber* or *mudu*), state its approximate weight in kilograms so readers in other states can compare fairly.
- **Keep slang in its proper lane**:
  - Slang and relationship-term explainers (`/trends/*`) should explain the term warmly with real conversational examples.
  - Serious utility guides (`/howto/*`, `/exam/*`, `/prices/*`, `/telecom/*`, `/hustle/*`) must stay crisp and plain — never obscure a fee, legal requirement, or safety warning behind heavy slang.
- **Ban AI filler clichés**:
  - Never write phrases like *"In today's fast-paced Nigerian economy"*, *"Let's delve into"*, *"Navigating the complexities of"*, *"Unlock your financial potential"*, or *"Whether you're a seasoned entrepreneur or a beginner"*.

---

## 3. Sources & Last-Verified Discipline

Every number on NaijaCheck must answer three questions: **Who said so? When was it checked? What is its verification state?**

| Data Category | Required Label / State | Source & Timestamp Rule |
|---|---|---|
| Monitored FX & wholesale depot fuel (`cbn-usd`, `parallel-fx`, `fuel-depot`) | `live` \| `recent` \| `stale` \| `unavailable` (from `DATASET_REGISTRY`) | Show exact source name (`CBN`, `Aboki Forex`, `Awajis / petroleumprice.ng`) and source timestamp in `WAT`. Never upgrade a failed/stale source to `live`. |
| NBS monthly state surveys (`scripts/nbs/import.ts`) | Official monthly survey reference (`manual` / dated survey) | State the exact NBS survey month, publication date, state-level geography, and catalogue URL. Never present state-level monthly averages as live city market prices. |
| Dated staple food & market estimates (`data/prices.json`) | `seeded` / `manual` dated planning estimate | State the explicit check date (`DATA_DATE`). Only publish cities with explicit observations (`Lagos`, `Onitsha`, `Kano`, `Aba`). Never interpolate missing cities via a cost index. |
| Government fees, NIN/passport steps, JAMB cut-offs, telecom plans | `manual` / `seeded` (human-verified against official portal) | Link directly to the official `.gov.ng`, `.edu.ng`, or carrier portal and record the last-verified date. Flag official-page fingerprint changes (`data/live/watch.json`) for human review before changing any figure. |

**Hard rule:** **NEVER label seeded, stale, manual, or survey data as `live`.**

---

## 4. Internal Links to Live Tools & Hubs

Every article must connect readers to the interactive tools and status pages that help them act on the information:

- **Cost & price articles (`/prices/*`)** → link to:
  - [`/status`](/status) (Data status & source health)
  - [`/prices/cost-of-living`](/prices/cost-of-living) (Monthly city budget calculator)
  - [`/tools/cookbook`](/tools/cookbook) (Family meal & pot-of-soup cost calculator)
- **Fuel, diesel & power articles (`/prices/fuel`, `/prices/generator-diesel`, `/learn/*`)** → link to:
  - [`/tools/generator`](/tools/generator) (Generator daily/monthly fuel spend calculator)
  - [`/tools/solar`](/tools/solar) (Solar & inverter payback calculator)
  - [`/status`](/status) (Wholesale depot median vs retail pump distinction)
- **Hustle & registration guides (`/hustle/*`, `/howto/cac-*`)** → link to:
  - [`/hustle#matcher`](/hustle#matcher) (Capital-based hustle matcher)
  - [`/howto`](/howto) (GovHowTo registration & identity guides)
  - [`/prices/cost-of-living`](/prices/cost-of-living) (Operating cost context)
- **Exam, Telecom & Trend guides (`/exam/*`, `/telecom/*`, `/trends/*`)** → link back to their section hub (`/exam`, `/telecom`, `/trends`) and to `/status`.

All internal links must resolve to real generated routes verified by `npm run audit:static` (zero broken internal links).

---

## 5. Strict Prohibitions: No Hype, No Fake Live Prices, No Scam Tone

1. **No fake "live" prices**:
   - Do not put "LIVE TODAY" or "Updated 5 minutes ago" in static article headings or prose for manual datasets.
   - Always separate wholesale depot fuel medians from retail filling-station pump prices.
2. **No hustle hype or income promises**:
   - Present startup capital as a realistic range (`capitalMin` to `capitalMax`) and list real failure modes (power costs, spoilage, rent advances, council levies, bad credit).
   - Never promise guaranteed daily/monthly profits (*"Make ₦300k weekly from home with zero risk"* is strictly forbidden).
3. **No scam tone or tout endorsements**:
   - Never include personal WhatsApp numbers, unofficial "fast-track" agents, or third-party payment links for passports, NIN, driver's licences, JAMB admissions, or CAC filings.
   - Explicitly warn readers to pay only through the official government portal or Remita RRR generated inside that portal.
4. **No scraped forum text or mass AI pages**:
   - Never copy or paraphrase unverified Nairaland posts into articles.
   - Never bulk-generate hundreds of thin city/keyword permutations without real underlying observations.

---

## 6. Pre-Publish Verification Checklist

Before opening a PR that adds or edits article content:

1. Confirm the topic is tracked in [`docs/content-gap-queue.md`](./content-gap-queue.md) with verified official sources.
2. Run content generation and static checks:
   ```bash
   npm run generate
   npm run typecheck
   npm run lint
   npm run build
   npm run audit:static
   npm run audit:content
   ```
3. Confirm `npm run audit:static` reports `0` broken internal links, `0` missing titles/descriptions/canonicals/H1s, and `0` invalid JSON-LD blocks.
4. Review any advisory flags from `npm run audit:content` to ensure no outdated years or unguarded "live" claims were introduced.
