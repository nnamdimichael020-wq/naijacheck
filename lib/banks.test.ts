import assert from "node:assert/strict";
import {
  BANKS_FILE_SCOPE,
  BANKS_FILE_UPDATED_AT,
  bankLicenceTierShort,
  banksUpdatedAt,
  getAllBanks,
  getAllBankSlugs,
  getBankBySlug,
  getBanksHubSources,
  isKnownBankSlug,
} from "./banks";
import { getAllPostalAreaParams, getPostalState } from "./postal";
import { getLga, getLgaState } from "./lgas";

// 1) Dataset scope & hub methodology sources
assert.ok(BANKS_FILE_UPDATED_AT && /^\d{4}-\d{2}-\d{2}$/.test(BANKS_FILE_UPDATED_AT), "updatedAt must be ISO YYYY-MM-DD");
assert.equal(banksUpdatedAt(), BANKS_FILE_UPDATED_AT);
assert.ok(BANKS_FILE_SCOPE && BANKS_FILE_SCOPE.length >= 60, "Dataset scope must be explicitly documented");
assert.ok(
  !/complete list of every bank/i.test(BANKS_FILE_SCOPE),
  "Dataset scope must never claim to be a complete list of every bank ever",
);
assert.ok(!/endorsed by cbn|cbn endorsed/i.test(BANKS_FILE_SCOPE), "Dataset scope must never claim CBN endorsement");

const hubSources = getBanksHubSources();
assert.ok(hubSources.length >= 2, "Hub sources must include primary CBN references");
assert.ok(
  hubSources.some((s) => s.kind === "primary" && s.url.includes("cbn.gov.ng")),
  "Hub sources must cite official cbn.gov.ng reference as primary",
);

// 2) Core 12 commercial banks SSOT integrity
const banks = getAllBanks();
assert.equal(banks.length, 12, "Phase 1 SSOT lists 12 retail commercial banks");
assert.equal(getAllBankSlugs().length, 12);

const slugs = new Set<string>();
const nipCodes = new Set<string>();
const primaryUssd = new Set<string>();
const statusNotes = new Set<string>();

const validPostalLeafSet = new Set(getAllPostalAreaParams().map(({ state, area }) => `/codes/postal/${state}/${area}`));

let intlCount = 0;
let natlCount = 0;

