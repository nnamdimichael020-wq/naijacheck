import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import postalRaw from "../data/postal-codes.json";
import {
  CURATED_POSTAL_LEAVES,
  POSTAL_FILE_NOTES,
  POSTAL_FILE_UPDATED_AT,
  POSTAL_GEOPOLITICAL_ZONES,
  getAggregatedStateSources,
  getAllPostalAreaParams,
  getAllPostalStateSlugs,
  getAllPostalStates,
  getPostalPlace,
  getPostalState,
  getPostalZone,
  postalPlaceCount,
  postalStateCount,
} from "./postal";
import { getPostalAreaExtras } from "./postal-area-extras";
import { getLga, getLgaState } from "./lgas";
import { getAirportBySlug } from "./airports";
import { getPortBySlug } from "./ports";
import { getOilGasOperatorBySlug } from "./oil-gas";
import { rankedSearch } from "./search";

const root = path.resolve(__dirname, "..");

function run() {
  // 1) Raw JSON <-> normalized SSOT parity (zero silent drops, zero unsourced rows)
  const rawStates = (postalRaw as { states: Array<{ slug: string; places: Array<{ name: string; code: string; sources?: Array<{ label: string; url: string }> }> }> }).states;
  assert.equal(rawStates.length, 37, "data/postal-codes.json must contain all 36 states + FCT (37)");
  assert.equal(postalStateCount(), 37, "normalized postalStateCount() must equal 37");
  assert.equal(getAllPostalStateSlugs().length, 37, "getAllPostalStateSlugs() must return 37 slugs");

  const rawPlaceTotal = rawStates.reduce((sum, s) => sum + s.places.length, 0);
  assert.equal(
    postalPlaceCount(),
    rawPlaceTotal,
    `postalPlaceCount() (${postalPlaceCount()}) must equal raw JSON place count (${rawPlaceTotal}) — zero unsourced or malformed rows`,
  );
  assert.ok(postalPlaceCount() >= 250, `Phase 6 must deepen archive well past 77 places; got ${postalPlaceCount()}`);
  assert.equal(POSTAL_FILE_UPDATED_AT, "2026-10-24", "postal-codes.json updatedAt must be 2026-10-24");
  assert.ok(POSTAL_FILE_NOTES && POSTAL_FILE_NOTES.includes("not every street"), "top-level notes must carry honest coverage notice");

  // 2) Every state & every 6-digit code must be well-formed, citably sourced, and free of placeholder bloat
  const states = getAllPostalStates();
  const zoneTotals = new Map<string, number>();

  for (const s of states) {
    assert.match(s.headOfficeCode, /^\d{6}$/, `${s.slug} headOfficeCode must be 6 digits`);
    assert.notEqual(s.headOfficeCode, "000000", `${s.slug} headOfficeCode must never be 000000`);
    assert.equal(s.lastVerified, "2026-10-24", `${s.slug} lastVerified must be updated to 2026-10-24`);
    assert.ok(s.sources.length >= 1, `${s.slug} must have at least one state-level public source`);
    assert.ok(s.places.length >= 5, `${s.slug} must go beyond capital-only coverage (>= 5 verified places, got ${s.places.length})`);
    assert.ok(getLgaState(s.slug), `${s.slug} must match 1:1 with /geo/${s.slug} state slug`);

    const z = getPostalZone(s.slug);
    assert.ok(z && POSTAL_GEOPOLITICAL_ZONES.includes(z), `${s.slug} must map to a valid geopolitical zone`);
    zoneTotals.set(s.geopoliticalZone, (zoneTotals.get(s.geopoliticalZone) ?? 0) + 1);

    const seenSlugs = new Set<string>();
    const expectedSourceUrls = new Set<string>(s.sources.map((src) => src.url));

    for (const p of s.places) {
      assert.match(p.code, /^\d{6}$/, `${s.slug}/${p.name} code "${p.code}" must be 6 digits`);
      assert.notEqual(p.code, "000000", `${s.slug}/${p.name} must not use placeholder 000000`);
      const firstDigit = Number(p.code[0]);
      assert.ok(firstDigit >= 1 && firstDigit <= 9, `${s.slug}/${p.name} first digit must be NIPOST region 1–9`);

      assert.ok(p.slug && /^[a-z0-9-]+$/.test(p.slug), `${s.slug}/${p.name} must have clean slug`);
      assert.ok(!seenSlugs.has(p.slug!), `duplicate place slug "${p.slug}" inside state "${s.slug}"`);
      seenSlugs.add(p.slug!);

      assert.ok(p.sources && p.sources.length >= 1, `${s.slug}/${p.slug} (${p.code}) MUST cite >= 1 public source`);
      for (const src of p.sources!) {
        assert.ok(src.label.length >= 4, `${s.slug}/${p.slug} source label must be descriptive`);
        assert.match(src.url, /^https?:\/\//, `${s.slug}/${p.slug} source URL must be http(s)`);
        expectedSourceUrls.add(src.url);
      }
    }

    // Verify getAggregatedStateSources preserves 100% of distinct state + place source URLs (no .slice(0, 5) truncation)
    const agg = getAggregatedStateSources(s);
    const aggUrls = new Set(agg.map((a) => a.url));
    for (const url of expectedSourceUrls) {
      assert.ok(aggUrls.has(url), `${s.slug} aggregated on-page sources must include ${url}`);
    }
  }

  // Geopolitical zone distribution across Nigeria's 36 states + FCT
  assert.equal(zoneTotals.get("South-West"), 6);
  assert.equal(zoneTotals.get("South-East"), 5);
  assert.equal(zoneTotals.get("South-South"), 6);
  assert.equal(zoneTotals.get("North-Central"), 7); // 6 states + FCT
  assert.equal(zoneTotals.get("North-West"), 7);
  assert.equal(zoneTotals.get("North-East"), 6);

  // 3) Key multi-source conflicts must be documented honestly in notes
  assert.match(getPostalState("ebonyi")!.notes ?? "", /480001|840001/, "Ebonyi must document 480xxx vs 840001 conflict");
  assert.match(getPostalPlace("lagos", "ajah")!.place.notes ?? "", /105101.*101245|101245.*105101/, "Ajah must document 105101 vs 101245 split");
  assert.match(getPostalPlace("lagos", "apapa")!.place.notes ?? "", /102272.*10125|10125.*102272/, "Apapa must document 102272 vs 101251-101254");
  assert.match(getPostalPlace("rivers", "eleme")!.place.notes ?? "", /501101/, "Eleme must document 504101 vs 501101");
  assert.match(getPostalPlace("niger", "suleja")!.place.notes ?? "", /900105.*910101|910101.*900105/, "Suleja must document 900105 vs 910101");

  // 4) Curated leaves: strictly 20 high-intent districts/cities, 100% bespoke content & verified cross-links
  const leaves = getAllPostalAreaParams();
  assert.equal(CURATED_POSTAL_LEAVES.length, 20, "CURATED_POSTAL_LEAVES must contain 20 high-intent leaves");
  assert.equal(leaves.length, 20, "all 20 curated leaves must resolve in postal-codes.json");
  assert.equal(getPostalPlace("lagos", "ikeja")?.place.code, "100271", "lagos/ikeja curated leaf must resolve to 100271 (not GPO 100001)");
  assert.equal(getPostalPlace("rivers", "port-harcourt")?.place.code, "500272", "rivers/port-harcourt curated leaf must resolve to 500272");
  assert.equal(getPostalPlace("abia", "aba")?.place.code, "450101", "abia/aba curated leaf must resolve to 450101");
  assert.equal(getPostalPlace("anambra", "onitsha")?.place.code, "430001", "anambra/onitsha curated leaf must resolve to 430001");

  const uniqueIntros = new Set<string>();
  for (const { state, area } of leaves) {
    const extra = getPostalAreaExtras(state, area);
    assert.ok(extra, `curated leaf ${state}/${area} must have bespoke areaExtras`);
    assert.ok(extra!.intro.length >= 90, `${state}/${area} intro must be substantive`);
    assert.ok(!uniqueIntros.has(extra!.intro), `${state}/${area} intro must be unique (no swapped templates)`);
    uniqueIntros.add(extra!.intro);
    assert.ok(extra!.bullets.length >= 3, `${state}/${area} must have >= 3 neighbour/code bullets`);
    assert.ok(extra!.faqExtra.q.length > 10 && extra!.faqExtra.a.length > 30, `${state}/${area} must have bespoke FAQ`);
    assert.ok(extra!.crossLinks.length >= 1, `${state}/${area} must include >= 1 verified local cross-link`);

    for (const cl of extra!.crossLinks) {
      if (cl.href.startsWith("/geo/")) {
        const [, , gState, gLga] = cl.href.split("/");
        assert.ok(getLga(gState, gLga), `${state}/${area} crossLink ${cl.href} must resolve in data/lgas.json`);
      } else if (cl.href.startsWith("/airports/")) {
        const slug = cl.href.replace("/airports/", "");
        assert.ok(getAirportBySlug(slug), `${state}/${area} crossLink ${cl.href} must resolve in data/airports.json`);
      } else if (cl.href.startsWith("/ports/")) {
        const slug = cl.href.replace("/ports/", "");
        assert.ok(getPortBySlug(slug), `${state}/${area} crossLink ${cl.href} must resolve in data/ports.json`);
      } else if (cl.href.startsWith("/oil-gas/")) {
        const slug = cl.href.replace("/oil-gas/", "");
        assert.ok(getOilGasOperatorBySlug(slug), `${state}/${area} crossLink ${cl.href} must resolve in data/oil-gas-operators.json`);
      } else {
        assert.equal(cl.href, "/codes/banks", `unexpected crossLink target ${cl.href}`);
      }
    }
  }

  // 5) Search index coverage for newly added verified places across Nigeria
  const indexPath = path.join(root, "public", "search-index.json");
  assert.ok(fs.existsSync(indexPath), "public/search-index.json must exist");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as Parameters<typeof rankedSearch>[0];

  for (const [query, expectedPath] of [
    ["Sango-Ota", "/codes/postal/ogun"],
    ["Ijebu-Ode", "/codes/postal/ogun"],
    ["Nsukka", "/codes/postal/enugu"],
    ["Ogbomosho", "/codes/postal/oyo"],
    ["Bonny Island", "/codes/postal/rivers"],
    ["Potiskum", "/codes/postal/yobe"],
    ["Auchi", "/codes/postal/edo"],
    ["Wuse II", "/codes/postal/fct-abuja"],
    ["Ajah", "/codes/postal/lagos/ajah"],
    ["Aba", "/codes/postal/abia/aba"],
    ["Onitsha", "/codes/postal/anambra/onitsha"],
    ["Kubwa", "/codes/postal/fct-abuja/kubwa"],
  ] as const) {
    const hits = rankedSearch(index, query, "postal", 8);
    assert.ok(
      hits.some((h) => h.path === expectedPath),
      `rankedSearch("${query}", "postal") must surface ${expectedPath}; got [${hits.map((h) => h.path).join(", ")}]`,
    );
  }

  // 6) Static export HTML verification when out/ is present
  const outDir = path.join(root, "out");
  const resolveOutHtml = (rel: string) => {
    for (const cand of [path.join(outDir, `${rel}.html`), path.join(outDir, rel, "index.html")]) {
      if (fs.existsSync(cand)) return fs.readFileSync(cand, "utf-8").replace(/<!--[\s\S]*?-->/g, "");
    }
    return null;
  };
  const hubHtml = resolveOutHtml("codes/postal");
  if (hubHtml) {
    assert.ok(hubHtml.includes("not every street"), "/codes/postal HTML must render explicit honest coverage notice");
    assert.ok(hubHtml.includes(`${postalPlaceCount()} verified places`), "/codes/postal HTML must show exact verified place count");

    const ogunHtml = resolveOutHtml("codes/postal/ogun")!;
    assert.ok(ogunHtml.includes("112001") && ogunHtml.includes("Sango-Ota"), "/codes/postal/ogun HTML must render Sango-Ota 112001");
    assert.ok(ogunHtml.includes("https://nigeriazipcode.com/ogun/"), "/codes/postal/ogun HTML must render citable source URL");

    const lagosHtml = resolveOutHtml("codes/postal/lagos")!;
    assert.ok(lagosHtml.includes("https://apartments.ng/blog/article/lagos-postal-codes-comprehensive-area-guide-apartmentsng-b1536"), "/codes/postal/lagos must render all distinct place sources without .slice(0, 5) truncation");
    assert.ok(lagosHtml.includes("/ports/lagos-apapa-port"), "/codes/postal/lagos must cross-link Lagos seaports");
    assert.ok(lagosHtml.includes("/airports/lagos-murtala-muhammed"), "/codes/postal/lagos must cross-link Lagos airport");

    const abaLeafHtml = resolveOutHtml("codes/postal/abia/aba")!;
    assert.ok(abaLeafHtml.includes("450101") && abaLeafHtml.includes("Ariaria"), "/codes/postal/abia/aba HTML must render 450101 & Ariaria context");
    assert.ok(!/<title>[^<]*\|\s*NaijaCheck[^<]*\|\s*NaijaCheck/i.test(abaLeafHtml), "leaf title must not duplicate | NaijaCheck");
  }

  console.log(
    `ok - postal SSOT verified: ${postalStateCount()} states/FCT, ${postalPlaceCount()} sourced places, ${leaves.length} curated leaves, 0 invented codes`,
  );
}

run();
