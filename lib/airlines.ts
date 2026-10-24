import airlinesRaw from "@/data/airlines.json";

export type AirlineStatus =
  | "operating"
  | "suspended"
  | "ceased"
  | "merged"
  | "rebranded"
  | "unknown";

export type AirlineSourceKind = "primary" | "secondary";

export type AirlineSource = {
  label: string;
  url: string;
  kind?: AirlineSourceKind;
};

export type Airline = {
  slug: string;
  name: string;
  fullLegalName?: string;
  formerNames?: string[];
  status: AirlineStatus;
  iata?: string;
  iataHistoricalNote?: string;
  icao?: string;
  callsign?: string;
  yearsActive?: string;
  foundedYear?: number;
  ceasedYear?: number;
  headquartersCity?: string;
  stateSlug: string;
  stateName: string;
  lgaSlug?: string;
  lgaName?: string;
  postalHref?: string;
  postalLabel?: string;
  hubAirportSlugs: string[];
  serviceScope: string;
  statusContext: string;
  website?: string;
  sources: AirlineSource[];
  lastVerified: string;
  verification: "manual";
  notes?: string;
};

type AirlinesFile = {
  updatedAt?: string;
  scope?: string;
  notes?: string;
  hubSources?: unknown;
  airlines: unknown[];
};

const VALID_STATUSES = new Set<AirlineStatus>([
  "operating",
  "suspended",
  "ceased",
  "merged",
  "rebranded",
  "unknown",
]);

const STATUS_SORT_ORDER: Record<AirlineStatus, number> = {
  operating: 0,
  suspended: 1,
  rebranded: 2,
  merged: 3,
  ceased: 4,
  unknown: 5,
};

function isValidSlug(s: unknown): s is string {
  return typeof s === "string" && /^[a-z0-9-]+$/.test(s);
}

function cleanOptionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function normalizeSourceList(raw: unknown): AirlineSource[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is Record<string, unknown> =>
        Boolean(
          x &&
            typeof x === "object" &&
            typeof (x as Record<string, unknown>).label === "string" &&
            typeof (x as Record<string, unknown>).url === "string" &&
            /^https?:\/\//.test((x as Record<string, string>).url.trim()),
        ),
    )
    .map((r): AirlineSource => {
      const kind: AirlineSourceKind | undefined =
        r.kind === "primary" || r.kind === "secondary" ? r.kind : undefined;
      return {
        label: String(r.label).trim(),
        url: String(r.url).trim(),
        kind,
      };
    })
    .filter((s) => s.label.length > 0 && s.url.length > 0);
}

/**
 * IATA airline designators are 2-character uppercase ASCII alphanumeric codes
 * (e.g. P4, QI, U5, VK, OF, Q9, W3, N2, VM, R4, 4U, 9J, WT, B3, Z7, 9H, SO, 5B, IS, VL).
 */
function normalizeAirlineIata(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const up = v.trim().toUpperCase();
  return /^[A-Z0-9]{2}$/.test(up) ? up : undefined;
}

/**
 * ICAO airline designators (Doc 8585) are 3-letter uppercase ASCII codes
 * (e.g. APK, IAN, UNA, FVJ, OLA, GWG, ARA, NIG, NGL, RAN, XEJ, DAN, AZM, NGA, ANP).
 */
function normalizeAirlineIcao(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const up = v.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(up) ? up : undefined;
}

function normalizeOptionalYear(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isInteger(v)) return undefined;
  return v >= 1945 && v <= 2100 ? v : undefined;
}

function normalizeAirline(raw: unknown): Airline | null {
  if (!raw || typeof raw !== "object") return null;
  const cand = raw as Record<string, unknown>;
  if (!isValidSlug(cand.slug)) return null;
  if (typeof cand.name !== "string" || !cand.name.trim()) return null;
  if (typeof cand.status !== "string" || !VALID_STATUSES.has(cand.status as AirlineStatus)) {
    return null;
  }
  if (!isValidSlug(cand.stateSlug)) return null;
  if (typeof cand.stateName !== "string" || !cand.stateName.trim()) return null;
  if (typeof cand.serviceScope !== "string" || !cand.serviceScope.trim()) return null;
  if (typeof cand.statusContext !== "string" || !cand.statusContext.trim()) return null;
  if (typeof cand.lastVerified !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cand.lastVerified)) {
    return null;
  }

  const sources = normalizeSourceList(cand.sources);
  if (sources.length === 0) return null;

  const hubAirportSlugs = Array.isArray(cand.hubAirportSlugs)
    ? cand.hubAirportSlugs.filter((s): s is string => isValidSlug(s)).map((s) => s.trim())
    : [];
  if (hubAirportSlugs.length === 0) return null;

  const iata = normalizeAirlineIata(cand.iata);
  const icao = normalizeAirlineIcao(cand.icao);
  // Every dedicated per-airline page must carry at least one verified aviation designator
  // plus sourced status context and hub airport links so we never ship thin doorway stubs.
  if (!iata && !icao) return null;

  const formerNames = Array.isArray(cand.formerNames)
    ? cand.formerNames
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
        .map((n) => n.trim())
    : undefined;

  const postalHref =
    typeof cand.postalHref === "string" && cand.postalHref.trim().startsWith("/codes/postal/")
      ? cand.postalHref.trim()
      : undefined;

  const website =
    typeof cand.website === "string" && /^https?:\/\//.test(cand.website.trim())
      ? cand.website.trim()
      : undefined;

  return {
    slug: cand.slug.trim(),
    name: cand.name.trim(),
    fullLegalName: cleanOptionalString(cand.fullLegalName),
    formerNames: formerNames && formerNames.length > 0 ? formerNames : undefined,
    status: cand.status as AirlineStatus,
    iata,
    iataHistoricalNote: cleanOptionalString(cand.iataHistoricalNote),
    icao,
    callsign: cleanOptionalString(cand.callsign),
    yearsActive: cleanOptionalString(cand.yearsActive),
    foundedYear: normalizeOptionalYear(cand.foundedYear),
    ceasedYear: normalizeOptionalYear(cand.ceasedYear),
    headquartersCity: cleanOptionalString(cand.headquartersCity),
    stateSlug: cand.stateSlug.trim(),
    stateName: cand.stateName.trim(),
    lgaSlug: isValidSlug(cand.lgaSlug) ? cand.lgaSlug.trim() : undefined,
    lgaName: cleanOptionalString(cand.lgaName),
    postalHref,
    postalLabel: cleanOptionalString(cand.postalLabel),
    hubAirportSlugs,
    serviceScope: cand.serviceScope.trim(),
    statusContext: cand.statusContext.trim(),
    website,
    sources,
    lastVerified: cand.lastVerified,
    verification: "manual",
    notes: cleanOptionalString(cand.notes),
  };
}