for (const bank of banks) {
  assert.ok(!slugs.has(bank.slug), `Duplicate bank slug ${bank.slug}`);
  slugs.add(bank.slug);
  assert.equal(getBankBySlug(bank.slug)?.name, bank.name);
  assert.ok(isKnownBankSlug(bank.slug));

  // Real ISO date, manual verification
  assert.match(bank.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${bank.slug} must have real ISO lastVerified`);
  assert.equal(bank.verification, "manual", `${bank.slug} verification must be manual`);

  // Sort codes: 3-digit NIP + matching 9-digit head-office prefix where present
  const nip = bank.sortCodes.find((s) => s.type === "nip");
  assert.ok(nip && /^\d{3}$/.test(nip.code), `${bank.slug} must have 3-digit NIP sort code`);
  assert.ok(!nipCodes.has(nip.code), `Duplicate NIP code ${nip.code}`);
  nipCodes.add(nip.code);

  const headOffice = bank.sortCodes.find((s) => s.type === "head-office");
  if (headOffice) {
    assert.match(headOffice.code, /^\d{9}$/, `${bank.slug} head-office sort code must be 9 digits`);
    assert.equal(
      headOffice.code.slice(0, 3),
      nip.code,
      `${bank.slug} 9-digit head-office sort code ${headOffice.code} must begin with NIP ${nip.code}`,
    );
  }

  // Primary USSD
  const mainUssd = bank.ussd[0]?.code ?? "";
  assert.match(mainUssd, /^\*\d+#$/, `${bank.slug} primary USSD ${mainUssd} must match *digits#`);
  assert.ok(!primaryUssd.has(mainUssd), `Duplicate primary USSD ${mainUssd}`);
  primaryUssd.add(mainUssd);

  // Headquarters, legal name, licence & non-duplicate status context
  assert.ok(bank.fullLegalName && bank.fullLegalName.length >= 8, `${bank.slug} must carry sourced fullLegalName`);
  assert.ok(bank.headquarters && bank.headquarters.length >= 15, `${bank.slug} must carry sourced headquarters`);
  assert.ok(bank.headquartersCity && bank.headquartersCity.includes("Lagos"), `${bank.slug} must carry headquartersCity`);
  assert.ok(bank.officialWebsite && bank.officialWebsite.startsWith("https://"), `${bank.slug} must carry https officialWebsite`);

  const tier = bankLicenceTierShort(bank.licenceType);
  assert.ok(tier === "International" || tier === "National", `${bank.slug} licenceType must resolve to International or National`);
  if (tier === "International") intlCount += 1;
  if (tier === "National") natlCount += 1;

  assert.ok(bank.statusNote && bank.statusNote.length >= 40, `${bank.slug} must have substantive statusNote`);
  assert.ok(!statusNotes.has(bank.statusNote), `${bank.slug} statusNote must be unique (no boilerplate swap)`);
  statusNotes.add(bank.statusNote);

  // Every bank must cite primary official bank page + primary CBN list + labelled secondary cross-checks
  const primarySources = bank.sources.filter((s) => s.kind === "primary");
  const secondarySources = bank.sources.filter((s) => s.kind === "secondary");
  assert.ok(primarySources.length >= 2, `${bank.slug} must have at least 2 primary official sources (bank + CBN)`);
  assert.ok(
    primarySources.some((s) => s.url.includes("cbn.gov.ng")),
    `${bank.slug} must cite official cbn.gov.ng DMB list`,
  );
  const officialHost = new URL(bank.officialWebsite).hostname.replace(/^www\./, "");
  assert.ok(
    primarySources.some((s) => s.url.includes(officialHost)),
    `${bank.slug} must cite its own official domain (${officialHost}) in primary sources`,
  );
  assert.equal(
    primarySources.length + secondarySources.length,
    bank.sources.length,
    `${bank.slug} every source must explicitly declare kind: primary | secondary`,
  );

  // Internal postal + geo links must resolve to real static routes
  if (bank.headquartersLinks?.postalHref) {
    const pHref = bank.headquartersLinks.postalHref;
    const parts = pHref.replace(/^\/codes\/postal\//, "").split("/");
    if (parts.length === 1) {
      assert.ok(getPostalState(parts[0]), `${bank.slug} postalHref ${pHref} must match a valid postal state`);
    } else if (parts.length === 2) {
      assert.ok(validPostalLeafSet.has(pHref), `${bank.slug} postalHref ${pHref} must match an allowlisted static postal leaf`);
    } else {
      assert.fail(`Unexpected postalHref shape ${pHref}`);
    }
  }
  if (bank.headquartersLinks?.geoHref) {
    const gHref = bank.headquartersLinks.geoHref;
    const parts = gHref.replace(/^\/geo\//, "").split("/");
    if (parts.length === 1) {
      assert.ok(getLgaState(parts[0]), `${bank.slug} geoHref ${gHref} must match a valid geo state`);
    } else if (parts.length === 2) {
      assert.ok(getLga(parts[0], parts[1]), `${bank.slug} geoHref ${gHref} must match a valid LGA route`);
    } else {
      assert.fail(`Unexpected geoHref shape ${gHref}`);
    }
  }
}

assert.equal(intlCount, 7, "7 CBN International-Authorization commercial banks");
assert.equal(natlCount, 5, "5 CBN National-Authorization commercial banks");
assert.equal(bankLicenceTierShort(undefined), "Unverified");
assert.equal(isKnownBankSlug("non-existent-bank"), false);

console.log(
  `[banks:test] OK — ${banks.length} commercial banks (${intlCount} International, ${natlCount} National), 100% primary-cited HQ/legal/licence/codes verified (${banksUpdatedAt()}).`,
);
