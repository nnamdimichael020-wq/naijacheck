import oilGasRaw from "@/data/oil-gas-operators.json";

export type OperatorType = "noc" | "ioc" | "jv" | "independent";

export type OperatorSegment = "upstream" | "midstream" | "downstream" | "integrated";

export type OperatorSourceKind = "primary" | "secondary";

export type OperatorSource = {
  label: string;
  url: string;
  kind?: OperatorSourceKind;
};

export type OilGasOperator = {
  slug: string;
  name: string;
  fullLegalName?: string;
  alternateNames?: string[];
  type?: OperatorType;
  segment?: OperatorSegment;
  focusSummary?: string;
  headquartersCity?: string;
  headquartersLocality?: string;
  stateSlug?: string;
  stateName?: string;
  lgaSlug?: string;
  lgaName?: string;
  postalHref?: string;
  postalLabel?: string;
  operationalHubs?: string[];
  airportSlugs?: string[];
  listingStatus?: string;
  regulatorScope?: string;
  operationsSummary: string;
  keyAssets?: string[];
  website?: string;
  sources: OperatorSource[];
  lastVerified: string;
  verification: "manual";
  notes?: string;
};

type OilGasFile = {
  updatedAt?: string;
  scope?: string;
  notes?: string;
  hubSources?: unknown;
  operators: unknown[];
};

const VALID_TYPES = new Set<OperatorType>(["noc", "ioc", "jv", "independent"]);
const VALID_SEGMENTS = new Set<OperatorSegment>(["upstream", "midstream", "downstream", "integrated"]);

const TYPE_SORT_ORDER: Record<OperatorType, number> = {
  noc: 0,
  ioc: 1,
  jv: 2,
  independent: 3,
};

function isValidSlug(s: unknown): s is string {
  return typeof s === "string" && /^[a-z0-9-]+$/.test(s);
}

function cleanOptionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function cleanStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const cleaned = v
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeSourceList(raw: unknown): OperatorSource[] {
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
    .map((r): OperatorSource => {
      const kind: OperatorSourceKind | undefined =
        r.kind === "primary" || r.kind === "secondary" ? r.kind : undefined;
      return {
        label: String(r.label).trim(),
        url: String(r.url).trim(),
        kind,
      };
    })
    .filter((s) => s.label.length > 0 && s.url.length > 0);
}

function normalizeWebsite(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const clean = v.trim();
  return /^https?:\/\//.test(clean) ? clean : undefined;
}

function normalizeOperator(raw: unknown): OilGasOperator | null {
  if (!raw || typeof raw !== "object") return null;
  const cand = raw as Record<string, unknown>;
  if (!isValidSlug(cand.slug)) return null;
  if (typeof cand.name !== "string" || !cand.name.trim()) return null;
  if (typeof cand.lastVerified !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cand.lastVerified)) {
    return null;
  }

  const sources = normalizeSourceList(cand.sources);
  if (sources.length === 0) return null;

  // Anti-thin-doorway guard: every dedicated /oil-gas/[slug] page must carry a substantive
  // verified operations summary rather than a bare company name + boilerplate stub.
  const operationsSummary = cleanOptionalString(cand.operationsSummary);
  if (!operationsSummary || operationsSummary.length < 80) return null;

  const type =
    typeof cand.type === "string" && VALID_TYPES.has(cand.type as OperatorType)
      ? (cand.type as OperatorType)
      : undefined;

  const segment =
    typeof cand.segment === "string" && VALID_SEGMENTS.has(cand.segment as OperatorSegment)
      ? (cand.segment as OperatorSegment)
      : undefined;

  const postalHref =
    typeof cand.postalHref === "string" && cand.postalHref.trim().startsWith("/codes/postal/")
      ? cand.postalHref.trim()
      : undefined;

  const airportSlugs = Array.isArray(cand.airportSlugs)
    ? cand.airportSlugs.filter((s): s is string => isValidSlug(s)).map((s) => s.trim())
    : undefined;

  return {
    slug: cand.slug.trim(),
    name: cand.name.trim(),
    fullLegalName: cleanOptionalString(cand.fullLegalName),
    alternateNames: cleanStringArray(cand.alternateNames),
    type,
    segment,
    focusSummary: cleanOptionalString(cand.focusSummary),
    headquartersCity: cleanOptionalString(cand.headquartersCity),
    headquartersLocality: cleanOptionalString(cand.headquartersLocality),
    stateSlug: isValidSlug(cand.stateSlug) ? cand.stateSlug.trim() : undefined,
    stateName: cleanOptionalString(cand.stateName),
    lgaSlug: isValidSlug(cand.lgaSlug) ? cand.lgaSlug.trim() : undefined,
    lgaName: cleanOptionalString(cand.lgaName),
    postalHref,
    postalLabel: cleanOptionalString(cand.postalLabel),
    operationalHubs: cleanStringArray(cand.operationalHubs),
    airportSlugs: airportSlugs && airportSlugs.length > 0 ? airportSlugs : undefined,
    listingStatus: cleanOptionalString(cand.listingStatus),
    regulatorScope: cleanOptionalString(cand.regulatorScope),
    operationsSummary,
    keyAssets: cleanStringArray(cand.keyAssets),
    website: normalizeWebsite(cand.website),
    sources,
    lastVerified: cand.lastVerified,
    verification: "manual",
    notes: cleanOptionalString(cand.notes),
  };
}

