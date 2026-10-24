/**
 * Unit & static-export audit test for Phase 4 Nigerian Airlines Reference:
 *  - SSOT integrity (`data/airlines.json` + `lib/airlines.ts`)
 *  - Strict status sourcing (`operating`, `suspended`, `ceased`), non-empty citations, and manual lastVerified
 *  - Valid 2-char IATA / 3-letter ICAO designators, omitted unconfirmed IATA codes, and historical IATA recycling notes
 *  - Verified cross-links to `lib/airports.ts`, `lib/lgas.ts`, and `lib/postal.ts`
 *  - Anti-booking / anti-live-schedule guardrails + built `out/airlines/**` HTML & JSON-LD checks when exported
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AIRLINES_FILE_SCOPE,
  AIRLINES_FILE_UPDATED_AT,
  airlineCodeSummary,
  airlineStatusLabel,
  airlineStatusShortLabel,
  airlinesUpdatedAt,
  getAirlineBySlug,
  getAirlinesByHubAirportSlug,
  getAirlinesByStatus,
  getAirlinesHubSources,
  getAirlinesStats,
  getAllAirlineSlugs,
  getAllAirlines,
  isHistoricalAirlineStatus,
} from "./airlines";
import { getAirportBySlug } from "./airports";
import { getLga, getLgaState } from "./lgas";
import { getPostalPlace, getPostalState } from "./postal";

function stripHtmlCommentsAndDecode(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

function run() {
  const root = path.resolve(__dirname, "..");
  const airlines = getAllAirlines();
  const stats = getAirlinesStats();
  const slugs = getAllAirlineSlugs();

  console.log("[airlines:test] stats:", stats);

  // 1) Core dataset counts & metadata
  assert.equal(AIRLINES_FILE_UPDATED_AT, "2026-10-24", "airlines SSOT updatedAt must be 2026-10-24");
  assert.equal(airlinesUpdatedAt(), "2026-10-24");
  assert.ok(AIRLINES_FILE_SCOPE.includes("23 verified"), "scope documents 23 verified scheduled airlines");
  assert.ok(getAirlinesHubSources().length >= 3, "hub must cite NCAA, IATA, and FAAN sources");

  assert.equal(airlines.length, 23, "expected 23 verified Nigerian scheduled airlines");
  assert.equal(stats.total, 23);
  assert.equal(stats.operating, 11, "11 active scheduled passenger airlines");
  assert.equal(stats.suspended, 2, "2 suspended scheduled passenger airlines (Dana Air, Azman Air)");
  assert.equal(stats.ceased, 10, "10 ceased/historical scheduled passenger airlines");
  assert.equal(stats.historicalTotal, 10);
  assert.equal(stats.withIata, 21, "21 airlines carry verified 2-char IATA designators; 2 omit unassigned IATA");
  assert.equal(stats.withIcao, 23, "all 23 airlines carry verified 3-letter ICAO designators");

  // Unique slugs & ICAO codes; unique IATA codes among active + suspended carriers
  assert.equal(new Set(slugs).size, airlines.length, "airline slugs must be unique");
  const allIcaos = airlines.map((a) => a.icao).filter(Boolean);
  assert.equal(new Set(allIcaos).size, allIcaos.length, "3-letter ICAO designators must be unique across archive");

  const nonHistoricalIatas = airlines
    .filter((a) => !isHistoricalAirlineStatus(a.status) && a.iata)
    .map((a) => a.iata!);
  assert.equal(
    new Set(nonHistoricalIatas).size,
    nonHistoricalIatas.length,
    "active and suspended carriers must never collide on 2-character IATA designators",
  );

  // Explicit verification of key carriers, suspended carriers, omitted IATA codes, and recycled IATA codes
  const airPeace = getAirlineBySlug("air-peace")!;
  assert.equal(airPeace.status, "operating");
  assert.equal(airPeace.iata, "P4");
  assert.equal(airPeace.icao, "APK");

  const ibomAir = getAirlineBySlug("ibom-air")!;
  assert.equal(ibomAir.status, "operating");
  assert.equal(ibomAir.iata, "QI");
  assert.equal(ibomAir.icao, "IAN");

  const maxAir = getAirlineBySlug("max-air")!;
  assert.equal(maxAir.status, "operating", "Max Air resumed domestic operations after March 2025 NCAA audit");
  assert.equal(maxAir.iata, "VM");
  assert.equal(maxAir.icao, "NGL");

  const xejet = getAirlineBySlug("xejet")!;
  assert.equal(xejet.status, "operating");
  assert.equal(xejet.iata, "4U");
  assert.equal(xejet.icao, "XEJ");

  const danaAir = getAirlineBySlug("dana-air")!;
  assert.equal(danaAir.status, "suspended", "Dana Air must NOT be falsely marked operating while AOC is suspended");
  assert.equal(danaAir.iata, "9J");

  const azmanAir = getAirlineBySlug("azman-air")!;
  assert.equal(azmanAir.status, "suspended", "Azman Air must NOT be falsely marked operating while suspended");
  assert.equal(azmanAir.iata, undefined, "Azman Air omits active IATA designator cleanly");
  assert.equal(azmanAir.icao, "AZM");

  const firstNation = getAirlineBySlug("first-nation-airways")!;
  assert.equal(firstNation.status, "ceased");
  assert.equal(firstNation.iata, undefined, "First Nation Airways omits unassigned IATA designator cleanly");
  assert.equal(firstNation.icao, "FRN");

  const valueJet = getAirlineBySlug("valuejet")!;
  const airNigeria = getAirlineBySlug("air-nigeria")!;
  assert.equal(valueJet.iata, "VK");
  assert.equal(airNigeria.iata, "VK");
  assert.ok(
    airNigeria.iataHistoricalNote && airNigeria.iataHistoricalNote.includes("ValueJet"),
    "historical VK carrier Air Nigeria must explain IATA reassignment to ValueJet",
  );

  // 2) Per-airline source, date, cross-link & anti-fluff guards
  for (const a of airlines) {
    assert.equal(a.verification, "manual");
    assert.match(a.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `valid lastVerified on ${a.slug}`);
    assert.ok(a.sources.length >= 2, `${a.slug} must cite at least 2 verified public sources`);
    for (const s of a.sources) {
      assert.match(s.url, /^https?:\/\//, `valid source URL on ${a.slug}`);
      assert.ok(s.label.length >= 8, `descriptive source label on ${a.slug}`);
    }
    if (a.iata !== undefined) {
      assert.match(a.iata, /^[A-Z0-9]{2}$/, `${a.slug} IATA code must be 2 uppercase chars`);
    }
    if (a.icao !== undefined) {
      assert.match(a.icao, /^[A-Z]{3}$/, `${a.slug} ICAO code must be 3 uppercase letters`);
    }
    assert.ok(a.serviceScope.length >= 45, `${a.slug} must include substantive serviceScope`);
    assert.ok(a.statusContext.length >= 60, `${a.slug} must include sourced statusContext`);
    assert.ok(airlineStatusLabel(a.status).length > 0);
    assert.ok(airlineStatusShortLabel(a.status).length > 0);
    assert.ok(airlineCodeSummary(a).length >= 2);

    // Every hubAirportSlug MUST resolve to a real airport in data/airports.json
    assert.ok(a.hubAirportSlugs.length >= 1, `${a.slug} must link at least 1 Nigerian hub airport`);
    for (const hubSlug of a.hubAirportSlugs) {
      const ap = getAirportBySlug(hubSlug);
      assert.ok(ap, `${a.slug} references missing airport slug "${hubSlug}"`);
    }

    // State & LGA cross-links MUST resolve in data/lgas.json
    const st = getLgaState(a.stateSlug);
    assert.ok(st, `${a.slug} stateSlug "${a.stateSlug}" must exist in data/lgas.json`);
    assert.equal(a.stateName, st.name, `${a.slug} stateName must match canonical "${st.name}"`);
    if (a.lgaSlug) {
      const lgaHit = getLga(a.stateSlug, a.lgaSlug);
      assert.ok(lgaHit, `${a.slug} lgaSlug "${a.stateSlug}/${a.lgaSlug}" must exist in data/lgas.json`);
    }

    // Postal href MUST resolve to a real static postal route
    if (a.postalHref) {
      const segs = a.postalHref.split("/").filter(Boolean);
      assert.equal(segs[0], "codes");
      assert.equal(segs[1], "postal");
      if (segs.length === 3) {
        assert.ok(getPostalState(segs[2]), `${a.slug} postalHref state "${segs[2]}" must exist`);
      } else if (segs.length === 4) {
        assert.ok(getPostalPlace(segs[2], segs[3]), `${a.slug} postalHref leaf "${a.postalHref}" must exist`);
      } else {
        assert.fail(`unexpected postalHref depth on ${a.slug}: ${a.postalHref}`);
      }
    }

    // Dead-domain safety: historical/ceased carriers must not expose dead/parked external website links
    if (isHistoricalAirlineStatus(a.status)) {
      assert.equal(a.website, undefined, `ceased airline ${a.slug} should not link to potentially parked domain`);
    }

    // Zero booking, ticket sales, airfares, or "live" claims in SSOT prose
    const blob = `${a.name} ${a.serviceScope} ${a.statusContext} ${a.notes ?? ""}`;
    assert.ok(!/\bbuy tickets\b|\bcheap flights\b|\bbook now\b|\blive flight/i.test(blob), `no booking/live claims in ${a.slug}`);
    assert.ok(!/\blive\b/i.test(blob), `no "live" word in manual airline record ${a.slug}`);
  }

  // 3) Bidirectional airport -> hub airlines lookup
  assert.ok(
    getAirlinesByHubAirportSlug("lagos-murtala-muhammed").some((a) => a.slug === "air-peace"),
    "LOS lists Air Peace as hub carrier",
  );
  assert.ok(
    getAirlinesByHubAirportSlug("uyo-victor-attah").some((a) => a.slug === "ibom-air"),
    "QUO lists Ibom Air as hub carrier",
  );
  assert.ok(
    getAirlinesByHubAirportSlug("enugu-akanu-ibiam").some((a) => a.slug === "united-nigeria-airlines"),
    "ENU lists United Nigeria Airlines as hub carrier",
  );
  assert.ok(
    getAirlinesByHubAirportSlug("benin-airport").some((a) => a.slug === "okada-air"),
    "BNI lists historical pioneer Okada Air",
  );
  assert.equal(getAirlinesByStatus("operating").length, 11);
  assert.equal(getAirlinesByStatus("suspended").length, 2);
  assert.equal(getAirlinesByStatus("ceased").length, 10);

  // 4) Static export verification when `out/` is built
  const outDir = path.join(root, "out");
  const hubHtmlPath = fs.existsSync(path.join(outDir, "airlines.html"))
    ? path.join(outDir, "airlines.html")
    : path.join(outDir, "airlines", "index.html");

  if (fs.existsSync(hubHtmlPath)) {
    const rawHubHtml = fs.readFileSync(hubHtmlPath, "utf-8");
    const hubHtml = stripHtmlCommentsAndDecode(rawHubHtml);
    assert.ok(hubHtml.includes("Airlines in Nigeria"), "hub HTML renders H1");
    assert.ok(hubHtml.includes("Operating (11)"), "hub HTML renders Operating (11) filter");
    assert.ok(hubHtml.includes("Suspended (2)"), "hub HTML renders Suspended (2) filter");
    assert.ok(hubHtml.includes("Ceased or historical (10)"), "hub HTML renders Ceased or historical (10) filter");
    assert.ok(hubHtml.includes('"@type":"CollectionPage"') && hubHtml.includes('"@type":"ItemList"'), "hub HTML includes CollectionPage + ItemList JSON-LD");
    assert.ok(hubHtml.includes("/airports/lagos-murtala-muhammed"), "hub HTML links to LOS airport profile");
    assert.ok(!/\bbuy tickets\b|\bbook cheap flights\b/i.test(hubHtml), "hub HTML never pitches ticket sales");

    for (const a of airlines) {
      const leafPath = fs.existsSync(path.join(outDir, "airlines", `${a.slug}.html`))
        ? path.join(outDir, "airlines", `${a.slug}.html`)
        : path.join(outDir, "airlines", a.slug, "index.html");
      assert.ok(fs.existsSync(leafPath), `built static HTML must exist for /airlines/${a.slug}`);
      const leafHtml = stripHtmlCommentsAndDecode(fs.readFileSync(leafPath, "utf-8"));
      assert.ok(leafHtml.includes(a.name), `/airlines/${a.slug} renders airline name`);
      assert.ok(leafHtml.includes('"@type":"Airline"'), `/airlines/${a.slug} includes Airline JSON-LD`);
      assert.ok(
        leafHtml.includes(`/airports/${a.hubAirportSlugs[0]}`),
        `/airlines/${a.slug} cross-links to hub airport /airports/${a.hubAirportSlugs[0]}`,
      );
      assert.ok(
        leafHtml.includes(`/geo/${a.stateSlug}`),
        `/airlines/${a.slug} soft-links to /geo/${a.stateSlug}`,
      );
    }
    console.log(`[airlines:test] verified built static HTML for /airlines + ${airlines.length} airline profiles`);
  }

  console.log("[airlines:test] PASS");
}

run();
