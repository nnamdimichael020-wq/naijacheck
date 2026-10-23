# Header Search UX — Shallow Dropdown, Deep `/search`, Collapse Toggle & 3-Tip Idle Cycle

Single source of truth: `lib/search.ts`, `lib/search-tips.ts`, `lib/search-idle.ts`, `components/search-bar.tsx`, `components/site-header.tsx`, `tailwind.config.ts`, and `app/globals.css`.

## 1. User-Controlled Collapse / Expand (`naijacheck.searchChrome`)

- **Storage key**: `localStorage["naijacheck.searchChrome"]` (`"expanded"` default | `"collapsed"`), managed via `readSearchChromePreference` / `writeSearchChromePreference` in `lib/search-idle.ts` and synchronized across `#site-search-desktop` and `#site-search-mobile` (and open tabs) via `naijacheck:search-chrome` + `storage` events.
- **Expanded**: displays the full search row plus a pull-up `ChevronUp` button (`aria-expanded="true"`, `aria-label="Hide search"`). Activating it closes any open dropdown, stops idle animation immediately, and collapses the search row.
- **Collapsed**: renders a tidy, low-height compact chip (`h-9` / `md:h-10`) with search lens + `"Search"` + `ChevronDown` (`aria-expanded="false"`, `aria-label="Show search"`), leaving no empty gap in the mobile or desktop header. Pressing `/` or `Ctrl+K` also expands and focuses search.
- **`prefers-reduced-motion: reduce`**: idle loop stays disabled (`phase === "reduced-motion"`), bar stays static when expanded, and the collapse/expand control works without animation transitions.

## 2. Dropdown Allowlist & Readability Fix

### Shallow allowlist (`lib/search.ts`)
- **Base path rule (`normalizeRoutePath` + `isTopLevelPath`)**: `/` plus all 16 public 1-segment hubs (`/rates`, `/codes`, `/geo`, `/howto`, `/tools`, `/trends`, `/charts`, `/prices`, `/hustle`, `/exam`, `/learn`, `/telecom`, `/status`, `/about`, `/privacy`).
- **Explicit product-hub exceptions (`DROPDOWN_TWO_SEGMENT_HUB_EXCEPTIONS`)**: `/codes/banks` and `/codes/postal` (**18 routes total** in `DROPDOWN_TOP_LEVEL_ALLOWLIST`).
- Deep leaves stay strictly on `/search?q=...&category=...` (`noindex,follow`, excluded from `app/sitemap.ts`).

### Opaque, independent type-ahead surface (`tailwind.config.ts`, `app/globals.css`, `components/site-header.tsx`)
- **Root cause fixed**: `--popover` / `--popover-foreground` existed in `app/globals.css`, but `popover` was missing from `tailwind.config.ts`, causing `bg-popover` to compile to transparent (`rgba(0,0,0,0)`) so homepage hero, rates, Trending Now, and share buttons bled through behind queries like `"ho"`.
- **Surface & stacking fix**:
  1. Registered `popover` (`DEFAULT: "hsl(var(--popover))"`, `foreground: "hsl(var(--popover-foreground))"`) in `tailwind.config.ts`.
  2. Added `.search-dropdown-panel` in `app/globals.css` enforcing solid `background-color: hsl(var(--popover))` (`#ffffff` in light mode, `hsl(150 20% 8%)` in dark mode), `opacity: 1`, `backdrop-filter: none`, `isolation: isolate`, paired with `border-2 border-border`, `shadow-2xl`, `ring-1`, high-contrast `text-foreground` titles, `text-muted-foreground` descriptions, and bordered `bg-primary/15 text-primary` kind badges.
  3. Elevated `<SiteHeader>` to `z-[45]` (above `<main>`, `<WatClockBar>`, `<LiveTicker>`, `<GeoSearch>` `z-30`, and `<BottomNav>` `z-40`, while remaining below `<SheetContent>` modals and `<PushPrompt>` at `z-50`), with `relative z-20` on the search rows above Row 2 `<nav>` (`z-10`).

## 3. Idle Animation: 1,196 Real SSOT Tips & 3-Tip Cycle Before 5s Cool-Off

### SSOT tip pool (`scripts/generate-content.ts` → `content/generated/search-tips-seed.json` → `lib/search-tips.ts`)
- **Pool size**: **1,196 unique, case-insensitively deduplicated strings** generated exclusively from committed SSOT data (`data/banks.json` 12 banks, `data/postal-codes.json` 37 states + 76 places, `data/lgas.json` 37 states + 774 LGAs, `data/govhowto.json` 12 guides, `data/slang.json` 20 slang + 8 relationship terms, `data/recipes.json` 10 dishes, `data/blueprints.json` 8 hustles, `data/exam.json` 5 institutions + 8 guides, `data/telecom.json` 4 networks, `data/learn.json` 8 guides, 4 live price city hubs, and 7 live market hubs).
- **Zero invented numbers**: no invented ZIP or sort digits appear in tip strings; all tips use verified SSOT names and real hub intents.
- **Balanced rotation**: `createShuffledSearchTips()` Fisher–Yates shuffles 4 topic buckets (`pricesAndRates`, `codesPostalAndBanks`, `guidesSlangAndTools`, `geoStatesAndLgas`) and interleaves them so consecutive 3-tip bursts span distinct verticals without a tight 10-item loop.

### 3-tip burst sequence (`IDLE_TIPS_PER_BURST = 3` in `lib/search-idle.ts`)
1. **Compact → Expand**: starts in compact lens + cradling hands SVG cue + glowing `Search`, then expands smoothly (`420ms`).
2. **Tip A (`burstStep = 0`)**: typewriter → `dots-with-text` → `dots-only` → brief `fading`.
3. **Tip B (`burstStep = 1`, distinct from A)**: immediately starts typewriter (no collapse) → `dots-with-text` → `dots-only` → `fading`.
4. **Tip C (`burstStep = 2`, distinct from A & B)**: immediately starts typewriter → `dots-with-text` → `dots-only` → `fading`.
5. **Collapse & rest**: collapses smoothly to compact lens + `Search` (`420ms`) and waits **5,000ms** (`compact-wait`), then expands again with **three new tips**.

### Pause rules
Pauses immediately (clearing timers) on focus/click, non-empty input, open dropdown panel, desktop mouse hover, collapsed search chrome (`chrome === "collapsed"`), hidden browser tab (`visibilitychange`), or `prefers-reduced-motion: reduce`.
