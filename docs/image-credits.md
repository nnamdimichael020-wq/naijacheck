# NaijaCheck Image Credits, Licensing & Source Policy

Every image rendered on NaijaCheck.ng must serve reader comprehension on a 3G Nigerian connection, reserve its exact layout box (`width` + `height` + fixed aspect ratio) to prevent Cumulative Layout Shift (CLS = 0), and carry a verifiable credit, license, and accessible `alt` text.

---

## 1. Source Priority (Enforced in `lib/article-images.ts` & `scripts/generate-content.ts`)

When an eligible long-form guide (`howto`, `learn`, `exam`, `hustle-blueprint`, `trends`, `prices-market`, `telecom`) resolves a hero image via `resolveArticleHeroImage`, code enforces the following strict priority order:

1. **Tier 1 — Existing committed `public/images` with credits (`existing-photo`)**
   - Pre-committed licensed photographs in `public/images/photos/` with documented attribution and dimensions.
2. **Tier 2 — Owner-added licensed photos (`licensed-photo`)**
   - Photographs captured by the site owner or licensed from Pexels/Unsplash, committed under `public/images/` and recorded in this file (`docs/image-credits.md`).
3. **Tier 3 — Generated branded cover (`branded-cover`)**
   - Deterministic, zero-cost static SVG cover (`960×540`, 16:9, ~2.5 KB) generated at build time in `public/images/covers/<slug>.svg` using NaijaCheck's primary green (`#008751`), the official NaijaCheck logo mark, the section kicker, and the article's short title. Used whenever no suitable photo exists or when an AI candidate is rejected by the quality gate.
4. **Tier 4 — Optional AI-generated hero (`ai-fallback`) ONLY when no suitable photo exists**
   - Evaluated through `evaluateAiQualityGate` in `lib/article-images.ts` before commit. If any quality gate check fails, the image is rejected (not committed) and the route automatically falls back to **Tier 3 (`branded-cover`)**.

---

## 2. Placement & Motion Rules

- **Hero placement:** At most **1 hero image** directly under the `<header>` title block on eligible long-form article templates (`components/article-view.tsx`). Not every article is required to display a hero; guides without a configured hero render cleanly without one.
- **In-body placement:** Optional at most **1 in-body image** per article (`bodyImage`), used **only** when a diagram or visual genuinely adds understanding (such as unit conversion arithmetic or NERC band/receipt verification).
- **Pure data, calculator, and status pages skipped:** Hero and in-body article images are strictly skipped (`isArticleImageEligible() === false`) on `/status`, `/prices`, `/prices/[city]`, `/prices/[city]/[item]`, `/prices/fuel`, `/prices/generator-diesel`, `/prices/cost-of-living`, `/tools`, `/tools/generator`, `/tools/solar`, `/tools/cookbook`, and hub/combo pages.
- **Zero CLS & 3G optimization:** Every `<img>` reserves integer `width` and `height` inside a fixed `aspect-[16/9]` container with `loading="lazy"` and `decoding="async"`. Raster assets are compressed to WebP (`960×540`, 55–66 KB) or compact JPEG (`40–83 KB`).
- **Motion:** Static by default (`motion: "static"`) — every hero stays still except the exact flagship paths in `HERO_MOTION_ALLOWLIST` (`config/site.ts`), which may carry the subtle CSS Ken Burns drift (`.article-hero-motion`) on the **hero image only** under `@media (prefers-reduced-motion: no-preference)`. The drift is disabled (`animation: none !important; transform: none !important`) when `prefers-reduced-motion: reduce` is active. Motion is pure CSS (no JS animation libraries), never applies to `/status`, `/tools/*`, pure price tables, hustle-combo pages, or guides without a hero, and never sits under the whole page body. No autoplay MP4/WebM loops and no sound.

---

## 3. Strictly Forbidden Practices

- **No scraping:** Never scrape or hotlink images from `naijasabi`, `nairaland`, news websites, social media platforms, or government PDFs.
- **No watermark workarounds:** Never apply a logo or watermark to third-party images to disguise or "fix" copyright.
- **No fake official documents or seals:** Never generate or publish AI images depicting Nigerian passports, NIN slips, driver's licences, coats of arms, official seals, or readable ID numbers.
- **No failed AI images:** Any AI image with melted hands/faces, garbled text, generic non-Nigerian stock look, or heavy synthetic sheen must be rejected before commit.
- **No autoplay video backgrounds or audio:** Never embed `<video>` backgrounds or sound on articles.

