import airportsRaw from "@/data/airports.json";

export type AirportType = "international" | "domestic";

export type AirportSourceKind = "primary" | "secondary";

export type AirportSource = {
  label: string;
  url: string;
  kind?: AirportSourceKind;
};

export type Airport = {
  slug: string;
  name: string;
  alternateNames?: string[];
  city: string;
  locality?: string;
  stateSlug: string;
  stateName: string;
  lgaSlug?: string;
  lgaName?: string;
  postalHref?: string;
  postalLabel?: string;
  type: AirportType;
  iata?: string;
  icao?: string;
  operator?: string;
  runwayNote?: string;
  operationsNote?: string;
  sources: AirportSource[];
  lastVerified: string;
  verification: "manual";
  notes?: string;
};

type AirportsFile = {
  updatedAt?: string;
  scope?: string;
  notes?: string;
  hubSources?: unknown;
  airports: unknown[];
};

function isValidSlug(s: unknown): s is string {
  return typeof s === "string" && /^[a-z0-9-]+$/.test(s);
}

function cleanOptionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function normalizeSourceList(raw: unknown): AirportSource[] {
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
    .map((r): AirportSource => {
      const kind: AirportSourceKind | undefined =
        r.kind === "primary" || r.kind === "secondary" ? r.kind : undefined;
      return {
        label: String(r.label).trim(),
        url: String(r.url).trim(),
        kind,
      };
    })
    .filter((s) => s.label.length > 0 && s.url.length > 0);
}

function normalizeIata(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const up = v.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(up) ? up : undefined;
}

function normalizeIcao(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const up = v.trim().toUpperCase();
  return /^[A-Z]{4}$/.test(up) ? up : undefined;
}

function normalizeAirport(raw: unknown): Airport | null {
  if (!raw || typeof raw !== "object") return null;
  const cand = raw as Record<string, unknown>;
  if (!isValidSlug(cand.slug)) return null;
  if (typeof cand.name !== "string" || !cand.name.trim()) return null;
  if (typeof cand.city !== "string" || !cand.city.trim()) return null;
  if (!isValidSlug(cand.stateSlug)) return null;
  if (typeof cand.stateName !== "string" || !cand.stateName.trim()) return null;
  if (cand.type !== "international" && cand.type !== "domestic") return null;
  if (typeof cand.lastVerified !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cand.lastVerified)) {
    return null;
  }

  const sources = normalizeSourceList(cand.sources);
  if (sources.length === 0) return null;

  const iata = normalizeIata(cand.iata);
  const icao = normalizeIcao(cand.icao);
  // Every dedicated per-airport page must carry at least one verified aviation identifier (IATA or ICAO)
  // plus substantive operational context so we never ship thin doorway stubs.
  if (!iata && !icao) return null;

  const alternateNames = Array.isArray(cand.alternateNames)
    ? cand.alternateNames
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
        .map((n) => n.trim())
    : undefined;

  const postalHref =
    typeof cand.postalHref === "string" && cand.postalHref.trim().startsWith("/codes/postal/")
      ? cand.postalHref.trim()
      : undefined;

  return {
    slug: cand.slug.trim(),
    name: cand.name.trim(),
    alternateNames: alternateNames && alternateNames.length > 0 ? alternateNames : undefined,
    city: cand.city.trim(),
    locality: cleanOptionalString(cand.locality),
    stateSlug: cand.stateSlug.trim(),
    stateName: cand.stateName.trim(),
    lgaSlug: isValidSlug(cand.lgaSlug) ? cand.lgaSlug.trim() : undefined,
    lgaName: cleanOptionalString(cand.lgaName),
    postalHref,
    postalLabel: cleanOptionalString(cand.postalLabel),
    type: cand.type,
    iata,
    icao,
    operator: cleanOptionalString(cand.operator),
    runwayNote: cleanOptionalString(cand.runwayNote),
    operationsNote: cleanOptionalString(cand.operationsNote),
    sources,
    lastVerified: cand.lastVerified,
    verification: "manual",
    notes: cleanOptionalString(cand.notes),
  };
}

const rawFile = airportsRaw as unknown as AirportsFile;

// Sort international gateways first (Lagos, Abuja, Kano, Port Harcourt, Enugu, Uyo, Maiduguri by city/name),
// or provide A-Z helpers. Here we sort A-Z by city then airport name for fast table scanning.
const AIRPORTS: Airport[] = (rawFile.airports ?? [])
  .map((a) => normalizeAirport(a))
  .filter((a): a is Airport => a !== null)
  .sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));

const BY_SLUG = new Map<string, Airport>(AIRPORTS.map((a) => [a.slug, a]));

const HUB_SOURCES: AirportSource[] = normalizeSourceList(rawFile.hubSources);

export const AIRPORTS_FILE_UPDATED_AT: string | undefined = cleanOptionalString(rawFile.updatedAt);
export const AIRPORTS_FILE_SCOPE: string | undefined = cleanOptionalString(rawFile.scope);
export const AIRPORTS_FILE_NOTES: string | undefined = cleanOptionalString(rawFile.notes);

export function getAllAirports(): Airport[] {
  return AIRPORTS;
}

export function getAirportsHubSources(): AirportSource[] {
  return HUB_SOURCES;
}

export function getAllAirportSlugs(): string[] {
  return AIRPORTS.map((a) => a.slug);
}

export function getAirportBySlug(slug: string): Airport | undefined {
  return BY_SLUG.get(slug);
}

export function isKnownAirportSlug(slug: string): boolean {
  return BY_SLUG.has(slug);
}

export function getAirportsByState(stateSlug: string): Airport[] {
  return AIRPORTS.filter((a) => a.stateSlug === stateSlug);
}

export function airportTypeLabel(type: AirportType): "International" | "Domestic" {
  return type === "international" ? "International" : "Domestic";
}

export function airportsUpdatedAt(): string {
  const dates = AIRPORTS.map((a) => a.lastVerified).sort();
  return dates[dates.length - 1] ?? AIRPORTS_FILE_UPDATED_AT ?? "2026-10-23";
}

export function getAirportsStats(): {
  total: number;
  international: number;
  domestic: number;
  withIata: number;
  withIcao: number;
  statesCovered: number;
} {
  let international = 0;
  let domestic = 0;
  let withIata = 0;
  let withIcao = 0;
  const states = new Set<string>();
  for (const a of AIRPORTS) {
    if (a.type === "international") international += 1;
    else domestic += 1;
    if (a.iata) withIata += 1;
    if (a.icao) withIcao += 1;
    states.add(a.stateSlug);
  }
  return {
    total: AIRPORTS.length,
    international,
    domestic,
    withIata,
    withIcao,
    statesCovered: states.size,
  };
}