const rawFile = oilGasRaw as unknown as OilGasFile;

// Sort NOC first, then IOCs (A-Z), then Incorporated JV, then Indigenous Independents (A-Z)
// so national and international benchmarks sit cleanly beside major Nigerian operators.
const OPERATORS: OilGasOperator[] = (rawFile.operators ?? [])
  .map((o) => normalizeOperator(o))
  .filter((o): o is OilGasOperator => o !== null)
  .sort((a, b) => {
    const ta = a.type ? TYPE_SORT_ORDER[a.type] : 99;
    const tb = b.type ? TYPE_SORT_ORDER[b.type] : 99;
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

const BY_SLUG = new Map<string, OilGasOperator>(OPERATORS.map((o) => [o.slug, o]));

const HUB_SOURCES: OperatorSource[] = normalizeSourceList(rawFile.hubSources);

export const OIL_GAS_FILE_UPDATED_AT: string =
  typeof rawFile.updatedAt === "string" && rawFile.updatedAt.trim() ? rawFile.updatedAt.trim() : "";

export const OIL_GAS_FILE_SCOPE: string =
  typeof rawFile.scope === "string" && rawFile.scope.trim() ? rawFile.scope.trim() : "";

export const OIL_GAS_FILE_NOTES: string =
  typeof rawFile.notes === "string" && rawFile.notes.trim() ? rawFile.notes.trim() : "";

export function getAllOilGasOperators(): OilGasOperator[] {
  return OPERATORS;
}

export function getOilGasOperatorBySlug(slug: string): OilGasOperator | null {
  return BY_SLUG.get(slug) ?? null;
}

export function getAllOilGasOperatorSlugs(): string[] {
  return OPERATORS.map((o) => o.slug);
}

export function getOilGasOperatorsByType(type: OperatorType): OilGasOperator[] {
  return OPERATORS.filter((o) => o.type === type);
}

export function getOilGasOperatorsByState(stateSlug: string): OilGasOperator[] {
  return OPERATORS.filter((o) => o.stateSlug === stateSlug);
}

export function getOilGasHubSources(): OperatorSource[] {
  return HUB_SOURCES;
}

export function oilGasUpdatedAt(): string {
  const dates = [OIL_GAS_FILE_UPDATED_AT, ...OPERATORS.map((o) => o.lastVerified)].filter(Boolean).sort();
  return dates.pop() ?? "2026-10-23";
}

export function operatorTypeLabel(type?: OperatorType): string {
  switch (type) {
    case "noc":
      return "National Oil Company (NOC)";
    case "ioc":
      return "International Oil Company (IOC)";
    case "jv":
      return "Incorporated LNG Joint Venture";
    case "independent":
      return "Indigenous / Independent Operator";
    default:
      return "Not classified";
  }
}

export function operatorTypeShortLabel(type?: OperatorType): string {
  switch (type) {
    case "noc":
      return "NOC";
    case "ioc":
      return "IOC";
    case "jv":
      return "LNG JV";
    case "independent":
      return "Indigenous";
    default:
      return "—";
  }
}

export function operatorSegmentLabel(segment?: OperatorSegment): string {
  switch (segment) {
    case "upstream":
      return "Upstream (E&P)";
    case "midstream":
      return "Midstream (LNG / Gas)";
    case "downstream":
      return "Downstream (Refining / Retail)";
    case "integrated":
      return "Integrated";
    default:
      return "—";
  }
}

export function getOilGasStats() {
  const noc = OPERATORS.filter((o) => o.type === "noc").length;
  const ioc = OPERATORS.filter((o) => o.type === "ioc").length;
  const jv = OPERATORS.filter((o) => o.type === "jv").length;
  const independent = OPERATORS.filter((o) => o.type === "independent").length;

  const upstream = OPERATORS.filter((o) => o.segment === "upstream").length;
  const midstream = OPERATORS.filter((o) => o.segment === "midstream").length;
  const downstream = OPERATORS.filter((o) => o.segment === "downstream").length;
  const integrated = OPERATORS.filter((o) => o.segment === "integrated").length;

  const hqCities = new Set(OPERATORS.map((o) => o.headquartersCity).filter(Boolean)).size;

  return {
    total: OPERATORS.length,
    noc,
    ioc,
    jv,
    independent,
    upstream,
    midstream,
    downstream,
    integrated,
    hqCities,
  };
}
