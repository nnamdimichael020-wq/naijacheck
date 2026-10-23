import assert from "node:assert/strict";
import {
  AIRPORTS_FILE_NOTES,
  AIRPORTS_FILE_SCOPE,
  AIRPORTS_FILE_UPDATED_AT,
  airportTypeLabel,
  airportsUpdatedAt,
  getAirportBySlug,
  getAirportsByState,
  getAirportsHubSources,
  getAirportsStats,
  getAllAirportSlugs,
  getAllAirports,
  isKnownAirportSlug,
} from "./airports";
import { getAllPostalAreaParams, getPostalState } from "./postal";
import { getLga, getLgaState } from "./lgas";

// 1) Dataset scope, honesty & hub sources
assert.ok(
  AIRPORTS_FILE_UPDATED_AT && /^\d{4}-\d{2}-\d{2}$/.test(AIRPORTS_FILE_UPDATED_AT),
  "updatedAt must be ISO YYYY-MM-DD",
);
assert.equal(airportsUpdatedAt(), AIRPORTS_FILE_UPDATED_AT);
assert.ok(AIRPORTS_FILE_SCOPE && AIRPORTS_FILE_SCOPE.length >= 80, "Dataset scope must be explicitly documented");
assert.ok(AIRPORTS_FILE_NOTES && AIRPORTS_FILE_NOTES.length >= 80, "Dataset notes must explain classification honesty");
assert.ok(
  !/every airstrip in nigeria|all airstrips in nigeria|complete list of every airport/i.test(AIRPORTS_FILE_SCOPE),
  "Dataset scope must never claim to cover every airstrip in Nigeria",
);

const hubSources = getAirportsHubSources();
assert.ok(hubSources.length >= 4, "Hub sources must include primary FAAN & NCAA references");
assert.ok(
  hubSources.some((s) => s.kind === "primary" && s.url.includes("faan.gov.ng")),
  "Hub sources must cite official faan.gov.ng as primary",
);
assert.ok(
  hubSources.some((s) => s.kind === "primary" && s.url.includes("ncaa.gov.ng")),
  "Hub sources must cite official ncaa.gov.ng as primary",
);

// 2) Core 24 public commercial airports SSOT integrity
const airports = getAllAirports();
const stats = getAirportsStats();

assert.equal(airports.length, 24, "Phase 2 SSOT lists 24 verified public commercial airports");
assert.equal(getAllAirportSlugs().length, 24);
assert.equal(stats.total, 24);
assert.equal(stats.international, 7, "7 federally designated scheduled international passenger gateways");
assert.equal(stats.domestic, 17, "17 major domestic commercial airports");
assert.equal(stats.withIcao, 24, "All 24 airports have verified 4-letter Nigerian DN* ICAO indicators");
assert.equal(stats.withIata, 23, "23 airports have verified global 3-letter IATA codes; 1 omits unassigned global IATA");

const slugs = new Set<string>();
const iataSet = new Set<string>();
const icaoSet = new Set<string>();
const opsNotes = new Set<string>();

const validPostalLeafSet = new Set(getAllPostalAreaParams().map(({ state, area }) => `/codes/postal/${state}/${area}`));

