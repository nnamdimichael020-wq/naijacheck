/**
 * Unit/Audit test:
 *  - Omni search index covers all SSOT verticals with zero dead paths
 *  - A) Dropdown type-ahead shows ONLY allowlisted top-level hubs (no deep leaves) + opaque panel surface
 *  - B) Full `/search` returns deep omni results (noindex,follow, excluded from sitemap)
 *  - C) Collapse/expand preference (`naijacheck.searchChrome`), idle pause rules, reduced-motion & non-submitting overlay
 *  - D) 1,196-tip SSOT pool (no invented ZIP/sort digits, deduplicated, shuffled) & 3-tips-before-5s-cool-off cycle
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  normalizeSearch,
  normalizeRoutePath,
  isTopLevelPath,
  isDropdownAllowlistedPath,
  DROPDOWN_TOP_LEVEL_ALLOWLIST,
  DROPDOWN_TWO_SEGMENT_HUB_EXCEPTIONS,
  DROPDOWN_CATEGORY_HUBS,
  POPULAR_SHORTCUTS,
  SEARCH_SUGGESTIONS,
  scoreEntry,
  rankedSearch,
  rankedDropdownSearch,
  countDeepMatches,
  filterByCategory,
  SEARCH_CATEGORIES,
  WAT_SEARCH_KIND_LABEL,
} from "./search";
import { getAllBanks } from "./banks";
import { getAllPostalStates, getAllPostalAreaParams } from "./postal";
import { getAllLgaStates, getAllLgaParams } from "./lgas";
import { CHART_PAGES } from "./chart-pages";
import {
  createSearchIdleController,
  IDLE_SEARCH_TIMINGS,
  IDLE_TIPS_PER_BURST,
  INITIAL_IDLE_SNAPSHOT,
  SEARCH_CHROME_STORAGE_KEY,
  parseSearchChromeState,
  readSearchChromePreference,
  writeSearchChromePreference,
  type IdlePhase,
} from "./search-idle";
import {
  IDLE_TIP_POOL,
  IDLE_TIP_BUCKETS,
  createShuffledSearchTips,
} from "./search-tips";
import type { SearchEntry } from "./types";

function fakeIdleClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    scheduler: {
      setTimeout(fn: () => void, ms: number) {
        const id = ++seq;
        timers.set(id, { at: now + Math.max(0, ms), fn });
        return id;
      },
      clearTimeout(id: unknown) {
        timers.delete(id as number);
      },
    },
    pendingCount() {
      return timers.size;
    },
    advance(ms: number) {
      const target = now + ms;
      while (true) {
        let nextId: number | null = null;
        let nextAt = Infinity;
        for (const [id, t] of timers) {
          if (t.at <= target && t.at < nextAt) {
            nextAt = t.at;
            nextId = id;
          }
        }
        if (nextId === null) break;
        const entry = timers.get(nextId)!;
        timers.delete(nextId);
        now = entry.at;
        entry.fn();
      }
      now = target;
    },
  };
}

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function check() {
  const root = path.resolve(__dirname, "..");
  const indexPath = path.join(root, "public", "search-index.json");
  assert.ok(fs.existsSync(indexPath), "public/search-index.json must exist — run npm run generate first");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as SearchEntry[];
  const byKind: Record<string, number> = {};
  for (const e of index) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;

  console.log(`[search:test] index ${index.length} entries, ${fs.statSync(indexPath).size} bytes, kinds:`, byKind);

  // Evidence counts
  assert.ok(index.length >= 1000, `index should be ~1054 entries, got ${index.length}`);
  assert.ok(byKind["geo"] >= 800, `geo should be 812 (got ${byKind["geo"]})`);
  assert.ok((byKind["postal"] ?? 0) >= 45, `postal should be 49-50, got ${byKind["postal"]}`);
  assert.ok((byKind["banks"] ?? 0) >= 12, `banks should be 12-13, got ${byKind["banks"]}`);
  assert.ok((byKind["rates"] ?? 0) >= 2, `rates should be 2, got ${byKind["rates"]}`);
  assert.ok((byKind["charts"] ?? 0) >= 5, `charts should be >=5, got ${byKind["charts"]}`);
  assert.equal(byKind["prices-city"], 4, "Cities: exactly 4 real /prices/* city pages");

  // Shape & no duplicate paths
  for (const e of index) {
    assert.ok(e.path.startsWith("/"), `path must start with /: ${e.path}`);
    assert.ok(e.title && e.desc && e.keys && e.kind, `entry shape path/title/kind/desc/keys: ${e.path}`);
    assert.ok(WAT_SEARCH_KIND_LABEL[e.kind] || e.kind === "hub", `kind ${e.kind} should have label for filtering`);
  }
  const paths = index.map((e) => e.path);
  assert.equal(new Set(paths).size, paths.length, "no duplicate paths in index");

  // Filter categories defined and cover kinds
  const catIds = SEARCH_CATEGORIES.map((c) => c.id);
  for (const expected of ["all", "cities", "rates", "charts", "banks", "postal", "geo", "howto", "tools", "trends", "other"]) {
    assert.ok(catIds.includes(expected), `${expected} category present`);
  }
  for (const cat of SEARCH_CATEGORIES) {
    if (cat.id === "all") continue;
    assert.ok(cat.kinds !== null, `${cat.id} should have kinds`);
  }

  // Cities filter only prices-city (deep)
  const citiesFiltered = filterByCategory(index, "cities");
  assert.ok(citiesFiltered.every((e) => e.kind === "prices-city"), "Cities filter restricts to prices-city");
  assert.equal(citiesFiltered.length, 4, "Cities filter count 4");
  const lagos = index.find((e) => e.path === "/prices/lagos");
  assert.ok(lagos, "/prices/lagos must exist");
  assert.match(lagos!.keys.toLowerCase(), /lagos/, "lagos keys include city term");
  assert.ok(scoreEntry(lagos!, ["lagos"]) > 0, "scoreEntry scores lagos entry positively");
  const priceSample = index.find((e) => e.path === "/prices/lagos/rice");
  if (priceSample) assert.match(normalizeSearch(priceSample.keys), /rice/, "food term rice in keys");

  // B) Deep `/search` scoring & SSOT coverage
  const dollarResults = rankedSearch(index, "dollar", null, 5);
  assert.ok(dollarResults.some((r) => r.path.includes("/rates") || r.path.includes("/charts")), "dollar query should hit rates/charts");
  const petrolResults = rankedSearch(index, "petrol", null, 5);
  assert.ok(petrolResults.some((r) => r.kind === "charts" || r.path.includes("fuel") || r.path.includes("depot")), "petrol should hit fuel/charts");
  const sortResults = rankedSearch(index, "058", null, 5);
  assert.ok(sortResults.some((r) => r.path === "/codes/banks/gtbank"), "058 sort code should hit GTBank on deep search");
  const ussdResults = rankedSearch(index, "*737#", null, 5);
  assert.ok(ussdResults.some((r) => r.path.includes("gtbank")), "USSD *737# should hit GTBank on deep search");
  const gtbankFiltered = rankedSearch(index, "gtbank", "banks", 5);
  assert.ok(gtbankFiltered.some((r) => r.path === "/codes/banks/gtbank"), "gtbank in deep banks filter includes /codes/banks/gtbank");

  // SSOT coverage: 12 banks, 37 postal states + 12 leaves, 774 LGAs, 5 charts
  const banks = getAllBanks();
  assert.equal(banks.length, 12, "SSOT 12 banks");
  for (const b of banks) {
    assert.ok(index.some((e) => e.path === `/codes/banks/${b.slug}`), `index must include bank ${b.slug}`);
  }
  const postalStates = getAllPostalStates();
  assert.equal(postalStates.length, 37, "SSOT 37 postal states");
  for (const s of postalStates) {
    assert.ok(index.some((e) => e.path === `/codes/postal/${s.slug}`), `index must include postal state ${s.slug}`);
  }
  const postalLeaves = getAllPostalAreaParams();
  assert.equal(postalLeaves.length, 12, "SSOT 12 curated postal leaves");
  for (const p of postalLeaves) {
    assert.ok(index.some((e) => e.path === `/codes/postal/${p.state}/${p.area}`), `index must include postal leaf ${p.state}/${p.area}`);
  }
  const lgaStates = getAllLgaStates();
  assert.equal(getAllLgaParams().length, 774, "SSOT 774 LGAs");
  for (const s of lgaStates) {
    assert.ok(index.some((e) => e.path === `/geo/${s.slug}`), `index must include geo state ${s.slug}`);
  }
  assert.ok(index.some((e) => e.path === "/geo/lagos/ikeja"), "index must include /geo/lagos/ikeja");
  assert.ok(index.some((e) => e.path === "/geo/fct-abuja/bwari"), "index must include sample FCT LGA");
  assert.equal(CHART_PAGES.length, 5, "SSOT 5 chart pages");
  for (const c of CHART_PAGES) {
    assert.ok(index.some((e) => e.path === `/charts/${c.slug}`), `index must include chart ${c.slug}`);
  }

  // -------------------------------------------------------------------------
  // A) Type-ahead dropdown = first-level / allowlisted hubs ONLY + "ho" check
  // -------------------------------------------------------------------------
  assert.equal(normalizeRoutePath("/rates/?x=1#top"), "/rates");
  assert.equal(normalizeRoutePath("/"), "/");
  assert.ok(isTopLevelPath("/"), "/ is top-level");
  assert.ok(isTopLevelPath("/rates"), "/rates is 1-segment top-level");
  assert.ok(isTopLevelPath("/geo/"), "/geo/ normalizes to 1-segment top-level");
  assert.ok(!isTopLevelPath("/rates/history"), "/rates/history has 2 segments -> NOT strict 1-segment");
  assert.ok(!isTopLevelPath("/codes/banks"), "/codes/banks has 2 segments -> NOT strict 1-segment (uses explicit allowlist)");
  assert.ok(!isTopLevelPath("/codes/banks/gtbank"), "/codes/banks/gtbank is deep leaf");
  assert.ok(!isTopLevelPath("/admin"), "/admin excluded from public hubs");
  assert.ok(!isTopLevelPath("/search"), "/search excluded from hub dropdown");

  assert.equal(DROPDOWN_TOP_LEVEL_ALLOWLIST.length, 20, "18 one-segment hubs + 2 explicit product hubs (/codes/banks, /codes/postal)");
  const exceptionSet = new Set<string>(DROPDOWN_TWO_SEGMENT_HUB_EXCEPTIONS);
  for (const p of DROPDOWN_TOP_LEVEL_ALLOWLIST) {
    if (!exceptionSet.has(p)) {
      assert.ok(isTopLevelPath(p), `allowlisted ${p} must satisfy 1-segment rule unless in DROPDOWN_TWO_SEGMENT_HUB_EXCEPTIONS`);
    }
    assert.ok(isDropdownAllowlistedPath(p), `${p} must pass isDropdownAllowlistedPath`);
    assert.ok(index.some((e) => e.path === p), `allowlisted hub ${p} must exist in public/search-index.json`);
  }

  // Deep routes strictly excluded from dropdown
  for (const deep of [
    "/rates/history",
    "/prices/fuel",
    "/prices/lagos",
    "/prices/lagos/rice",
    "/codes/banks/gtbank",
    "/codes/banks/uba",
    "/codes/postal/lagos",
    "/codes/postal/lagos/ikeja",
    "/geo/lagos",
    "/geo/lagos/ikeja",
    "/airports/lagos-murtala-muhammed",
    "/airports/abuja-nnamdi-azikiwe",
    "/oil-gas/nnpc-limited",
    "/oil-gas/shell-nigeria",
    "/charts/parallel-usd-buy",
    "/howto/nin-correction",
    "/learn/budget-80k",
    "/trends/kelebu",
  ]) {
    assert.ok(!isDropdownAllowlistedPath(deep), `deep route ${deep} must NOT be allowlisted in dropdown`);
  }

  // Popular shortcuts & category hubs in dropdown must all be allowlisted hubs
  for (const p of POPULAR_SHORTCUTS) {
    assert.ok(isDropdownAllowlistedPath(p.path), `POPULAR_SHORTCUTS ${p.path} must be top-level allowlisted`);
  }
  for (const [cat, hubs] of Object.entries(DROPDOWN_CATEGORY_HUBS)) {
    for (const h of hubs) {
      assert.ok(isDropdownAllowlistedPath(h), `DROPDOWN_CATEGORY_HUBS[${cat}] -> ${h} must be allowlisted`);
    }
  }

  // Dropdown query checks (including "ho" over dense homepage copy)
  for (const q of ["ho", "gtbank", "uba", "058", "*737#", "umuahia", "ikeja", "100271", "rice", "kelebu", "nin", "dollar", "petrol"]) {
    const dd = rankedDropdownSearch(index, q, "all", 8);
    assert.ok(dd.length > 0, `dropdown for "${q}" should surface relevant section hub(s)`);
    assert.ok(
      dd.every((r) => isDropdownAllowlistedPath(r.path)),
      `dropdown for "${q}" leaked non-allowlisted path: ${dd.map((r) => r.path).join(", ")}`,
    );
  }
  const ddHo = rankedDropdownSearch(index, "ho", "all", 6);
  assert.ok(ddHo.some((r) => r.path === "/howto"), 'typing "ho" surfaces /howto hub in dropdown');

  // Specific check: typing `gtbank` in dropdown does NOT list `/codes/banks/gtbank`, lists `/codes/banks`; Enter (`rankedSearch`) DOES list `/codes/banks/gtbank`
  const ddGtbank = rankedDropdownSearch(index, "gtbank", "all", 8);
  assert.ok(!ddGtbank.some((r) => r.path === "/codes/banks/gtbank"), "dropdown gtbank must NOT list deep /codes/banks/gtbank");
  assert.ok(ddGtbank.some((r) => r.path === "/codes/banks"), "dropdown gtbank lists /codes/banks hub");
  const deepGtbank = rankedSearch(index, "gtbank", "all", 8);
  assert.ok(deepGtbank.some((r) => r.path === "/codes/banks/gtbank"), "full /search gtbank lists deep /codes/banks/gtbank");
  assert.ok(countDeepMatches(index, "gtbank", "all") >= 2, "countDeepMatches tracks deep matches for Enter CTA");

  // Category filter in dropdown stays shallow (section hub only; deep browse lives on /search)
  assert.deepEqual(rankedDropdownSearch(index, "", "banks", 8).map((r) => r.path), ["/codes/banks"]);
  assert.deepEqual(rankedDropdownSearch(index, "", "airports", 8).map((r) => r.path), ["/airports"]);

  // Airports search checks: "LOS" and "Abuja airport" surface /airports in dropdown and deep airport pages on /search
  const ddLos = rankedDropdownSearch(index, "LOS", "all", 8);
  assert.ok(ddLos.some((r) => r.path === "/airports"), 'dropdown "LOS" surfaces /airports hub');
  assert.ok(!ddLos.some((r) => r.path.startsWith("/airports/")), 'dropdown "LOS" excludes deep /airports/[slug]');
  const deepLos = rankedSearch(index, "LOS", "all", 8);
  assert.ok(
    deepLos.some((r) => r.path === "/airports/lagos-murtala-muhammed"),
    'full /search "LOS" finds /airports/lagos-murtala-muhammed',
  );
  const deepAbujaAirport = rankedSearch(index, "Abuja airport", "all", 8);
  assert.ok(
    deepAbujaAirport.some((r) => r.path === "/airports/abuja-nnamdi-azikiwe"),
    'full /search "Abuja airport" finds /airports/abuja-nnamdi-azikiwe',
  );

  // Oil & Gas search checks: "Shell Nigeria", "NNPC", and "SPDC" surface /oil-gas in dropdown and deep operator pages on /search
  assert.deepEqual(rankedDropdownSearch(index, "", "oil-gas", 8).map((r) => r.path), ["/oil-gas"]);
  const ddShell = rankedDropdownSearch(index, "Shell Nigeria", "all", 8);
  assert.ok(ddShell.some((r) => r.path === "/oil-gas"), 'dropdown "Shell Nigeria" surfaces /oil-gas hub');
  assert.ok(!ddShell.some((r) => r.path.startsWith("/oil-gas/")), 'dropdown "Shell Nigeria" excludes deep /oil-gas/[slug]');
  const deepShell = rankedSearch(index, "Shell Nigeria", "all", 8);
  assert.ok(
    deepShell.some((r) => r.path === "/oil-gas/shell-nigeria"),
    'full /search "Shell Nigeria" finds /oil-gas/shell-nigeria',
  );
  const deepNnpc = rankedSearch(index, "NNPC", "all", 8);
  assert.ok(
    deepNnpc.some((r) => r.path === "/oil-gas/nnpc-limited"),
    'full /search "NNPC" finds /oil-gas/nnpc-limited',
  );
  const deepSpdc = rankedSearch(index, "SPDC", "all", 8);
  assert.ok(
    deepSpdc.some((r) => r.path === "/oil-gas/renaissance-africa-energy"),
    'full /search "SPDC" finds /oil-gas/renaissance-africa-energy',
  );
  assert.deepEqual(rankedDropdownSearch(index, "", "postal", 8).map((r) => r.path), ["/codes/postal"]);
  assert.deepEqual(rankedDropdownSearch(index, "", "geo", 8).map((r) => r.path), ["/geo"]);
  assert.deepEqual(rankedDropdownSearch(index, "", "cities", 8).map((r) => r.path), ["/prices"]);
  assert.deepEqual(rankedDropdownSearch(index, "lagos", "cities", 6).map((r) => r.path), ["/prices"]);
  assert.equal(rankedDropdownSearch(index, "gtbank", "cities", 6).length, 0, "honest empty when query has no match in selected category");
  assert.equal(rankedDropdownSearch(index, "zzzznonexistentquery99", "all", 6).length, 0, "honest empty when query matches nothing");

  // -------------------------------------------------------------------------
  // C) Collapse/expand UI, opaque dropdown panel, z-index & reduced-motion
  // -------------------------------------------------------------------------
  const searchBarSrc = fs.readFileSync(path.join(root, "components/search-bar.tsx"), "utf-8");
  assert.ok(searchBarSrc.includes('fetch("/search-index.json")'), "SearchBar must lazy-fetch /search-index.json on focus");
  assert.ok(searchBarSrc.includes("onFocus"), "SearchBar must load index on focus");
  assert.ok(searchBarSrc.includes("rankedDropdownSearch"), "SearchBar must use shallow rankedDropdownSearch");
  assert.ok(!searchBarSrc.includes("rankedSearch("), "SearchBar must NOT call deep rankedSearch in dropdown");
  assert.ok(searchBarSrc.includes("prefers-reduced-motion: reduce"), "SearchBar must check prefers-reduced-motion: reduce");
  assert.ok(searchBarSrc.includes("isHovered") && searchBarSrc.includes("onPointerEnter"), "SearchBar must pause on desktop pointer hover");
  assert.ok(searchBarSrc.includes("isFocused") && searchBarSrc.includes("onFocusCapture"), "SearchBar must pause on focus");
  assert.ok(searchBarSrc.includes('aria-hidden="true"'), "decorative animation elements must be aria-hidden");
  assert.ok(searchBarSrc.includes("Search NaijaCheck"), "input must retain accessible name Search NaijaCheck");
  assert.ok(searchBarSrc.includes('if (!cleanQ && (!cat || cat === "all")) return;'), "empty idle input must never submit demo text on Enter");

  // Collapse / expand controls in SearchBar
  assert.ok(searchBarSrc.includes("ChevronUp") && searchBarSrc.includes("ChevronDown"), "SearchBar renders ChevronUp/ChevronDown controls");
  assert.ok(searchBarSrc.includes('aria-label="Hide search"') && searchBarSrc.includes("aria-expanded={true}"), "expanded state exposes Hide search button with aria-expanded=true");
  assert.ok(searchBarSrc.includes('aria-label="Show search"') && searchBarSrc.includes("aria-expanded={false}"), "collapsed state exposes Show search button with aria-expanded=false");

  // Opaque dropdown panel + Tailwind popover color + header z-index assertions
  const tailwindCfg = fs.readFileSync(path.join(root, "tailwind.config.ts"), "utf-8");
  assert.ok(
    tailwindCfg.includes("popover:") && tailwindCfg.includes("hsl(var(--popover))"),
    "tailwind.config.ts must register popover color token so bg-popover is solid, never transparent",
  );
  const globalsCss = fs.readFileSync(path.join(root, "app/globals.css"), "utf-8");
  assert.ok(globalsCss.includes(".search-idle-shell") && globalsCss.includes(".search-dot") && globalsCss.includes(".search-glow"), "CSS defines idle animation classes");
  assert.ok(globalsCss.includes(".search-compact-cue") && globalsCss.includes("display: none !important"), "reduced-motion CSS hides compact/typewriter overlays");
  assert.ok(
    globalsCss.includes(".search-dropdown-panel") &&
      globalsCss.includes("background-color: hsl(var(--popover));") &&
      globalsCss.includes("opacity: 1;"),
    "globals.css defines opaque .search-dropdown-panel surface",
  );
  assert.ok(
    searchBarSrc.includes("search-dropdown-panel") && searchBarSrc.includes("bg-popover"),
    "SearchBar listbox applies .search-dropdown-panel + bg-popover",
  );
  assert.ok(
    !/bg-popover\/\d+/.test(searchBarSrc) && !/bg-background\/\d+/.test(searchBarSrc),
    "SearchBar dropdown must not use translucent bg-popover/XX or bg-background/XX modifiers",
  );

  const siteHeaderSrc = fs.readFileSync(path.join(root, "components/site-header.tsx"), "utf-8");
  assert.ok(
    siteHeaderSrc.includes("z-[45]"),
    "SiteHeader stacks at z-[45] above main/ticker/bottom-nav (z-40) and below modals (z-50)",
  );

  // Storage helper persistence tests (`naijacheck.searchChrome`)
  assert.equal(SEARCH_CHROME_STORAGE_KEY, "naijacheck.searchChrome");
  assert.equal(parseSearchChromeState(null), "expanded");
  assert.equal(parseSearchChromeState(undefined), "expanded");
  assert.equal(parseSearchChromeState("bogus"), "expanded");
  assert.equal(parseSearchChromeState("collapsed"), "collapsed");
  assert.equal(parseSearchChromeState("expanded"), "expanded");
  {
    const mem = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    };
    assert.equal(readSearchChromePreference(mockStorage), "expanded", "defaults to expanded when unset");
    writeSearchChromePreference("collapsed", mockStorage);
    assert.equal(mem.get("naijacheck.searchChrome"), "collapsed", "writes exact key naijacheck.searchChrome=collapsed");
    assert.equal(readSearchChromePreference(mockStorage), "collapsed", "reads collapsed across simulated refresh");
    writeSearchChromePreference("expanded", mockStorage);
    assert.equal(readSearchChromePreference(mockStorage), "expanded", "reads expanded after re-expanding");
  }

  // -------------------------------------------------------------------------
  // D) Large SSOT tip pool (>= 1,000 unique strings, zero invented numbers)
  // -------------------------------------------------------------------------
  console.log(
    `[search:test] SSOT tip pool size: ${IDLE_TIP_POOL.length} unique strings`,
    Object.fromEntries(Object.entries(IDLE_TIP_BUCKETS).map(([k, v]) => [k, v.length])),
  );
  assert.ok(IDLE_TIP_POOL.length >= 1000, `SSOT tip pool must have >= 1,000 unique tips, got ${IDLE_TIP_POOL.length}`);
  const lowerSet = new Set(IDLE_TIP_POOL.map((t) => t.toLowerCase()));
  assert.equal(lowerSet.size, IDLE_TIP_POOL.length, "IDLE_TIP_POOL must be 100% case-insensitively deduplicated");

  const allPostalPlaceNames = new Set(
    postalStates.flatMap((s) => [
      s.name.toLowerCase(),
      s.capital.split("—")[0].trim().toLowerCase(),
      ...s.places.map((p) => p.name.split("—")[0].replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim().toLowerCase()),
    ]),
  );
  const allBankNames = new Set(banks.map((b) => b.name.toLowerCase()));
  const allLgaNames = new Set(lgaStates.flatMap((s) => s.lgas.map((l) => l.name.toLowerCase())));

  for (const tip of IDLE_TIP_POOL) {
    assert.ok(tip.length >= 4 && tip.length <= 56, `tip length out of bounds: "${tip}" (${tip.length})`);
    assert.ok(!/\b\d{6,}\b/.test(tip), `tip must NEVER embed 6+ digit ZIP or sort numbers: "${tip}"`);
    const lower = tip.toLowerCase();
    if (/sort code|ussd code|transfer code for/i.test(tip)) {
      assert.ok([...allBankNames].some((bn) => lower.includes(bn)), `bank tip "${tip}" must reference real bank in data/banks.json`);
    }
    if (/what’s the zip of|postal code for/i.test(tip)) {
      assert.ok([...allPostalPlaceNames].some((pl) => pl.length >= 2 && lower.includes(pl)), `postal tip "${tip}" must reference real place in data/postal-codes.json`);
    }
    if (tip.endsWith(" LGA")) {
      const lgaCore = tip.slice(0, -4).toLowerCase();
      assert.ok(allLgaNames.has(lgaCore), `LGA tip "${tip}" must match real LGA in data/lgas.json`);
    }
  }

  // Representative real SSOT tips across verticals exist in the pool
  for (const expectedTip of [
    "prices of fuel today",
    "what’s the ZIP of Umuahia?",
    "how can I change my name on my NIN?",
    "GTBank sort code",
    "what does kelebu mean?",
    "LGAs in Kano",
    "Ikeja LGA",
    "price of rice in Lagos",
  ]) {
    assert.ok(IDLE_TIP_POOL.includes(expectedTip), `IDLE_TIP_POOL must include real SSOT tip "${expectedTip}"`);
  }

  // Shuffler preserves full pool size, uniqueness, and rotates order across seeds
  const shuf1 = createShuffledSearchTips(seededRng(42));
  const shuf2 = createShuffledSearchTips(seededRng(999));
  assert.equal(shuf1.length, IDLE_TIP_POOL.length);
  assert.equal(new Set(shuf1.map((s) => s.toLowerCase())).size, IDLE_TIP_POOL.length);
  assert.notDeepEqual(shuf1.slice(0, 12), shuf2.slice(0, 12), "shuffled sessions must not repeat identical opening loop");

  // Anchor SEARCH_SUGGESTIONS compatibility check
  assert.ok(SEARCH_SUGGESTIONS.length >= 6);
  for (const s of SEARCH_SUGGESTIONS) {
    assert.ok(index.some((e) => e.path === s.href), `suggestion target ${s.href} must exist in search-index.json`);
  }

  // /search page SEO guardrails
  const searchPageMeta = fs.readFileSync(path.join(root, "app/search/page.tsx"), "utf-8");
  assert.ok(searchPageMeta.includes("index: false"), "/search must be noindex");
  assert.ok(searchPageMeta.includes("follow: true"), "/search must be follow");
  const sitemapSrc = fs.readFileSync(path.join(root, "app/sitemap.ts"), "utf-8");
  assert.ok(!sitemapSrc.split("\n").some((l) => l.includes('"/search"') || l.includes("'/search'")), "/search must not be in app/sitemap.ts");

  // -------------------------------------------------------------------------
  // E) Deterministic state-machine tests: 3-tip burst + 5s cool-off + collapse
  // -------------------------------------------------------------------------
  assert.equal(IDLE_TIPS_PER_BURST, 3, "exactly 3 tips per burst before cool-off");
  {
    const clock = fakeIdleClock();
    const ctrl = createSearchIdleController({ scheduler: clock.scheduler });
    const phaseLog: IdlePhase[] = [];
    ctrl.subscribe(() => {
      const p = ctrl.getSnapshot().phase;
      if (phaseLog[phaseLog.length - 1] !== p) phaseLog.push(p);
    });

    assert.deepEqual(ctrl.getSnapshot(), INITIAL_IDLE_SNAPSHOT, "SSR/pre-start snapshot is static active");
    assert.equal(ctrl.getTipCount(), IDLE_TIP_POOL.length, "default controller uses full 1,196-tip SSOT pool");

    // Start idle -> compact-initial -> expanding
    ctrl.start();
    assert.equal(ctrl.getSnapshot().phase, "compact-initial");
    assert.equal(ctrl.getSnapshot().isCompactVisual, true);

    clock.advance(IDLE_SEARCH_TIMINGS.compactInitialMs);
    assert.equal(ctrl.getSnapshot().phase, "expanding");
    assert.equal(ctrl.getSnapshot().isCompactVisual, false);

    clock.advance(IDLE_SEARCH_TIMINGS.expandMs);

    // Helper to step completely through one single tip in a burst
    const stepOneTip = (expectedBurstStep: number): string => {
      assert.equal(ctrl.getSnapshot().phase, "typing", `burst step ${expectedBurstStep} starts typing`);
      assert.equal(ctrl.getSnapshot().burstStep, expectedBurstStep);
      const tip = ctrl.getSnapshot().currentTip;
      assert.ok(tip.length > 0);

      clock.advance(IDLE_SEARCH_TIMINGS.typeFirstCharDelayMs);
      assert.equal(ctrl.getSnapshot().typed, tip.slice(0, 1));

      clock.advance((tip.length - 1) * IDLE_SEARCH_TIMINGS.typeCharIntervalMs);
      assert.equal(ctrl.getSnapshot().typed, tip);

      clock.advance(IDLE_SEARCH_TIMINGS.afterTypedHoldMs);
      assert.equal(ctrl.getSnapshot().phase, "dots-with-text");
      assert.equal(ctrl.getSnapshot().typed, tip);

      clock.advance(IDLE_SEARCH_TIMINGS.dotsWithTextMs);
      assert.equal(ctrl.getSnapshot().phase, "dots-only");
      assert.equal(ctrl.getSnapshot().typed, "");

      clock.advance(IDLE_SEARCH_TIMINGS.dotsOnlyMs);
      assert.equal(ctrl.getSnapshot().phase, "fading");

      clock.advance(IDLE_SEARCH_TIMINGS.fadeMs);
      return tip;
    };

    phaseLog.length = 0;
    const tipA = stepOneTip(0);
    // Immediately enters Tip B (burstStep = 1) with NO collapsing or compact-wait!
    assert.equal(ctrl.getSnapshot().phase, "typing", "after Tip A fade, immediately starts Tip B typing without collapsing");
    assert.ok(!phaseLog.includes("collapsing") && !phaseLog.includes("compact-wait"), "must not collapse after Tip A");

    const tipB = stepOneTip(1);
    assert.notEqual(tipB, tipA, "Tip B must differ from Tip A");
    // Immediately enters Tip C (burstStep = 2) with NO collapsing or compact-wait!
    assert.equal(ctrl.getSnapshot().phase, "typing", "after Tip B fade, immediately starts Tip C typing without collapsing");
    assert.ok(!phaseLog.includes("collapsing") && !phaseLog.includes("compact-wait"), "must not collapse after Tip B");

    const tipC = stepOneTip(2);
    assert.notEqual(tipC, tipA, "Tip C must differ from Tip A");
    assert.notEqual(tipC, tipB, "Tip C must differ from Tip B");

    // Now after 3rd tip -> collapses to compact lens + "Search" and rests 5s!
    assert.equal(ctrl.getSnapshot().phase, "collapsing", "collapses after 3rd tip");
    assert.equal(ctrl.getSnapshot().isCompactVisual, true);

    clock.advance(IDLE_SEARCH_TIMINGS.collapseMs);
    assert.equal(ctrl.getSnapshot().phase, "compact-wait", "enters ~5s cool-off after 3 tips");
    assert.equal(ctrl.getSnapshot().isCompactVisual, true);

    // Still resting at 4.9s
    clock.advance(IDLE_SEARCH_TIMINGS.compactWaitMs - 100);
    assert.equal(ctrl.getSnapshot().phase, "compact-wait");

    // At 5.0s -> expands and starts Burst 2 with 3 brand-new tips (Tip D, E, F)!
    clock.advance(100);
    assert.equal(ctrl.getSnapshot().phase, "expanding");
    clock.advance(IDLE_SEARCH_TIMINGS.expandMs);
    const tipD = stepOneTip(0);
    const tipE = stepOneTip(1);
    const tipF = stepOneTip(2);
    assert.equal(new Set([tipA, tipB, tipC, tipD, tipE, tipF]).size, 6, "6 distinct tips across 2 consecutive 3-tip bursts");
    assert.equal(ctrl.getSnapshot().phase, "collapsing");

    // Collapse chrome (`chromeCollapsed: true`) stops idle motion immediately with zero timers
    ctrl.updateEngagement({ chromeCollapsed: true });
    assert.equal(ctrl.getSnapshot().phase, "collapsed");
    assert.equal(ctrl.getSnapshot().isCompactVisual, false);
    assert.equal(ctrl.getSnapshot().showTypewriterOverlay, false);
    assert.equal(clock.pendingCount(), 0, "zero timers when search chrome is collapsed");
    clock.advance(60_000);
    assert.equal(ctrl.getSnapshot().phase, "collapsed");

    // Re-expanding chrome (`chromeCollapsed: false`) resumes idle cycle cleanly
    ctrl.updateEngagement({ chromeCollapsed: false });
    assert.equal(ctrl.getSnapshot().phase, "compact-initial");

    // Focus, typing, hover, panelOpen pause rules remain intact
    ctrl.updateEngagement({ focused: true });
    assert.equal(ctrl.getSnapshot().phase, "active");
    assert.equal(clock.pendingCount(), 0);

    ctrl.updateEngagement({ focused: false, hovered: true });
    assert.equal(ctrl.getSnapshot().phase, "active");
    assert.equal(clock.pendingCount(), 0);

    ctrl.updateEngagement({ hovered: false, panelOpen: true });
    assert.equal(ctrl.getSnapshot().phase, "active");

    ctrl.updateEngagement({ panelOpen: false });
    assert.equal(ctrl.getSnapshot().phase, "compact-initial");

    // prefers-reduced-motion: reduce + collapse toggle compatibility
    ctrl.updateEngagement({ reducedMotion: true });
    assert.equal(ctrl.getSnapshot().phase, "reduced-motion");
    assert.equal(clock.pendingCount(), 0);
    ctrl.updateEngagement({ chromeCollapsed: true });
    assert.equal(ctrl.getSnapshot().phase, "collapsed", "collapse still works under prefers-reduced-motion: reduce");
    assert.equal(clock.pendingCount(), 0);
    ctrl.updateEngagement({ chromeCollapsed: false });
    assert.equal(ctrl.getSnapshot().phase, "reduced-motion", "re-expand under prefers-reduced-motion returns to static bar");
    assert.equal(clock.pendingCount(), 0);

    ctrl.stop();
  }

  // Built static HTML & compiled CSS checks if out/ exists
  const outDir = path.join(root, "out");
  if (fs.existsSync(path.join(outDir, "index.html"))) {
    const homeHtml = fs.readFileSync(path.join(outDir, "index.html"), "utf-8");
    assert.ok(homeHtml.includes('id="site-search-desktop"') && homeHtml.includes('id="site-search-mobile"'), "both desktop and mobile header SearchBars rendered");
    assert.ok(homeHtml.includes("Search NaijaCheck"), "accessible label Search NaijaCheck present in SSR HTML");
    assert.ok(homeHtml.includes('aria-label="Hide search"'), "SSR HTML renders Hide search collapse button");

    // Verify compiled CSS in out/_next/static/css actually defines solid .bg-popover and .search-dropdown-panel
    const cssDir = path.join(outDir, "_next", "static", "css");
    if (fs.existsSync(cssDir)) {
      const cssJoined = fs
        .readdirSync(cssDir)
        .filter((f) => f.endsWith(".css"))
        .map((f) => fs.readFileSync(path.join(cssDir, f), "utf-8"))
        .join("\n");
      assert.ok(cssJoined.includes(".bg-popover{background-color:hsl(var(--popover))}") || cssJoined.includes(".bg-popover"), "compiled CSS includes .bg-popover utility");
      assert.ok(cssJoined.includes(".search-dropdown-panel"), "compiled CSS includes .search-dropdown-panel solid rule");
      assert.ok(cssJoined.includes(".z-\\[45\\]{z-index:45}"), "compiled CSS includes .z-[45] header stacking rule");
    }
  }

  console.log("ok - search filter/results + SSOT drift guard + noindex + lazy-load");
  console.log("ok - A) shallow allowlist & opaque panel + B) deep /search + C) collapse persistence + D) 1,196 SSOT tips & 3-tip cycle");
}

check();
