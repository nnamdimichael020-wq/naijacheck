import { LIVE_FEEDS, LIVE_FUEL, LIVE_FX, LIVE_HEALTH, LIVE_TRENDS, LIVE_WATCH } from "@/lib/live";
import { FUEL, PRICES_META, TELECOM, EXAM } from "@/lib/data";

export type VerificationState = "live" | "recent" | "stale" | "seeded" | "manual" | "unavailable";

export type DatasetRecord = {
  id: string;
  label: string;
  geography: string;
  productType: string;
  unit?: string;
  sourceName: string;
  sourceUrl?: string;
  method: string;
  licenceNotes: string;
  sourceTime: string | null;
  checkedAt: string | null;
  lastSuccessfulAt: string | null;
  cadence: string;
  staleAfterHours: number;
  state: VerificationState;
  limitation: string;
};

const ageHours = (iso: string | null) => (iso ? (Date.now() - Date.parse(iso)) / 3_600_000 : Infinity);

function monitoredState(seeded: boolean | undefined, sourceTime: string | null, healthKey: string, staleAfterHours: number, recordedState?: VerificationState): VerificationState {
  if (recordedState === "seeded" || recordedState === "unavailable") return recordedState;
  if (seeded) return "seeded";
  const health = LIVE_HEALTH[healthKey];
  if (!sourceTime) return "unavailable";
  if (!health?.ok || ageHours(sourceTime) > staleAfterHours) return "stale";
  return ageHours(sourceTime) <= 4 ? "live" : "recent";
}

