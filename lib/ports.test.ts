/**
 * Unit & SSOT integrity test suite for Nigerian Seaports & Marine Terminals (`/ports` + `/ports/[slug]`).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  formatUnLocodeSpaced,
  getAllPorts,
  getCoastalPortStates,
  getPortBySlug,
  getPortByUnLocode,
  getPortsByCategory,
  getPortsByStateSlug,
  getPortsForAirport,
  getPortsForOilGasOperator,
  getPortsStats,
   getRelatedPorts,
  PORTS_FILE_UPDATED_AT,
  PORTS_HUB_SOURCES,
  PORTS_PREFIX_CHOICE,
  PORTS_SCOPE,
} from "./ports";
import { getAirportBySlug } from "./airports";
import { getOilGasOperatorBySlug } from "./oil-gas";
import { getAllLgaStates } from "./lgas";
import { getAllPostalAreaParams, getAllPostalStates } from "./postal";

const OFFICIAL_UNECE_SEAPORT_LOCODES = new Set([
  "NGAPP",
  "NGTIN",
  "NGLKK",
  "NGONN",
  "NGPHC",
  "NGWAR",
  "NGCBQ",
  "NGBON",
  "NGOBO",
  "NGFOR",
  "NGESC",
  "NGBRA",
]);

function run() {
  const root = path.resolve(__dirname, "..");
  const ports = getAllPorts();
  const stats = getPortsStats();

  // 1) Core archive counts & classification
  assert.equal(PORTS_FILE_UPDATED_AT, "2026-10-24", "SSOT updatedAt must be 2026-10-24");
  assert.ok(PORTS_SCOPE.length > 80, "PORTS_SCOPE must document inclusions & exclusions");
  assert.ok(PORTS_PREFIX_CHOICE.includes("/ports"), "PORTS_PREFIX_CHOICE must document /ports vs /seaports");
  assert.ok(PORTS_HUB_SOURCES.length >= 4, "Hub must cite >= 4 primary maritime/regulatory sources");

  assert.equal(ports.length, 12, "Expected 12 verified Nigerian seaports & major marine terminals");
  assert.equal(stats.total, 12);
  assert.equal(stats.commercialComplexes, 7, "7 NPA public commercial & deep-sea complexes");
  assert.equal(stats.deepSea, 1, "1 operational deep-sea port (Lekki)");
  assert.equal(stats.energyTerminals, 5, "5 major hydrocarbon/LNG export marine terminals");
  assert.equal(stats.withUnLocode, 12, "All 12 entries carry verified UNECE Function-1 UN/LOCODEs");
  assert.equal(stats.statesCovered, 6, "6 coastal states represented");

  assert.equal(getPortsByCategory("deep-sea-port").length, 1);
  assert.equal(getPortsByCategory("commercial-seaport").length, 6);
  assert.equal(getPortsByCategory("energy-terminal").length, 5);

  // 2) Zero invented UN/LOCODEs, operators, or thin doorways
  const slugs = new Set<string>();
  const locodes = new Set<string>();
  const lgaStates = getAllLgaStates();
  const validPostalRoutes = new Set<string>([
    ...getAllPostalStates().map((s) => `/codes/postal/${s.slug}`),
    ...getAllPostalAreaParams().map((p) => `/codes/postal/${p.state}/${p.area}`),
  ]);

  for (const p of ports) {
    assert.match(p.slug, /^[a-z0-9-]+$/, `valid slug: ${p.slug}`);
    assert.ok(!slugs.has(p.slug), `duplicate slug: ${p.slug}`);
    slugs.add(p.slug);

    assert.equal(p.lastVerified, "2026-10-24", `${p.slug} lastVerified`);
    assert.equal(p.verification, "manual", `${p.slug} verification must be manual`);
    assert.ok(p.operationsSummary.length >= 150, `${p.slug} must have substantive operationsSummary`);
    assert.ok(p.operator && p.operator.length >= 20, `${p.slug} must document verified operator/governance`);
    assert.ok(p.role && p.role.length >= 15, `${p.slug} must document verified role`);
    assert.ok(p.cargoTypes && p.cargoTypes.length >= 1, `${p.slug} must list verified cargo types`);
    assert.ok(p.sources.length >= 3, `${p.slug} must carry >= 3 cited sources`);
    for (const s of p.sources) {
      assert.match(s.url, /^https:\/\//, `${p.slug} source URL must be HTTPS: ${s.url}`);
    }

    // Strict UN/LOCODE verification against official UNECE Nigeria list
    assert.ok(p.unLocode, `${p.slug} has verified UN/LOCODE`);
    assert.match(p.unLocode!, /^NG[A-Z]{3}$/, `${p.slug} UN/LOCODE format`);
    assert.ok(
      OFFICIAL_UNECE_SEAPORT_LOCODES.has(p.unLocode!),
      `${p.slug} UN/LOCODE ${p.unLocode} must belong to official UNECE Nigeria seaport registry`,
    );
    assert.ok(!locodes.has(p.unLocode!), `duplicate UN/LOCODE: ${p.unLocode}`);
    locodes.add(p.unLocode!);

    // Cross-link integrity against /geo, /codes/postal, /airports, and /oil-gas SSOTs
    const geoState = lgaStates.find((st) => st.slug === p.stateSlug);
    assert.ok(geoState, `${p.slug} stateSlug ${p.stateSlug} must exist in data/lgas.json`);
    assert.equal(p.stateName, geoState!.name, `${p.slug} stateName must match canonical geo state name`);
    if (p.lgaSlug) {
      const geoLga = geoState!.lgas.find((l) => l.slug === p.lgaSlug);
      assert.ok(geoLga, `${p.slug} lgaSlug ${p.stateSlug}/${p.lgaSlug} must exist in data/lgas.json`);
      assert.equal(p.lgaName, geoLga!.name, `${p.slug} lgaName must match canonical LGA name`);
    }
    if (p.postalHref) {
      assert.ok(
        validPostalRoutes.has(p.postalHref),
        `${p.slug} postalHref ${p.postalHref} must resolve to an exported postal route`,
      );
    }
    for (const apSlug of p.relatedAirportSlugs ?? []) {
      assert.ok(getAirportBySlug(apSlug), `${p.slug} relatedAirportSlug ${apSlug} must exist in data/airports.json`);
    }
    for (const ogSlug of p.relatedOilGasSlugs ?? []) {
      assert.ok(
        getOilGasOperatorBySlug(ogSlug),
        `${p.slug} relatedOilGasSlug ${ogSlug} must exist in data/oil-gas-operators.json`,
      );
    }
  }

  // 3) Unbuilt greenfield port proposals must NOT appear as active entries
  for (const unbuilt of ["ibom-deep-sea-port", "badagry-deep-sea-port", "ondo-deep-sea-port", "bakassi-deep-sea-port"]) {
    assert.equal(getPortBySlug(unbuilt), undefined, `unbuilt project ${unbuilt} must not be listed as active port`);
  }

  // 4) Lookup & bidirectional helper checks
  assert.equal(getPortBySlug("lagos-apapa-port")?.unLocode, "NGAPP");
  assert.equal(getPortBySlug("lekki-deep-sea-port")?.unLocode, "NGLKK");
  assert.equal(getPortBySlug("onne-port")?.unLocode, "NGONN");
  assert.equal(getPortByUnLocode("ng app")?.slug, "lagos-apapa-port");
  assert.equal(getPortByUnLocode("NGLKK")?.slug, "lekki-deep-sea-port");
  assert.equal(formatUnLocodeSpaced("NGONN"), "NG ONN");
  assert.equal(formatUnLocodeSpaced(undefined), null);

  assert.equal(getPortsByStateSlug("lagos").length, 3, "Lagos hosts Apapa, Tin Can & Lekki");
  assert.equal(getPortsByStateSlug("rivers").length, 3, "Rivers hosts Onne, Port Harcourt & Bonny");
  assert.equal(getPortsByStateSlug("delta").length, 3, "Delta hosts Warri/Delta, Forcados & Escravos");

  const losPorts = getPortsForAirport("lagos-murtala-muhammed");
  assert.ok(losPorts.some((p) => p.slug === "lagos-apapa-port") && losPorts.some((p) => p.slug === "lekki-deep-sea-port"));
  const phcPorts = getPortsForAirport("port-harcourt-international");
  assert.ok(phcPorts.some((p) => p.slug === "onne-port") && phcPorts.some((p) => p.slug === "rivers-port-port-harcourt"));
  assert.equal(getPortsForAirport("abuja-nnamdi-azikiwe").length, 0, "Inland Abuja airport has zero forced port links");

  const nlngPorts = getPortsForOilGasOperator("nigeria-lng");
  assert.deepEqual(nlngPorts.map((p) => p.slug), ["bonny-island-terminal"]);
  const seplatPorts = getPortsForOilGasOperator("seplat-energy");
  assert.ok(seplatPorts.some((p) => p.slug === "qua-iboe-terminal"));

  const coastalStates = getCoastalPortStates();
  assert.equal(coastalStates.length, 6);
  assert.equal(getRelatedPorts(getPortBySlug("onne-port")!, 4).length, 4);

  // 5) Static-honesty guard on hub & detail page templates (no ShareControls "live" / "@" trap)
  const hubSrc = fs.readFileSync(path.join(root, "app/ports/page.tsx"), "utf-8");
  const detailSrc = fs.readFileSync(path.join(root, "app/ports/[slug]/page.tsx"), "utf-8");
  assert.ok(hubSrc.includes("CollectionPage") && hubSrc.includes("ItemList"), "Hub includes CollectionPage + ItemList JSON-LD");
  assert.ok(detailSrc.includes("CopyButton"), "Detail page includes CopyButton for UN/LOCODE");

  console.log("[ports:test] PASS — 12 verified Nigerian seaports & marine terminals, 12 UNECE UN/LOCODEs, zero invented codes/operators.");
}

run();