for (const airport of airports) {
  assert.ok(!slugs.has(airport.slug), `Duplicate airport slug ${airport.slug}`);
  slugs.add(airport.slug);
  assert.equal(getAirportBySlug(airport.slug)?.name, airport.name);
  assert.ok(isKnownAirportSlug(airport.slug));

  // Real ISO date & manual verification
  assert.match(airport.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${airport.slug} must have real ISO lastVerified`);
  assert.equal(airport.verification, "manual", `${airport.slug} verification must be manual`);

  // Type label helper
  const label = airportTypeLabel(airport.type);
  assert.ok(label === "International" || label === "Domestic");

  // IATA (optional — never guessed; if present, 3 uppercase letters & globally unique in SSOT)
  if (airport.iata !== undefined) {
    assert.match(airport.iata, /^[A-Z]{3}$/, `${airport.slug} IATA ${airport.iata} must be 3 uppercase letters`);
    assert.ok(!iataSet.has(airport.iata), `Duplicate IATA code ${airport.iata}`);
    iataSet.add(airport.iata);
  } else {
    assert.equal(
      airport.slug,
      "anambra-chinua-achebe",
      "Only anambra-chinua-achebe omits global IATA (documented ANA conflict)",
    );
  }

  // ICAO (Nigeria civil aerodromes carry DNxx 4-letter location indicators)
  assert.ok(airport.icao, `${airport.slug} must carry verified ICAO code`);
  assert.match(airport.icao, /^DN[A-Z]{2}$/, `${airport.slug} ICAO ${airport.icao} must be valid Nigerian DNxx indicator`);
  assert.ok(!icaoSet.has(airport.icao), `Duplicate ICAO code ${airport.icao}`);
  icaoSet.add(airport.icao);

  // Substantive non-boilerplate context (no thin doorway pages)
  assert.ok(airport.operator && airport.operator.length >= 20, `${airport.slug} must carry sourced operator`);
  assert.ok(airport.runwayNote && airport.runwayNote.length >= 25, `${airport.slug} must carry sourced runwayNote`);
  assert.ok(
    airport.operationsNote && airport.operationsNote.length >= 60,
    `${airport.slug} must carry substantive operationsNote`,
  );
  assert.ok(!opsNotes.has(airport.operationsNote), `${airport.slug} operationsNote must be unique`);
  opsNotes.add(airport.operationsNote);

  // Sources must all carry http(s) URLs and explicit primary/secondary classification
  assert.ok(airport.sources.length >= 2, `${airport.slug} must cite at least 2 public sources`);
  for (const src of airport.sources) {
    assert.match(src.url, /^https?:\/\//, `${airport.slug} source URL must be http(s)`);
    assert.ok(
      src.kind === "primary" || src.kind === "secondary",
      `${airport.slug} source "${src.label}" must declare kind: primary | secondary`,
    );
  }

  // Geo cross-links must resolve strictly to real static routes in data/lgas.json
  const lgaState = getLgaState(airport.stateSlug);
  assert.ok(lgaState, `${airport.slug} stateSlug ${airport.stateSlug} must match a state in data/lgas.json`);
  assert.equal(airport.stateName, lgaState.name, `${airport.slug} stateName must match canonical state name`);

  if (airport.lgaSlug) {
    const lga = getLga(airport.stateSlug, airport.lgaSlug);
    assert.ok(
      lga,
      `${airport.slug} lgaSlug ${airport.lgaSlug} must resolve to /geo/${airport.stateSlug}/${airport.lgaSlug}`,
    );
  }

  // Postal cross-links must resolve strictly to real static routes in data/postal-codes.json
  if (airport.postalHref) {
    const parts = airport.postalHref.replace(/^\/codes\/postal\//, "").split("/");
    if (parts.length === 1) {
      assert.ok(getPostalState(parts[0]), `${airport.slug} postalHref ${airport.postalHref} must match a valid postal state`);
    } else if (parts.length === 2) {
      assert.ok(
        validPostalLeafSet.has(airport.postalHref),
        `${airport.slug} postalHref ${airport.postalHref} must match an allowlisted static postal leaf`,
      );
    } else {
      assert.fail(`Unexpected postalHref shape ${airport.postalHref}`);
    }
  }
}

// Delta State has 2 distinct public commercial airports (Asaba ABB/DNAS and Osubi QRW/DNSU)
assert.equal(getAirportsByState("delta").length, 2, "Delta State has Asaba and Osubi airports");
assert.equal(getAirportBySlug("lagos-murtala-muhammed")?.iata, "LOS");
assert.equal(getAirportBySlug("abuja-nnamdi-azikiwe")?.iata, "ABV");
assert.equal(isKnownAirportSlug("non-existent-airport"), false);

console.log(
  `[airports:test] OK — ${stats.total} airports (${stats.international} international, ${stats.domestic} domestic; ${stats.withIata} IATA, ${stats.withIcao} ICAO across ${stats.statesCovered} states/FCT), 0 invented codes (${airportsUpdatedAt()}).`,
);
