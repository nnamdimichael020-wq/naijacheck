# Header Search UX — Shallow Dropdown, Deep `/search` & Idle Animation

Single source of truth: `lib/search.ts`, `components/search-bar.tsx`, `components/search-results-client.tsx`, and `app/globals.css`.

## 1. Dropdown Allowlist & Path Rule (`lib/search.ts`)

The header live type-ahead dropdown (`rankedDropdownSearch`) intentionally shows **top-level section homes only**; deep leaves live on `/search`.

- **Base path rule (`isTopLevelPath`)**: after stripping query/hash and trailing slash (`normalizeRoutePath`), a path is `/` or has **at most one** segment beyond `/` (excluding utility routes `/admin` and `/search`).
  - Allowed one-segment hubs (16): `/`, `/rates`, `/codes`, `/geo`, `/howto`, `/tools`, `/trends`, `/charts`, `/prices`, `/hustle`, `/exam`, `/learn`, `/telecom`, `/status`, `/about`, `/privacy`.
- **Explicit two-segment product-hub exceptions (`DROPDOWN_TWO_SEGMENT_HUB_EXCEPTIONS`)**:
  - `/codes/banks` — Bank sort & USSD codes section home
  - `/codes/postal` — Nigerian postal/ZIP codes section home
  - Kept in `DROPDOWN_TOP_LEVEL_ALLOWLIST` (total **18** routes) so Bank codes and Postal/ZIP queries/filters show their section landing page without dumping every bank or postal leaf into the dropdown.
- **Excluded from dropdown (available on Enter via `/search`)**:
  - `/rates/history`, `/prices/fuel`, `/prices/lagos`, `/prices/lagos/rice`, `/prices/markets/*`
  - `/codes/banks/gtbank` and all 12 bank leaves
  - `/codes/postal/lagos`, `/codes/postal/lagos/ikeja` and all 37 state + 12 district postal leaves
  - `/geo/lagos`, `/geo/lagos/ikeja` and all 37 state + 774 LGA leaves
  - `/charts/parallel-usd-buy` and all chart series leaves
  - `/howto/*`, `/tools/*`, `/trends/*`, `/hustle/*`, `/exam/*`, `/learn/*`, `/telecom/*` leaves
- **Ranking & category filters in dropdown**:
  - Deep leaf matches roll up their relevance score (`owningDropdownHubPath`) to their owning allowlisted hub, so typing `gtbank` or `058` surfaces `/codes/banks` (never `/codes/banks/gtbank`) alongside a one-tap / `Enter` prompt showing the exact deep match count.
  - Selecting a category (`Cities`, `Bank codes`, `Postal/ZIP`, `LGAs`, etc.) in the dropdown displays only that category's section hub (`DROPDOWN_CATEGORY_HUBS`) and prompts the user to press `Enter` for the full deep list on `/search`.
  - Unmatched queries render an honest empty state with a direct action to run full deep `/search`.

## 2. Full Deep Search (`/search`)

- Route: `/search?q=...&category=...` (`app/search/page.tsx` + `components/search-results-client.tsx`).
- Searches the entire `public/search-index.json` (1,054 entries) via `rankedSearch` + `SEARCH_ALIASES`.
- SEO guardrails: `robots: { index: false, follow: true }`, canonical `https://naijacheck.ng/search`, excluded from `app/sitemap.ts`.

## 3. Idle Search-Bar Animation & Pause Rules

### Motion cycle (while idle)
1. **Compact state (`compact-initial` / `compact-wait`)**: pill narrows inside the fixed-height header row (`h-12` mobile / `md:h-14` desktop — zero CLS) showing the inline magnifier + cradling hands SVG cue (`CompactLensHandsCue`) and glowing `Search` label (`.search-glow`).
2. **Expand (`expanding`, ~420ms)**: smooth cubic-bezier width expansion to full bar width.
3. **Typewriter (`typing`, ~50ms/char)**: reveals one curated suggestion character-by-character inside an `aria-hidden="true"` `pointer-events-none` overlay (`q` / `input.value` remains empty).
4. **Bouncing dots (`dots-with-text` → `dots-only`)**: appends three bouncing dots, then simplifies to dots-only bounce briefly.
5. **Fade & collapse (`fading` → `collapsing`)**: fades out the overlay and collapses back to the compact lens + `Search` pill.
6. **Rest (`compact-wait`, 5,000ms)**: waits ~5 seconds in compact state, advances `suggestionIdx` to a different suggestion, and repeats.

### Pause & resume rules
- **Runs**: on initial client paint, on refresh, after client navigations (`pathname` change), and continuously while idle.
- **Pauses immediately** (expands to full width, clears timers, hides decorative overlay/cue):
  - Input or category filter receives focus / click (`onFocusCapture`)
  - User has typed anything (`q.length > 0`)
  - Desktop mouse hovers over the search control (`onPointerEnter` for non-touch pointers)
  - Type-ahead dropdown panel is open (`open === true`)
  - Browser tab is hidden (`visibilitychange`)
- **Resumes**: only when unfocused + pointer outside + `q === ""` + dropdown closed (including after search navigation completes).
- **Safety**: pressing `Enter` on an empty input with `All` never submits demo overlay text.
- **Reduced motion (`prefers-reduced-motion: reduce`)**: detected via `matchMedia` hook + CSS `@media (prefers-reduced-motion: reduce)` overrides; disables compact/expand loop, typewriter, and bouncing dots completely, rendering a normal static full-width search bar with static placeholder.

## 4. Curated Suggestion Sources (`SEARCH_SUGGESTIONS`)

Every rotating prompt in `lib/search.ts` maps to real SSOT data and routes in this repo:

| Demo query | SSOT source | Target route |
| --- | --- | --- |
| `prices of fuel today` | `data/live/fuel.json` + `/prices/fuel` | `/prices/fuel` |
| `what’s the ZIP of Umuahia?` | `data/postal-codes.json` (Abia GPO `440001`) | `/codes/postal/abia` |
| `prices of rice` | `content/generated/articles.json` | `/prices/lagos/rice` |
| `dollar rate?` | `data/live/fx.json` + `/rates` | `/rates` |
| `what can 80k buy in Lagos?` | `content/generated/articles.json` (`/prices/cost-of-living`, `/learn/budget-80k`) | `/prices/cost-of-living` |
| `how can I change my name on my NIN?` | `data/govhowto.json` (`nin-correction`) | `/howto/nin-correction` |
| `GTBank sort code & USSD` | `data/banks.json` (`058`, `*737#`) | `/codes/banks/gtbank` |
| `postal code for Ikeja?` | `data/postal-codes.json` (`100271`) | `/codes/postal/lagos/ikeja` |
| `what does kelebu mean?` | `data/slang.json` (`kelebu`) | `/trends/kelebu` |
| `LGAs in Kano State` | `data/lgas.json` (44 LGAs) | `/geo/kano` |