---

## 4. Committed Image Inventory & Credits

### 4.1 Tier 1 — Existing Committed Licensed Photos (`public/images/photos/`)

| File Path | Used On Route(s) | Source Tier | Dimensions & Size | Credit & License | Alt Text |
|---|---|---|---|---|---|
| `/images/photos/lagos-tomato-seller.jpg` | `/`, `/howto/nbs-food-price-watch`, `/learn/budget-80k` | `existing-photo` (Tier 1) | `500×625` JPEG (39.3 KB) | Photo: Pexels (`https://www.pexels.com/photo/3890924/`). Used under the Pexels License (free commercial and editorial use, no paid subscription required). | Home: *"A woman selling tomatoes at a market stall in Lagos"*. NBS guide: *"A woman selling fresh tomatoes in bowls at a Lagos market stall, illustrating local volume measures versus per-kilogram NBS survey averages"*. Budget guide: *"A trader selling fresh produce at a Lagos market stall, representing weekly household food budgeting in Lagos"*. |
| `/images/photos/lagos-danfo-bus.jpg` | `/howto/drivers-licence-frsc` | `existing-photo` (Tier 1) | `500×667` JPEG (82.8 KB) | Photo: Pexels (`https://www.pexels.com/photo/5409298/`). Used under the Pexels License (free commercial and editorial use, no paid subscription required). | *"Overhead view of yellow commercial buses on a paved Lagos road, illustrating Nigerian road transport and driver licensing"* |

### 4.2 Tier 4 — Accepted Quality-Gated AI Fallback Heroes (`public/images/articles/`)

| File Path | Used On Route(s) | Source Tier | Dimensions & Size | Model & Credit / License | Alt Text |
|---|---|---|---|---|---|
| `/images/articles/howto-prepaid-electricity-bands.webp` | `/howto/prepaid-electricity-bands` | `ai-fallback` (Tier 4, passed gate on attempt 2) | `960×540` WebP (66.1 KB) | Generated via Arena `generate_image` tool (platform image model), cropped to 16:9 and optimized to 3G-friendly WebP via ImageMagick. First-party editorial illustration for NaijaCheck.ng (₦0 cost, free to publish). | *"Exterior wall of a Nigerian residential compound in Lagos showing PVC electrical conduit pipes and a weatherproof meter enclosure box under the roof eaves"* |
| `/images/articles/howto-cac-business-name.webp` | `/howto/cac-business-name` | `ai-fallback` (Tier 4, passed gate on attempt 2) | `960×540` WebP (54.6 KB) | Generated via Arena `generate_image` tool (platform image model), cropped to 16:9 and optimized to 3G-friendly WebP via ImageMagick. First-party editorial illustration for NaijaCheck.ng (₦0 cost, free to publish). | *"Wooden workbench inside a Nigerian tailoring and ankara fabric studio with a closed laptop, brass shears, measuring tape, and shelves of folded wax-print textiles"* |

### 4.3 Tier 3 — Generated Branded Covers (`public/images/covers/`)

| File Path | Used On Route(s) | Source Tier | Dimensions & Size | Credit & License | Alt Text |
|---|---|---|---|---|---|
| `/images/covers/lasrra-lagos-residency.svg` | `/howto/lasrra-lagos-residency` | `branded-cover` (Tier 3 fallback after AI attempt 1 was rejected by quality gate) | `960×540` SVG (~2.5 KB) | First-party deterministic SVG cover generated by `buildBrandedCoverSvg()` in `lib/article-images.ts` (site green `#008751` + NaijaCheck logo + short title). ₦0 cost. | *"Lagos State Residency Registration (LASRRA / LAG-ID): Documents, Centres and Card Collection — NaijaCheck verified Nigerian reference cover"* |
| `/images/covers/passport-renewal-2026.svg` | `/howto/passport-renewal-2026` | `branded-cover` (Tier 3; AI generation of official identity documents/passports is forbidden by policy) | `960×540` SVG (~2.5 KB) | First-party deterministic SVG cover generated by `buildBrandedCoverSvg()` in `lib/article-images.ts` (site green `#008751` + NaijaCheck logo + short title). ₦0 cost. | *"Nigerian International Passport Renewal — NaijaCheck verified Nigerian reference cover"* |
| `/images/covers/electricity-bill-explained.svg` | `/learn/electricity-bill-explained` | `branded-cover` (Tier 3 when no photo exists) | `960×540` SVG (~2.5 KB) | First-party deterministic SVG cover generated by `buildBrandedCoverSvg()` in `lib/article-images.ts` (site green `#008751` + NaijaCheck logo + short title). ₦0 cost. | *"How to Read Your Electricity Bill (Metered vs Estimated) — NaijaCheck verified Nigerian reference cover"* |