/** Registry for changing datasets shown by shared live components. Editorial datasets remain manual. */
export const DATASET_REGISTRY: DatasetRecord[] = [
  {
    id: "cbn-usd",
    label: "CBN NFEM USD/NGN closing rate",
    geography: "Nigeria",
    productType: "official foreign-exchange closing rate",
    unit: "NGN per USD",
    sourceName: LIVE_FX.officialSource?.label ?? "Central Bank of Nigeria",
    sourceUrl: LIVE_FX.officialSource?.url,
    method: "Parsed from the CBN exchange-rate page; this is not a parallel-market quote.",
    licenceNotes: "Public official page; attribution and link retained.",
    sourceTime: LIVE_FX.officialAsOf,
    checkedAt: LIVE_HEALTH.cbn?.checkedAt ?? LIVE_FX.checkedAt,
    lastSuccessfulAt: LIVE_HEALTH.cbn?.lastSuccessfulAt ?? (LIVE_HEALTH.cbn?.ok ? LIVE_HEALTH.cbn.checkedAt : null),
    cadence: "Attempted every 3 hours; changes depend on CBN publication and deployment.",
    staleAfterHours: 36,
    state: monitoredState(LIVE_FX.seeded, LIVE_FX.officialAsOf, "cbn", 36, LIVE_FX.officialStatus),
    limitation: "GBP/EUR reference cross-rates are separate and must not be described as CBN quotes.",
  },
  {
    id: "reference-cross-rates",
    label: "USD-based reference cross-rates",
    geography: "Global reference / NGN",
    productType: "third-party reference FX, not a CBN or parallel-market quote",
    unit: "currency units per USD",
    sourceName: LIVE_FX.crossRateSource?.label ?? "open.er-api.com",
    sourceUrl: LIVE_FX.crossRateSource?.url,
    method: "Parsed independently from open.er-api; never used to overwrite CBN or parallel-market timestamps.",
    licenceNotes: "Public API response; provider terms and attribution retained.",
    sourceTime: LIVE_FX.crossRateAsOf ?? null,
    checkedAt: LIVE_HEALTH.openEr?.checkedAt ?? LIVE_FX.checkedAt,
    lastSuccessfulAt: LIVE_HEALTH.openEr?.lastSuccessfulAt ?? (LIVE_HEALTH.openEr?.ok ? LIVE_HEALTH.openEr.checkedAt : null),
    cadence: "Attempted every 3 hours; upstream normally updates daily.",
    staleAfterHours: 36,
    state: monitoredState(LIVE_FX.seeded, LIVE_FX.crossRateAsOf ?? null, "openEr", 36, LIVE_FX.crossRateStatus),
    limitation: "Reference cross-rate only; do not label as the CBN NFEM rate or a dealer quote.",
  },
  {
    id: "parallel-fx",
    label: "Indicative parallel-market quote",
    geography: "Nigeria; no station-level guarantee",
    productType: "third-party parallel-market buy/sell quote",
    unit: "NGN per foreign-currency unit",
    sourceName: LIVE_FX.blackMarketSource?.label ?? "Aboki Forex",
    sourceUrl: LIVE_FX.blackMarketSource?.url,
    method: "Parsed third-party buy/sell quote.",
    licenceNotes: "Public page; no redistribution licence asserted. Attribution and link retained.",
    sourceTime: LIVE_FX.blackMarketAsOf,
    checkedAt: LIVE_HEALTH.aboki?.checkedAt ?? LIVE_FX.checkedAt,
    lastSuccessfulAt: LIVE_HEALTH.aboki?.lastSuccessfulAt ?? (LIVE_HEALTH.aboki?.ok ? LIVE_HEALTH.aboki.checkedAt : null),
    cadence: "Attempted every 3 hours; publication and deployment can delay changes.",
    staleAfterHours: 12,
    state: monitoredState(LIVE_FX.seeded, LIVE_FX.blackMarketAsOf, "aboki", 12, LIVE_FX.blackMarketStatus),
    limitation: "Indicative quote, not a CBN rate and not a guaranteed dealer price.",
  },
  {
    id: "fuel-depot",
    label: "Fuel depot medians",
    geography: "Named Nigerian depots / national median",
    productType: "wholesale depot/gantry price, not retail pump price",
    unit: "NGN per litre (LPG per kg)",
    sourceName: LIVE_FUEL.source?.label ?? "Awajis / petroleumprice.ng",
    sourceUrl: LIVE_FUEL.source?.url,
    method: "Parsed published depot tables and calculated medians.",
    licenceNotes: "Public third-party page; attribution retained; terms should be rechecked before expanding use.",
    sourceTime: LIVE_FUEL.asOf,
    checkedAt: LIVE_HEALTH.awajis?.checkedAt ?? LIVE_FUEL.checkedAt,
    lastSuccessfulAt: LIVE_HEALTH.awajis?.lastSuccessfulAt ?? (LIVE_HEALTH.awajis?.ok ? LIVE_HEALTH.awajis.checkedAt : null),
    cadence: "Attempted every 3 hours; source may publish less often.",
    staleAfterHours: 24,
    state: monitoredState(LIVE_FUEL.seeded, LIVE_FUEL.asOf, "awajis", 24),
    limitation: "Do not use as a station pump price.",
  },
  {
    id: "retail-pump-fuel",
    label: "Retail petrol pump references",
    geography: "Selected Nigerian states",
    productType: "dated manual retail reference, separate from depot wholesale",
    unit: "NGN per litre",
    sourceName: FUEL.sources[0]?.label ?? "Manual source review",
    sourceUrl: FUEL.sources[0]?.url,
    method: "Manually transcribed dated published list; not auto-monitored.",
    licenceNotes: "Linked attribution; re-verify with an official/permitted source before updating.",
    sourceTime: "2026-10-09T12:00:00+01:00",
    checkedAt: null,
    lastSuccessfulAt: null,
    cadence: "Manual only; no reliable permitted daily feed configured.",
    staleAfterHours: 24,
    state: "stale",
    limitation: "Not a live station quote. Never substitute wholesale depot values.",
  },
  {
    id: "food-prices",
    label: "Food price estimates",
    geography: "Explicit legacy rows for Lagos, Onitsha, Kano and Aba only",
    productType: "dated unverified planning estimate",
    unit: "item-specific",
    sourceName: "Legacy editorial estimate file",
    method: "No city scaling is permitted. NBS state/month imports remain separate official survey references.",
    licenceNotes: "Internal estimates; no official status claimed.",
    sourceTime: `${PRICES_META.updatedAt}T12:00:00+01:00`,
    checkedAt: null,
    lastSuccessfulAt: null,
    cadence: "Manual documented update only.",
    staleAfterHours: 0,
    state: "seeded",
    limitation: "Not live, not verified receipts, and not NBS city data. Missing cities are unavailable.",
  },
  {
    id: "telecom-plans",
    label: "Telecom plan references",
    geography: "Nigeria; eligibility varies by subscriber",
    productType: "manual operator-plan reference",
    sourceName: "Operator pages/apps required",
    method: "Manual verification must capture amount, price, validity, eligibility, method, source and check date.",
    licenceNotes: "Link to operator; no automated scraping configured.",
    sourceTime: `${TELECOM.updatedAt}T12:00:00+01:00`,
    checkedAt: null,
    lastSuccessfulAt: null,
    cadence: "Manual; confirm with carrier before purchase.",
    staleAfterHours: 0,
    state: "seeded",
    limitation: "Current rows do not satisfy full offer verification and must not be presented as current offers.",
  },
  {
    id: "exam-admissions",
    label: "JAMB and admissions references",
    geography: "Nigeria / named institutions",
    productType: "manual, session-specific policy reference",
    sourceName: "JAMB and institution official portals required",
    sourceUrl: "https://www.jamb.gov.ng/",
    method: "National, institution and course thresholds require separate official, session-specific verification.",
    licenceNotes: "Official links retained; no automated value changes.",
    sourceTime: `${EXAM.updatedAt}T12:00:00+01:00`,
    checkedAt: null,
    lastSuccessfulAt: null,
    cadence: "Manual per admission session.",
    staleAfterHours: 0,
    state: "seeded",
    limitation: "Reported ranges in the legacy file are not current official cut-offs.",
  },
  {
    id: "government-fees",
    label: "Government fees and timelines",
    geography: "Nigeria",
    productType: "human-reviewed official information",
    sourceName: "Responsible agency public pages",
    sourceUrl: "https://immigration.gov.ng/passports/",
    method: "Official-page fingerprints create review tasks only; values require manual confirmation.",
    licenceNotes: "Public information page; login/payment flows are not scraped.",
    sourceTime: null,
    checkedAt: LIVE_WATCH.checkedAt,
    lastSuccessfulAt: null,
    cadence: "Page change watch every 3 hours; manual value review.",
    staleAfterHours: 0,
    state: "unavailable",
    limitation: "No fee is current until a reviewer records category, effective date, URL and check date.",
  },
  {
    id: "headlines",
    label: "Public news headlines",
    geography: "Nigeria query results",
    productType: "headline feed",
    sourceName: "Google News RSS and original publishers",
    method: "RSS topic queries; links lead to publishers.",
    licenceNotes: "Headlines and links only; no article republication.",
    sourceTime: LIVE_FEEDS.checkedAt,
    checkedAt: LIVE_HEALTH.news?.checkedAt ?? LIVE_FEEDS.checkedAt,
    lastSuccessfulAt: LIVE_HEALTH.news?.lastSuccessfulAt ?? (LIVE_HEALTH.news?.ok ? LIVE_HEALTH.news.checkedAt : null),
    cadence: "Attempted every 3 hours.",
    staleAfterHours: 9,
    state: monitoredState(LIVE_FEEDS.seeded, LIVE_FEEDS.checkedAt, "news", 9),
    limitation: "A headline feed is not an official confirmation of the facts in an article.",
  },
  {
    id: "trend-signals",
    label: "News mentions and Wikipedia pageviews",
    geography: "Nigeria news query / English Wikipedia",
    productType: "attention signals, not social-platform trends",
    sourceName: "Google News RSS and Wikimedia Pageviews API",
    method: LIVE_TRENDS.method ?? "Seven-day public news counts and pageviews.",
    licenceNotes: "Aggregated counts with source attribution.",
    sourceTime: LIVE_TRENDS.checkedAt,
    checkedAt: LIVE_TRENDS.checkedAt,
    lastSuccessfulAt: LIVE_HEALTH.wiki?.lastSuccessfulAt ?? null,
    cadence: "Attempted every 3 hours.",
    staleAfterHours: 12,
    state: LIVE_TRENDS.seeded ? "seeded" : LIVE_TRENDS.terms.length || LIVE_TRENDS.wiki.length ? (ageHours(LIVE_TRENDS.checkedAt) > 12 ? "stale" : "recent") : "unavailable",
    limitation: "Not X or TikTok activity and must not be presented as such.",
  },
  {
    id: "official-page-watch",
    label: "Official-page change watch",
    geography: "Nigeria",
    productType: "page fingerprint requiring human review",
    sourceName: "JAMB, NIMC, NIS and CBN official pages",
    method: "Text fingerprint comparison; a change never edits a fee or cut-off automatically.",
    licenceNotes: "Automated availability/change check only.",
    sourceTime: LIVE_WATCH.checkedAt,
    checkedAt: LIVE_WATCH.checkedAt,
    lastSuccessfulAt: null,
    cadence: "Attempted every 3 hours.",
    staleAfterHours: 24,
    state: LIVE_WATCH.seeded ? "seeded" : Object.keys(LIVE_WATCH.pages ?? {}).length ? "recent" : "unavailable",
    limitation: "A detected change is only a review flag.",
  },
];

export const stateLabel: Record<VerificationState, string> = {
  live: "Live source reading",
  recent: "Recent source reading",
  stale: "Stale — last known value",
  seeded: "Seeded — not monitor-verified",
  manual: "Manual / editorial",
  unavailable: "Unavailable",
};
