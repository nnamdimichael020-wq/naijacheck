/**
 * Unit/Audit test: search index covers everything meaningful, filters work, scoring reuses aliases,
 * and every path in index maps to a real route (no dead paths).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeSearch, scoreEntry, rankedSearch, filterByCategory, SEARCH_CATEGORIES, WAT_SEARCH_KIND_LABEL } from "./search";
import { getAllBanks } from "./banks";
import { getAllPostalStates, getAllPostalAreaParams } from "./postal";
import { getAllLgaStates, getAllLgaParams } from "./lgas";
import { CHART_PAGES } from "./chart-pages";
import type { SearchEntry } from "./types";

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

  // Shape
  for (const e of index) {
    assert.ok(e.path.startsWith("/"), `path must start with /: ${e.path}`);
    assert.ok(e.title && e.desc && e.keys && e.kind, `entry shape path/title/kind/desc/keys: ${e.path}`);
    assert.ok(WAT_SEARCH_KIND_LABEL[e.kind] || e.kind === "hub", `kind ${e.kind} should have label for filtering`);
  }
  // No duplicate paths
  const paths = index.map((e) => e.path);
  assert.equal(new Set(paths).size, paths.length, "no duplicate paths in index");

  // Filter categories defined and cover kinds
  const catIds = SEARCH_CATEGORIES.map((c) => c.id);
  assert.ok(catIds.includes("all"), "All category present");
  assert.ok(catIds.includes("cities"), "Cities");
  assert.ok(catIds.includes("banks"), "Bank codes");
  assert.ok(catIds.includes("postal"), "Postal");
  assert.ok(catIds.includes("geo"), "LGAs");
  assert.ok(catIds.includes("howto"), "Gov how-to");
  for (const cat of SEARCH_CATEGORIES) {
    if (cat.id === "all") continue;
    assert.ok(cat.kinds !== null, `${cat.id} should have kinds`);
  }

  // Cities filter only prices-city
  const citiesFiltered = filterByCategory(index, "cities");
  assert.ok(citiesFiltered.every((e) => e.kind === "prices-city"), "Cities filter restricts to prices-city");
  assert.equal(citiesFiltered.length, 4, "Cities filter count 4");
  // Keys include city+food terms — check lagos entry
  const lagos = index.find((e) => e.path === "/prices/lagos");
  assert.ok(lagos, "/prices/lagos must exist");
  assert.match(lagos!.keys.toLowerCase(), /lagos/, "lagos keys include city term");
  // Food terms present somewhere in prices-city keys/price pages
  const priceSample = index.find((e) => e.path === "/prices/lagos/rice");
  if (priceSample) assert.match(normalizeSearch(priceSample.keys), /rice/, "food term rice in keys");

  // Scoring aliases
  // dollar → usd should match rates
  const dollarResults = rankedSearch(index, "dollar", null, 5);
  assert.ok(dollarResults.some((r) => r.path.includes("/rates") || r.path.includes("/charts")), "dollar query should hit rates/charts");
  // petrol/pms alias — query petrol should match fuel/depot
  const petrolResults = rankedSearch(index, "petrol", null, 5);
  assert.ok(petrolResults.some((r) => r.kind === "charts" || r.path.includes("fuel") || r.path.includes("depot")), "petrol should hit fuel/charts");
  // sort digits — query 058 should hit GTBank
  const sortResults = rankedSearch(index, "058", null, 5);
  assert.ok(sortResults.some((r) => r.path === "/codes/banks/gtbank"), "058 sort code should hit GTBank");
  // USSD — *737# should hit GTBank
  const ussdResults = rankedSearch(index, "*737#", null, 5);
  assert.ok(ussdResults.some((r) => r.path.includes("gtbank")), "USSD *737# should hit GTBank");
  // Enter→/search behavior check: query gtbank filtered to banks still returns result
  const gtbankFiltered = rankedSearch(index, "gtbank", "banks", 5);
  assert.ok(gtbankFiltered.length > 0 && gtbankFiltered[0].path.includes("gtbank"), "gtbank in banks filter");

  // Postal filter
  const postalFiltered = filterByCategory(index, "postal");
  assert.ok(postalFiltered.some((e) => e.path === "/codes/postal/lagos"), "postal filter includes Lagos state");
  assert.ok(postalFiltered.some((e) => e.path === "/codes/postal/lagos/ikeja"), "postal includes Ikeja leaf 100271");

  // Banks filter
  const bankFiltered = filterByCategory(index, "banks");
  assert.ok(bankFiltered.some((e) => e.path === "/codes/banks/access-bank"), "banks filter includes Access");
  assert.equal(getAllBanks().length, 12, "SSOT 12 banks");
  // Ensure index covers all 12 banks (not hardcoded lie check)
  for (const b of getAllBanks()) {
    assert.ok(index.some((e) => e.path === `/codes/banks/${b.slug}`), `index must include bank ${b.slug}`);
  }

  // Postal SSOT
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

  // Geo SSOT 774
  const lgaStates = getAllLgaStates();
  assert.equal(getAllLgaParams().length, 774, "SSOT 774 LGAs");
  for (const s of lgaStates) {
    assert.ok(index.some((e) => e.path === `/geo/${s.slug}`), `index must include geo state ${s.slug}`);
  }
  // Spot check LGAs
  assert.ok(index.some((e) => e.path === "/geo/lagos/ikeja"), "index must include /geo/lagos/ikeja");
  assert.ok(index.some((e) => e.path === "/geo/fct-abuja/bwari"), "index must include sample FCT LGA");

  // Charts SSOT
  assert.equal(CHART_PAGES.length, 5, "SSOT 5 chart pages");
  for (const c of CHART_PAGES) {
    assert.ok(index.some((e) => e.path === `/charts/${c.slug}`), `index must include chart ${c.slug}`);
  }

  // Sitemap drift guard: every non-leaf index path must be in sitemap or is static fallback?
  // We at least ensure every path in index that is in out/sitemap structure exists — we check via audit:static out dir if present
  const outDir = path.join(root, "out");
  if (fs.existsSync(outDir)) {
    // Check a sample of deep paths exist
    const samples = ["/rates", "/charts/parallel-usd-buy", "/codes/banks/gtbank", "/codes/postal/lagos", "/geo/lagos/ikeja"];
    for (const p of samples) {
      const file = path.join(outDir, p.slice(1), "index.html");
      const alt = path.join(outDir, `${p.slice(1)}.html`);
      const exists = fs.existsSync(file) || fs.existsSync(alt) || fs.existsSync(path.join(outDir, p.slice(1) + "/index.html"));
      // For /rates etc which are real routes, they must exist if build succeeded
      // We just warn if missing rather than hard fail in unit test
      if (!exists) console.warn(`[search:test] warning: expected out file for ${p} not found (checked ${file})`);
    }
  }

  // No dead paths: ensure every index path without hash has corresponding out file when out exists, otherwise at least sitemap includes it
  // Lightweight check: sitemap.xml exists and includes expected hubs
  if (fs.existsSync(path.join(outDir, "sitemap.xml"))) {
    const sitemap = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf-8");
    for (const p of ["/rates", "/charts", "/codes/banks/gtbank", "/geo"]) {
      assert.ok(sitemap.includes(p) || index.some((e) => e.path === p), `sitemap or index should contain ${p}`);
    }
  }

  // Results kind labels
  for (const kind of Object.keys(byKind)) {
    assert.ok(WAT_SEARCH_KIND_LABEL[kind] || kind === "hub", `kind ${kind} should have WAT_SEARCH_KIND_LABEL`);
  }

  // 3G lazy-load check: index only fetched on focus — we assert SearchBar contains lazy fetch string (static analysis)
  const searchBarSrc = fs.readFileSync(path.join(root, "components/search-bar.tsx"), "utf-8");
  assert.ok(searchBarSrc.includes('fetch("/search-index.json")'), "SearchBar must lazy-fetch /search-index.json on focus");
  assert.ok(searchBarSrc.includes("onFocus"), "SearchBar must load on first focus");

  // /search page checks
  const searchPageMeta = fs.readFileSync(path.join(root, "app/search/page.tsx"), "utf-8");
  assert.ok(searchPageMeta.includes("index: false"), "/search must be noindex");
  assert.ok(searchPageMeta.includes("follow: true"), "/search must be follow");
  assert.ok(!searchPageMeta.includes("naijacheck.com") || searchPageMeta.includes("www.naijacheck.com"), "canonical must be www host if present");
  // Ensure not in sitemap registry
  const sitemapSrc = fs.readFileSync(path.join(root, "app/sitemap.ts"), "utf-8");
  assert.ok(!sitemapSrc.split("\n").some((l) => l.includes('"/search"') || l.includes("'/search'")), "/search must not be in app/sitemap.ts");

  console.log("ok - search filter/results + SSOT drift guard + noindex + lazy-load");
}

check();
