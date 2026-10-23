import assert from "node:assert/strict";
import {
  OIL_GAS_FILE_NOTES,
  OIL_GAS_FILE_SCOPE,
  OIL_GAS_FILE_UPDATED_AT,
  getAllOilGasOperatorSlugs,
  getAllOilGasOperators,
  getOilGasHubSources,
  getOilGasOperatorBySlug,
  getOilGasOperatorsByState,
  getOilGasOperatorsByType,
  getOilGasStats,
  oilGasUpdatedAt,
  operatorSegmentLabel,
  operatorTypeLabel,
  operatorTypeShortLabel,
} from "./oil-gas";
import { getAirportBySlug } from "./airports";
import { getLga, getLgaState } from "./lgas";
import { getAllPostalAreaParams, getPostalState } from "./postal";

// 1) Dataset scope, non-goals & hub regulatory sources
assert.ok(
  OIL_GAS_FILE_UPDATED_AT && /^\d{4}-\d{2}-\d{2}$/.test(OIL_GAS_FILE_UPDATED_AT),
  "updatedAt must be ISO YYYY-MM-DD",
);
assert.equal(oilGasUpdatedAt(), OIL_GAS_FILE_UPDATED_AT);
assert.ok(OIL_GAS_FILE_SCOPE && OIL_GAS_FILE_SCOPE.length >= 100, "Dataset scope must be explicitly documented");
assert.ok(OIL_GAS_FILE_NOTES && OIL_GAS_FILE_NOTES.length >= 100, "Dataset notes must document PIA & 2024-2025 divestments");
assert.ok(
  !/every filling station|all oil companies in nigeria|complete list of every operator/i.test(OIL_GAS_FILE_SCOPE),
  "Scope must never falsely claim every filling station or contractor in Nigeria",
);

const hubSources = getOilGasHubSources();
assert.ok(hubSources.length >= 5, "Hub sources must include primary NUPRC, NMDPRA, NNPC & NGX links");
assert.ok(
  hubSources.some((s) => s.kind === "primary" && s.url.includes("nuprc.gov.ng")),
  "Hub sources must cite nuprc.gov.ng as primary",
);
assert.ok(
  hubSources.some((s) => s.kind === "primary" && s.url.includes("nmdpra.gov.ng")),
  "Hub sources must cite nmdpra.gov.ng as primary",
);

// 2) Core 16 major oil & gas operators SSOT integrity
const operators = getAllOilGasOperators();
const stats = getOilGasStats();

assert.equal(operators.length, 16, "Phase 3 SSOT curates 16 verified major oil & gas operators");
assert.equal(getAllOilGasOperatorSlugs().length, 16);
assert.equal(stats.total, 16);
assert.equal(stats.noc, 1, "1 National Oil Company (NNPC Limited)");
assert.equal(stats.ioc, 5, "5 International Oil Company groups active in Nigeria");
assert.equal(stats.jv, 1, "1 Incorporated LNG Joint Venture (Nigeria LNG Limited)");
assert.equal(stats.independent, 9, "9 Indigenous upstream, refining & downstream operators");
assert.equal(getOilGasOperatorsByType("noc").length, 1);
assert.equal(getOilGasOperatorsByType("ioc").length, 5);
assert.equal(getOilGasOperatorsByType("jv").length, 1);
assert.equal(getOilGasOperatorsByType("independent").length, 9);

const validPostalLeafSet = new Set(getAllPostalAreaParams().map(({ state, area }) => `/codes/postal/${state}/${area}`));
const slugs = new Set<string>();
const summaries = new Set<string>();

