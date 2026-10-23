# Main-Hub Category Bubble Bar (Home-First)

Single source of truth: `lib/category-bubbles.ts`, `lib/category-bubble-controller.ts`, `components/home/category-bubble-bar.tsx`, `components/home/category-bubble-bar-client.tsx`, and `app/globals.css`.

## 1. Fixed Minimal 6 Main Bubbles

Each bubble renders strictly as **`[icon] [Name] [chevron]`** inside one compact pill (`h-8.5` inside an `h-11` / `44px` slim rail) with `aria-expanded` and accessible name `"{Name}, open menu"` / `"{Name}, close menu"`:

| # | Bubble | Lucide Icon | Hub `href` | Subcategories Covered |
| --- | --- | --- | --- | --- |
| 1 | **Money** | `Banknote` | `/rates` | Dollar & FX Rates (`/rates`), FX History Archive (`/rates/history`), Fuel & Depot Prices (`/prices/fuel`), Generator Diesel Guide (`/prices/generator-diesel`), Price Charts (`5` series under `/charts/*`), City Food Prices (`4` cities under `/prices/*`), Major Market Guides (`7` markets under `/prices/markets/*`), and Source Status & Honesty (`/status` — kept inside Money rather than adding a 7th bubble) |
| 2 | **Codes** | `Hash` | `/codes` | Bank Sort & USSD Codes (`12` banks under `/codes/banks/*`), Postal / ZIP Codes by State (`37` states under `/codes/postal/*`), and Popular District Postal Codes (`12` curated areas under `/codes/postal/[state]/[area]`) |
| 3 | **Places** | `MapPin` | `/geo` | States & FCT Directory (`37` state links `/geo/[state]` labelled `"All LGAs in {State}"` with `{count} LGAs` badge — never dumps 774 LGA rows inline) |
| 4 | **Guides** | `FileText` | `/howto` | GovHowTo Official Steps (`12` guides), Money & Everyday Life (`8` `/learn/*` guides), Exam Cut-Offs & Timetables (`14` `/exam/*` guides), Telecom & Data Plans (`8` `/telecom/*` guides), and Hustle Business Blueprints (`8` `/hustle/*` plans) |
| 5 | **Street** | `MessageCircle` | `/trends` | Trending Naija Slang (top `12` by `trendScore` + `"See all 20 slang terms →"` to `/trends`) and Relationship & Group-Chat Terms (`8` terms) |
| 6 | **Tools** | `Wrench` | `/tools` | Price IQ & Slang Quiz (`/tools/quiz`), Generator Fuel Calculator (`/tools/generator`), Solar Inverter Payback (`/tools/solar`), Cost-of-Living Calculator (`/prices/cost-of-living`), and Recipe Cost Cookbook (`10` dishes under `/tools/cookbook/*`) |

## 2. Data-Driven SSOT & Depth Rules

- `buildCategoryBubbleTree()` in `lib/category-bubbles.ts` reads directly from the committed SSOT loaders (`getAllBanks`, `getAllPostalStates`, `getAllPostalAreaParams`, `getAllLgaStates`, `CHART_PAGES`, `DIRECT_PRICE_CITIES`, `GOV_DOCS`, `LEARN_TOPICS`, `SLANG_TERMS`, `PSYCH_TERMS`, `BLUEPRINTS`, `RECIPES`, and `ARTICLES`).
- When `data/*.json` grows and `npm run generate` / `npm run build` runs, new banks, postal states/areas, LGA states, guides, slang terms, charts, cities, blueprints, and recipes flow into the menu automatically without editing React component code.
- **Max depth = 2 levels** (`Category → Subcategory → Leaf link`).
- Nested chevrons render **only** when `sub.children && sub.children.length > 0`. Direct 1-level links render without a nested chevron.

## 3. Placement Choice: Home-First (`app/page.tsx`)

- Rendered **home-first** at the top of `app/page.tsx` directly below the `<SiteHeader>` / `<WatClockBar>` / `<LiveTicker>` strip and **above** the homepage `<header>` and `<DailyBriefing>`.
- **Why home-first (sitewide off for deep articles)**:
  1. Gives immediate 1-tap hub discovery at the top of the home page without hunting, while keeping the lower `<ExploreGrid />` intact as the richer visual directory.
  2. Steals **0 vertical pixels** on long GovHowTo, LGA, postal, bank, and chart guides, and adds **0 bytes** of serialized menu JSON to the other 1,058 static HTML routes.

## 4. Motion, Opaque Panel Surface & 10-Second Auto-Close

- **Idle horizontal drift**: gentle low-CPU ping-pong scroll (`~13px/sec` at `50ms` steps) on `.nc-bubble-scroller`; supports native touch swipe and mouse click-drag in both directions at any time.
- **Pause & resume**: drift pauses immediately on desktop hover, touch, keyboard focus, open category panel, hidden browser tab, or `prefers-reduced-motion: reduce`; resumes smoothly when idle again.
- **Opaque elevated surface**: `.nc-bubble-dropdown-panel` (`background-color: hsl(var(--popover)); color: hsl(var(--popover-foreground)); opacity: 1; backdrop-filter: none; isolation: isolate;`) rendered as a sibling outside `overflow-x: auto` at `z-[38]` / `z-50` (above `<main>` and `<DailyBriefing>`, below `<BottomNav>` `z-40`, `<SiteHeader>` `z-[45]`, and modals `z-50`), with `max-h-[min(68vh,26rem)] overflow-y-auto`.
- **10-second auto-close (`CATEGORY_PANEL_AUTO_CLOSE_MS = 10_000`)**:
  - When a panel is open and pointer, touch, and focus leave **both** the bubble bar and the open panel, a `10,000ms` timer starts and closes all open panels on expiry.
  - Re-entering either the bar or the panel cancels the timer immediately; leaving again starts a fresh `10,000ms` timer.
  - Clicking outside, pressing `Escape`, clicking a link, or clicking the open bubble pill a second time closes immediately.