const rawFile = airlinesRaw as unknown as AirlinesFile;

const AIRLINES: Airline[] = (rawFile.airlines ?? [])
  .map((a) => normalizeAirline(a))
  .filter((a): a is Airline => a !== null)
  .sort(
    (a, b) =>
      STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status] || a.name.localeCompare(b.name),
  );

const BY_SLUG = new Map<string, Airline>(AIRLINES.map((a) => [a.slug, a]));

const HUB_SOURCES: AirlineSource[] = normalizeSourceList(rawFile.hubSources);

export const AIRLINES_FILE_UPDATED_AT =
  typeof rawFile.updatedAt === "string" ? rawFile.updatedAt : "";

export const AIRLINES_FILE_SCOPE = typeof rawFile.scope === "string" ? rawFile.scope : "";

export const AIRLINES_FILE_NOTES = typeof rawFile.notes === "string" ? rawFile.notes : "";

export function getAllAirlines(): Airline[] {
  return AIRLINES;
}

export function getAllAirlineSlugs(): string[] {
  return AIRLINES.map((a) => a.slug);
}

export function getAirlineBySlug(slug: string): Airline | null {
  return BY_SLUG.get(slug) ?? null;
}

export function getAirlinesByStatus(status: AirlineStatus): Airline[] {
  return AIRLINES.filter((a) => a.status === status);
}

export function getAirlinesByHubAirportSlug(airportSlug: string): Airline[] {
  return AIRLINES.filter((a) => a.hubAirportSlugs.includes(airportSlug));
}

export function getAirlinesHubSources(): AirlineSource[] {
  return HUB_SOURCES;
}

export function airlinesUpdatedAt(): string {
  if (AIRLINES_FILE_UPDATED_AT) return AIRLINES_FILE_UPDATED_AT;
  const dates = AIRLINES.map((a) => a.lastVerified)
    .filter(Boolean)
    .sort();
  return dates.at(-1) ?? "";
}

export function airlineStatusLabel(status: AirlineStatus): string {
  switch (status) {
    case "operating":
      return "Operating (active scheduled carrier)";
    case "suspended":
      return "Suspended (scheduled flights halted)";
    case "ceased":
      return "Ceased operations (historical)";
    case "merged":
      return "Merged (historical)";
    case "rebranded":
      return "Rebranded (historical)";
    case "unknown":
      return "Status unconfirmed";
  }
}

export function airlineStatusShortLabel(status: AirlineStatus): string {
  switch (status) {
    case "operating":
      return "Operating";
    case "suspended":
      return "Suspended";
    case "ceased":
      return "Ceased";
    case "merged":
      return "Merged";
    case "rebranded":
      return "Rebranded";
    case "unknown":
      return "Unconfirmed";
  }
}

export function isHistoricalAirlineStatus(status: AirlineStatus): boolean {
  return status === "ceased" || status === "merged" || status === "rebranded";
}

export function airlineCodeSummary(airline: Pick<Airline, "iata" | "icao">): string {
  if (airline.iata && airline.icao) return `${airline.iata} / ${airline.icao}`;
  if (airline.iata) return `IATA ${airline.iata}`;
  if (airline.icao) return `ICAO ${airline.icao}`;
  return "Nigeria airline";
}

export function getAirlinesStats() {
  let operating = 0;
  let suspended = 0;
  let ceased = 0;
  let historicalOther = 0;
  let withIata = 0;
  let withIcao = 0;
  const states = new Set<string>();
  const hubAirports = new Set<string>();

  for (const a of AIRLINES) {
    if (a.status === "operating") operating += 1;
    else if (a.status === "suspended") suspended += 1;
    else if (a.status === "ceased") ceased += 1;
    else if (a.status === "merged" || a.status === "rebranded") historicalOther += 1;

    if (a.iata) withIata += 1;
    if (a.icao) withIcao += 1;
    states.add(a.stateSlug);
    for (const h of a.hubAirportSlugs) hubAirports.add(h);
  }

  return {
    total: AIRLINES.length,
    operating,
    suspended,
    ceased,
    historicalTotal: ceased + historicalOther,
    withIata,
    withIcao,
    statesCovered: states.size,
    hubAirportsLinked: hubAirports.size,
  };
}