for (const op of operators) {
  assert.ok(!slugs.has(op.slug), `Duplicate operator slug ${op.slug}`);
  slugs.add(op.slug);
  assert.equal(getOilGasOperatorBySlug(op.slug)?.name, op.name);

  // Real ISO date & manual verification
  assert.match(op.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${op.slug} must have real ISO lastVerified`);
  assert.equal(op.verification, "manual", `${op.slug} verification must be manual`);

  // Valid type & segment labels
  assert.ok(op.type, `${op.slug} must declare a verified operator type`);
  assert.notEqual(operatorTypeLabel(op.type), "Not classified");
  assert.notEqual(operatorTypeShortLabel(op.type), "—");
  assert.ok(op.segment, `${op.slug} must declare a verified value-chain segment`);
  assert.notEqual(operatorSegmentLabel(op.segment), "—");

  // Substantive non-boilerplate content (anti-thin-doorway guard)
  assert.ok(
    op.operationsSummary && op.operationsSummary.length >= 120,
    `${op.slug} must carry substantive operationsSummary (>=120 chars)`,
  );
  assert.ok(!summaries.has(op.operationsSummary), `${op.slug} operationsSummary must be unique`);
  summaries.add(op.operationsSummary);
  assert.ok(op.keyAssets && op.keyAssets.length >= 2, `${op.slug} must list at least 2 verified key assets/subsidiaries`);

  // No stock advice or crude price predictions inside SSOT fields
  const combinedCopy = [op.operationsSummary, ...(op.keyAssets ?? []), op.listingStatus ?? "", op.notes ?? ""].join(" ");
  assert.ok(
    !/\b(?:buy shares|strong buy|target share price|brent price forecast)\b/i.test(combinedCopy),
    `${op.slug} must never include stock tips or price forecasts`,
  );

  // Every row requires >= 2 citable primary/secondary public sources with https URLs
  assert.ok(op.sources.length >= 2, `${op.slug} must cite at least 2 public sources`);
  for (const src of op.sources) {
    assert.match(src.url, /^https?:\/\//, `${op.slug} source URL must be http(s)`);
    assert.ok(
      src.kind === "primary" || src.kind === "secondary",
      `${op.slug} source "${src.label}" must declare kind: primary | secondary`,
    );
  }
  assert.ok(
    op.sources.some((s) => s.kind === "primary"),
    `${op.slug} must include at least one primary official corporate/regulatory/exchange source`,
  );

  if (op.website) {
    assert.match(op.website, /^https?:\/\//, `${op.slug} website must be http(s)`);
  }

  // Geo cross-links must resolve strictly to real static routes in data/lgas.json
  if (op.stateSlug) {
    const lgaState = getLgaState(op.stateSlug);
    assert.ok(lgaState, `${op.slug} stateSlug ${op.stateSlug} must match a state in data/lgas.json`);
    assert.equal(op.stateName, lgaState.name, `${op.slug} stateName must match canonical state name`);

    if (op.lgaSlug) {
      const lga = getLga(op.stateSlug, op.lgaSlug);
      assert.ok(lga, `${op.slug} lgaSlug ${op.lgaSlug} must resolve to /geo/${op.stateSlug}/${op.lgaSlug}`);
    }
  }

  // Postal cross-links must resolve strictly to real static routes in data/postal-codes.json
  if (op.postalHref) {
    const parts = op.postalHref.replace(/^\/codes\/postal\//, "").split("/");
    if (parts.length === 1) {
      assert.ok(getPostalState(parts[0]), `${op.slug} postalHref ${op.postalHref} must match postal state`);
    } else {
      assert.ok(
        validPostalLeafSet.has(op.postalHref),
        `${op.slug} postalHref ${op.postalHref} must match a generated static postal district route`,
      );
    }
  }

  // Airport cross-links must resolve strictly to verified airports in data/airports.json
  for (const aSlug of op.airportSlugs ?? []) {
    assert.ok(getAirportBySlug(aSlug), `${op.slug} airportSlug ${aSlug} must resolve in lib/airports.ts`);
  }
}

// 3) Key post-divestment corporate reality assertions
const nnpc = getOilGasOperatorBySlug("nnpc-limited");
assert.ok(nnpc && nnpc.type === "noc" && nnpc.headquartersCity === "Abuja");

const shell = getOilGasOperatorBySlug("shell-nigeria");
assert.ok(shell && shell.type === "ioc" && /SNEPCo/.test(shell.fullLegalName ?? ""));

const renaissance = getOilGasOperatorBySlug("renaissance-africa-energy");
assert.ok(renaissance && renaissance.type === "independent" && renaissance.headquartersCity === "Port Harcourt");
assert.ok(renaissance.alternateNames?.some((n) => /SPDC/i.test(n)), "Renaissance indexes SPDC divestment alias");

const seplat = getOilGasOperatorBySlug("seplat-energy");
assert.ok(seplat && seplat.type === "independent" && /SEPNU/.test(seplat.fullLegalName ?? ""));

const oando = getOilGasOperatorBySlug("oando");
assert.ok(oando && oando.type === "independent" && oando.alternateNames?.some((n) => /NAOC/i.test(n)));

const nlng = getOilGasOperatorBySlug("nigeria-lng");
assert.ok(nlng && nlng.type === "jv" && nlng.segment === "midstream" && nlng.headquartersCity === "Port Harcourt");

const dangote = getOilGasOperatorBySlug("dangote-refinery");
assert.ok(dangote && dangote.segment === "downstream" && dangote.lgaSlug === "ibeju-lekki");

assert.ok(getOilGasOperatorsByState("rivers").length >= 2, "Rivers State hosts NLNG & Renaissance HQs");
assert.ok(getOilGasOperatorsByState("lagos").length >= 12, "Lagos hosts majority of IOC & indigenous corporate HQs");

console.log(
  `[oil-gas:test] OK — ${stats.total} operators (${stats.noc} NOC, ${stats.ioc} IOCs, ${stats.jv} JV, ${stats.independent} indigenous) across ${stats.hqCities} HQ cities verified`,
);