### 4.4 In-Body Instructional Diagrams (`public/images/diagrams/`)

| File Path | Used On Route(s) | Placement | Dimensions & Size | Credit & License | Alt Text |
|---|---|---|---|---|---|
| `/images/diagrams/market-unit-conversion.svg` | `/howto/nbs-food-price-watch` | After Section 4 (`afterSectionIndex: 3`, *"The unit problem: cup, mudu, derica, paint bucket and 50kg bag"*) | `960×540` SVG (5.1 KB) | First-party instructional SVG diagram created for NaijaCheck.ng. ₦0 cost. | *"Three-step diagram showing how to weigh local market measures in kilograms and divide price paid by net weight before comparing with NBS state averages"* |
| `/images/diagrams/nerc-bands-and-receipt-check.svg` | `/howto/prepaid-electricity-bands` | After Section 3 (`afterSectionIndex: 2`, *"What ₦10,000 of units actually buys"*) | `960×540` SVG (5.0 KB) | First-party instructional SVG diagram created for NaijaCheck.ng using verified Eko (EKEDP) Order/NERC/2026/091 rows. ₦0 cost. | *"Diagram comparing NERC service bands A through E minimum daily supply hours, Eko DisCo September 2026 kWh units per 10,000 Naira, and the vending receipt rate formula"* |

---

## 5. AI Quality Gate Audit Log

- **Image generation environment / model used:** Arena `generate_image` tool (platform image model).
- **Total AI candidate images evaluated:** **5**
- **Total AI candidate images REJECTED by the quality gate:** **3**
- **Total AI candidate images ACCEPTED and committed:** **2**

| Candidate ID | Target Route | Attempt | Gate Outcome | Quality Gate Findings & Action Taken |
|---|---|---:|---|---|
| `cac-business-name-attempt-1` | `/howto/cac-business-name` | 1 | **REJECTED** | Rejected before commit: background shop shelves contained garbled AI text on packaging (*"Detargeot"*, *"Jetergeat"*, *"IndorMie"*), ledger page contained garbled text, and table showed a synthetic banknote. Deleted from staging. |
| `prepaid-electricity-bands-attempt-1` | `/howto/prepaid-electricity-bands` | 1 | **REJECTED** | Rejected before commit: subject's right hand touching the changeover switch had unnatural ring/finger joint artifacts across three adjacent fingers plus chalky white smudges, and the breaker box had garbled text (*"sydo"*). Deleted from staging. |
| `lasrra-lagos-residency-attempt-1` | `/howto/lasrra-lagos-residency` | 1 | **REJECTED → Branded Cover** | Rejected before commit: wide street crowd scene in Ikeja had small-scale facial and hand distortions on background pedestrians and an okada rider. Deleted from staging; route automatically fell back to **Tier 3 generated branded cover** (`/images/covers/lasrra-lagos-residency.svg`). |
| `prepaid-electricity-bands-attempt-2` | `/howto/prepaid-electricity-bands` | 2 | **ACCEPTED** | Passed all quality gate checks: architectural documentary shot of a Lagos residential compound wall with PVC electrical conduit pipes and weatherproof meter box; zero people/hands/faces, zero text or seals, natural matte lighting. Resized to `960×540` WebP (`66.1 KB`). |
| `cac-business-name-attempt-2` | `/howto/cac-business-name` | 2 | **ACCEPTED** | Passed all quality gate checks: documentary interior of a Nigerian tailoring and ankara textile studio with workbench, closed laptop, brass shears, and measuring tape; zero people/hands/faces, zero text/documents/seals, natural daylight. Resized to `960×540` WebP (`54.6 KB`). |
