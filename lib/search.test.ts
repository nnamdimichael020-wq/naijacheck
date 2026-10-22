/**
 * Unit/Audit test:
 *  - Omni search index covers all SSOT verticals with zero dead paths
 *  - A) Dropdown type-ahead shows ONLY allowlisted top-level hubs (no deep leaves)
 *  - B) Full `/search` returns deep omni results (noindex,follow, excluded from sitemap)
 *  - C) Idle animation pause rules, prefers-reduced-motion path & non-submitting demo overlay
 *  - D) Rotating suggestion list pulls exclusively from real SSOT topics/data
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
import { createSearchIdleController, IDLE_SEARCH_TIMINGS, INITIAL_IDLE_SNAPSHOT } from "./search-idle";
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
  // A) Type-ahead dropdown = first-level / allowlisted section hubs ONLY
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

  assert.equal(DROPDOWN_TOP_LEVEL_ALLOWLIST.length, 18, "16 one-segment hubs + 2 explicit product hubs (/codes/banks, /codes/postal)");
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

  // Dropdown query checks: typing deep terms surfaces section hubs ONLY, never deep leaves
  for (const q of ["gtbank", "uba", "058", "*737#", "umuahia", "ikeja", "100271", "rice", "kelebu", "nin", "dollar", "petrol"]) {
    const dd = rankedDropdownSearch(index, q, "all", 8);
    assert.ok(dd.length > 0, `dropdown for "${q}" should surface relevant section hub(s)`);
    assert.ok(
      dd.every((r) => isDropdownAllowlistedPath(r.path)),
      `dropdown for "${q}" leaked non-allowlisted path: ${dd.map((r) => r.path).join(", ")}`,
    );
  }

  // Specific check: typing `gtbank` in dropdown does NOT list `/codes/banks/gtbank`, lists `/codes/banks`; Enter (`rankedSearch`) DOES list `/codes/banks/gtbank`
  const ddGtbank = rankedDropdownSearch(index, "gtbank", "all", 8);
  assert.ok(!ddGtbank.some((r) => r.path === "/codes/banks/gtbank"), "dropdown gtbank must NOT list deep /codes/banks/gtbank");
  assert.ok(ddGtbank.some((r) => r.path === "/codes/banks"), "dropdown gtbank lists /codes/banks hub");
  const deepGtbank = rankedSearch(index, "gtbank", "all", 8);
  assert.ok(deepGtbank.some((r) => r.path === "/codes/banks/gtbank"), "full /search gtbank lists deep /codes/banks/gtbank");
  assert.ok(countDeepMatches(index, "gtbank", "all") >= 2, "countDeepMatches tracks deep matches for Enter CTA");

  // Category filter in dropdown stays shallow (section hub only; deep browse lives on /search)
  const ddBanksBrowse = rankedDropdownSearch(index, "", "banks", 8);
  assert.deepEqual(ddBanksBrowse.map((r) => r.path), ["/codes/banks"]);
  const ddPostalBrowse = rankedDropdownSearch(index, "", "postal", 8);
  assert.deepEqual(ddPostalBrowse.map((r) => r.path), ["/codes/postal"]);
  const ddGeoBrowse = rankedDropdownSearch(index, "", "geo", 8);
  assert.deepEqual(ddGeoBrowse.map((r) => r.path), ["/geo"]);
  const ddCitiesBrowse = rankedDropdownSearch(index, "", "cities", 8);
  assert.deepEqual(ddCitiesBrowse.map((r) => r.path), ["/prices"]);

  // Category filter + matching query in dropdown (e.g. Cities + lagos -> /prices hub; Cities + gtbank -> [])
  const ddCitiesLagos = rankedDropdownSearch(index, "lagos", "cities", 6);
  assert.deepEqual(ddCitiesLagos.map((r) => r.path), ["/prices"]);
  const ddCitiesGtbank = rankedDropdownSearch(index, "gtbank", "cities", 6);
  assert.equal(ddCitiesGtbank.length, 0, "honest empty when query has no match in selected category");
  const ddGibberish = rankedDropdownSearch(index, "zzzznonexistentquery99", "all", 6);
  assert.equal(ddGibberish.length, 0, "honest empty when query matches nothing");

  // -------------------------------------------------------------------------
  // C) Idle animation, pause rules, reduced-motion & non-submitting overlay
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
  assert.ok(searchBarSrc.includes("if (!cleanQ && (!cat || cat === \"all\")) return;"), "empty idle input must never submit demo text on Enter");

  const globalsCss = fs.readFileSync(path.join(root, "app/globals.css"), "utf-8");
  assert.ok(globalsCss.includes(".search-idle-shell") && globalsCss.includes(".search-dot") && globalsCss.includes(".search-glow"), "CSS defines idle animation classes");
  assert.ok(globalsCss.includes(".search-compact-cue") && globalsCss.includes("display: none !important"), "reduced-motion CSS hides compact/typewriter overlays");

  // -------------------------------------------------------------------------
  // D) Suggestion list pulled exclusively from real SSOT topics/data
  // -------------------------------------------------------------------------
  assert.ok(SEARCH_SUGGESTIONS.length >= 6, "at least 6 rotating real-topic suggestions");
  const allPostalPlaceNames = new Set(
    postalStates.flatMap((s) => [s.name.toLowerCase(), s.capital.toLowerCase(), ...s.places.map((p) => p.name.toLowerCase())]),
  );
  const allBankNames = new Set(banks.flatMap((b) => [b.name.toLowerCase(), b.slug.toLowerCase()]));

  for (const s of SEARCH_SUGGESTIONS) {
    assert.ok(s.text.trim().length > 0 && s.source.trim().length > 0 && s.href.startsWith("/"), `valid suggestion shape: ${s.text}`);
    assert.ok(index.some((e) => e.path === s.href), `suggestion target ${s.href} must exist in search-index.json`);
    const hits = rankedSearch(index, s.text, null, 20);
    assert.ok(hits.length > 0, `suggestion "${s.text}" must match real index entries on /search`);
    assert.ok(
      hits.some((h) => h.path === s.href || h.path.startsWith(s.href.split("/").slice(0, 2).join("/"))),
      `suggestion "${s.text}" should surface ${s.href} (got ${hits.slice(0, 3).map((h) => h.path).join(", ")})`,
    );
    // Guard against claiming ZIP/postal for a place absent from data/postal-codes.json
    if (/zip|postal/i.test(s.text)) {
      const lower = s.text.toLowerCase();
      const matchedPlace = [...allPostalPlaceNames].some((place) => {
        const core = place.split("—")[0].trim();
        return core.length >= 3 && lower.includes(core);
      });
      assert.ok(matchedPlace, `postal/ZIP suggestion "${s.text}" must reference a real place in data/postal-codes.json`);
    }
    if (/sort code|ussd/i.test(s.text)) {
      const lower = s.text.toLowerCase();
      assert.ok([...allBankNames].some((bn) => lower.includes(bn)), `bank suggestion "${s.text}" must reference a real bank in data/banks.json`);
    }
  }

  // /search page SEO guardrails
  const searchPageMeta = fs.readFileSync(path.join(root, "app/search/page.tsx"), "utf-8");
  assert.ok(searchPageMeta.includes("index: false"), "/search must be noindex");
  assert.ok(searchPageMeta.includes("follow: true"), "/search must be follow");
  const sitemapSrc = fs.readFileSync(path.join(root, "app/sitemap.ts"), "utf-8");
  assert.ok(!sitemapSrc.split("\n").some((l) => l.includes('"/search"') || l.includes("'/search'")), "/search must not be in app/sitemap.ts");

  // -------------------------------------------------------------------------
  // E) Deterministic state-machine tests for idle animation & pause/resume
  // -------------------------------------------------------------------------
  {
    const clock = fakeIdleClock();
    const ctrl = createSearchIdleController({ scheduler: clock.scheduler });
    assert.deepEqual(ctrl.getSnapshot(), INITIAL_IDLE_SNAPSHOT, "SSR/pre-start snapshot is static active");

    // 1. Start idle: compact-initial -> expanding -> typing -> dots-with-text -> dots-only -> fading -> collapsing -> compact-wait (5s) -> next suggestion
    ctrl.start();
    assert.equal(ctrl.getSnapshot().phase, "compact-initial");
    assert.equal(ctrl.getSnapshot().isCompactVisual, true);

    clock.advance(IDLE_SEARCH_TIMINGS.compactInitialMs);
    assert.equal(ctrl.getSnapshot().phase, "expanding");
    assert.equal(ctrl.getSnapshot().isCompactVisual, false);

    clock.advance(IDLE_SEARCH_TIMINGS.expandMs);
    assert.equal(ctrl.getSnapshot().phase, "typing");
    const firstSuggestion = SEARCH_SUGGESTIONS[0].text;
    clock.advance(IDLE_SEARCH_TIMINGS.typeFirstCharDelayMs);
    assert.equal(ctrl.getSnapshot().typed, firstSuggestion.slice(0, 1), "first char typed");

    clock.advance((firstSuggestion.length - 1) * IDLE_SEARCH_TIMINGS.typeCharIntervalMs);
    assert.equal(ctrl.getSnapshot().typed, firstSuggestion, "full suggestion typed");

    clock.advance(IDLE_SEARCH_TIMINGS.afterTypedHoldMs);
    assert.equal(ctrl.getSnapshot().phase, "dots-with-text", "step 4a: three bouncing dots appended");
    assert.equal(ctrl.getSnapshot().typed, firstSuggestion);

    clock.advance(IDLE_SEARCH_TIMINGS.dotsWithTextMs);
    assert.equal(ctrl.getSnapshot().phase, "dots-only", "step 4b: simplified to dots-only bounce");
    assert.equal(ctrl.getSnapshot().typed, "", "dots-only clears demo text");

    clock.advance(IDLE_SEARCH_TIMINGS.dotsOnlyMs);
    assert.equal(ctrl.getSnapshot().phase, "fading");

    clock.advance(IDLE_SEARCH_TIMINGS.fadeMs);
    assert.equal(ctrl.getSnapshot().phase, "collapsing");
    assert.equal(ctrl.getSnapshot().isCompactVisual, true);

    clock.advance(IDLE_SEARCH_TIMINGS.collapseMs);
    assert.equal(ctrl.getSnapshot().phase, "compact-wait", "step 6: waiting ~5s in compact state");
    assert.equal(ctrl.getSnapshot().isCompactVisual, true);

    // Still compact at 4.9s
    clock.advance(IDLE_SEARCH_TIMINGS.compactWaitMs - 100);
    assert.equal(ctrl.getSnapshot().phase, "compact-wait");

    // At 5.0s: rotates to suggestion 1 (different suggestion) & expands again
    clock.advance(100);
    assert.equal(ctrl.getSnapshot().phase, "expanding");
    assert.equal(ctrl.getSnapshot().suggestionIndex, 1, "step 7: rotated to a different suggestion");
    clock.advance(IDLE_SEARCH_TIMINGS.expandMs + IDLE_SEARCH_TIMINGS.typeFirstCharDelayMs);
    assert.equal(ctrl.getSnapshot().typed, SEARCH_SUGGESTIONS[1].text.slice(0, 1));

    // 2. Focus pauses immediately, clears timers & overlay
    ctrl.updateEngagement({ focused: true });
    assert.equal(ctrl.getSnapshot().phase, "active");
    assert.equal(ctrl.getSnapshot().typed, "");
    assert.equal(ctrl.getSnapshot().isCompactVisual, false);
    assert.equal(clock.pendingCount(), 0, "no background timers while focused");
    clock.advance(30_000);
    assert.equal(ctrl.getSnapshot().phase, "active");

    // 3. Typing keeps paused even if blurred; resumes only when blurred + unhovered + empty
    ctrl.updateEngagement({ focused: false, hasInput: true });
    assert.equal(ctrl.getSnapshot().phase, "active");
    clock.advance(10_000);
    assert.equal(ctrl.getSnapshot().phase, "active");

    // 4. Desktop hover pauses and keeps expanded
    ctrl.updateEngagement({ hasInput: false, hovered: true });
    assert.equal(ctrl.getSnapshot().phase, "active");
    assert.equal(clock.pendingCount(), 0);

    // 5. Pointer leave + empty + blurred + panel closed -> resumes cleanly
    ctrl.updateEngagement({ hovered: false });
    assert.equal(ctrl.getSnapshot().phase, "compact-initial");

    // 6. Open dropdown panel pauses so animation never fights panel
    ctrl.updateEngagement({ panelOpen: true });
    assert.equal(ctrl.getSnapshot().phase, "active");
    ctrl.updateEngagement({ panelOpen: false });
    assert.equal(ctrl.getSnapshot().phase, "compact-initial");

    // 7. Client navigation advances suggestion and restarts idle loop
    const prevIdx = ctrl.getSnapshot().suggestionIndex;
    ctrl.notifyNavigation();
    assert.equal(ctrl.getSnapshot().suggestionIndex, (prevIdx + 1) % SEARCH_SUGGESTIONS.length);
    assert.equal(ctrl.getSnapshot().phase, "compact-initial");

    // 8. prefers-reduced-motion: reduce -> static bar, zero timers
    ctrl.updateEngagement({ reducedMotion: true });
    assert.equal(ctrl.getSnapshot().phase, "reduced-motion");
    assert.equal(ctrl.getSnapshot().isCompactVisual, false);
    assert.equal(ctrl.getSnapshot().showTypewriterOverlay, false);
    assert.equal(clock.pendingCount(), 0, "zero timers under prefers-reduced-motion: reduce");
    clock.advance(60_000);
    assert.equal(ctrl.getSnapshot().phase, "reduced-motion");

    ctrl.stop();
  }

  // Built static HTML checks if out/ exists
  const outDir = path.join(root, "out");
  if (fs.existsSync(path.join(outDir, "index.html"))) {
    const homeHtml = fs.readFileSync(path.join(outDir, "index.html"), "utf-8");
    assert.ok(homeHtml.includes('id="site-search-desktop"') && homeHtml.includes('id="site-search-mobile"'), "both desktop and mobile header SearchBars rendered");
    assert.ok(homeHtml.includes("Search NaijaCheck"), "accessible label Search NaijaCheck present in SSR HTML");
  }

  console.log("ok - search filter/results + SSOT drift guard + noindex + lazy-load");
  console.log("ok - A) top-level dropdown allowlist + B) deep /search + C) idle animation & reduced-motion + D) verified SSOT suggestions");
}

check();
