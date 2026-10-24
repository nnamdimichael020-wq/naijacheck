import portsRaw from "@/data/ports.json";

export type PortCategory = "commercial-seaport" | "deep-sea-port" | "energy-terminal";

export type PortZone = "Western Ports" | "Eastern Ports";

export type PortSourceKind = "primary" | "secondary";

export type PortSource = {
  label: string;
  url: string;
  kind?: PortSourceKind;
};

export type NigerianPort = {
  slug: string;
  name: string;
  alternateNames?: string[];
  city?: string;
  locality?: string;
  stateSlug: string;
  stateName: string;
  lgaSlug?: string;
  lgaName?: string;
  postalHref?: string;
  postalLabel?: string;
  category: PortCategory;
  npaZone?: PortZone;
  /** Official 5-char UNECE UN/LOCODE in shipping format (e.g. `NGAPP` = `NG APP`). Omitted when unverified. */
  unLocode?: string;
  subPortCodes?: string[];
  landlordAuthority?: string;
  operator?: string;
  terminalOperators?: string[];
  role?: string;
  cargoTypes?: string[];
  waterway?: string;
  establishedNote?: string;
  operationsSummary: string;
  keyFacilities?: string[];
  relatedAirportSlugs?: string[];
  relatedOilGasSlugs?: string[];
  website?: string;
  sources: PortSource[];
  lastVerified: string;
  verification: "manual";
  notes?: string;
};

type PortsFile = {
  updatedAt?: string;
  scope?: string;
  prefixChoice?: string;
  notes?: string;
  hubSources?: unknown;
  ports: unknown[];
};

const VALID_CATEGORIES = new Set<PortCategory>([
  "commercial-seaport",
  "deep-sea-port",
  "energy-terminal",
]);

const VALID_ZONES = new Set<PortZone>(["Western Ports", "Eastern Ports"]);

const CATEGORY_SORT_ORDER: Record<PortCategory, number> = {
  "deep-sea-port": 0,
  "commercial-seaport": 1,
  "energy-terminal": 2,
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

function normalizeUnLocode(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const compact = v.replace(/\s+/g, "").toUpperCase();
  // Nigerian UN/LOCODEs are strictly ISO 'NG' + 3 uppercase letters (never guess or coerce invalid values)
  return /^NG[A-Z]{3}$/.test(compact) ? compact : undefined;
}

function normalizeSourceList(raw: unknown): PortSource[] {
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
    .map((r): PortSource => {
      const kind: PortSourceKind | undefined =
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

function normalizePort(raw: unknown): NigerianPort | null {
  if (!raw || typeof raw !== "object") return null;
  const cand = raw as Record<string, unknown>;
  if (!isValidSlug(cand.slug)) return null;
  if (typeof cand.name !== "string" || !cand.name.trim()) return null;
  if (!isValidSlug(cand.stateSlug)) return null;
  if (typeof cand.stateName !== "string" || !cand.stateName.trim()) return null;
  if (typeof cand.lastVerified !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cand.lastVerified)) {
    return null;
  }

  const sources = normalizeSourceList(cand.sources);
  if (sources.length === 0) return null;

  // Anti-thin-doorway guard: every dedicated /ports/[slug] page must carry a substantive
  // verified operations summary rather than a bare port name + boilerplate stub.
  const operationsSummary = cleanOptionalString(cand.operationsSummary);
  if (!operationsSummary || operationsSummary.length < 80) return null;

  const category: PortCategory =
    typeof cand.category === "string" && VALID_CATEGORIES.has(cand.category as PortCategory)
      ? (cand.category as PortCategory)
      : "commercial-seaport";

  const npaZone: PortZone | undefined =
    typeof cand.npaZone === "string" && VALID_ZONES.has(cand.npaZone as PortZone)
      ? (cand.npaZone as PortZone)
      : undefined;

  const postalHref =
    typeof cand.postalHref === "string" && cand.postalHref.trim().startsWith("/codes/postal/")
      ? cand.postalHref.trim()
      : undefined;

  return {
    slug: cand.slug.trim(),
    name: cand.name.trim(),
    alternateNames: cleanStringArray(cand.alternateNames),
    city: cleanOptionalString(cand.city),
    locality: cleanOptionalString(cand.locality),
    stateSlug: cand.stateSlug.trim(),
    stateName: cand.stateName.trim(),
    lgaSlug: isValidSlug(cand.lgaSlug) ? cand.lgaSlug.trim() : undefined,
    lgaName: cleanOptionalString(cand.lgaName),
    postalHref,
    postalLabel: postalHref ? cleanOptionalString(cand.postalLabel) : undefined,
    category,
    npaZone,
    unLocode: normalizeUnLocode(cand.unLocode),
    subPortCodes: cleanStringArray(cand.subPortCodes),
    landlordAuthority: cleanOptionalString(cand.landlordAuthority),
    operator: cleanOptionalString(cand.operator),
    terminalOperators: cleanStringArray(cand.terminalOperators),
    role: cleanOptionalString(cand.role),
    cargoTypes: cleanStringArray(cand.cargoTypes),
    waterway: cleanOptionalString(cand.waterway),
    establishedNote: cleanOptionalString(cand.establishedNote),
    operationsSummary,
    keyFacilities: cleanStringArray(cand.keyFacilities),
    relatedAirportSlugs: cleanStringArray(cand.relatedAirportSlugs)?.filter((s) => isValidSlug(s)),
    relatedOilGasSlugs: cleanStringArray(cand.relatedOilGasSlugs)?.filter((s) => isValidSlug(s)),
    website: normalizeWebsite(cand.website),
    sources,
    lastVerified: cand.lastVerified.trim(),
    verification: "manual",
    notes: cleanOptionalString(cand.notes),
  };
}

const parsedFile = portsRaw as unknown as PortsFile;

function loadVerifiedPorts(): NigerianPort[] {
  const list = Array.isArray(parsedFile.ports) ? parsedFile.ports : [];
  const seenSlugs = new Set<string>();
  const seenLocodes = new Set<string>();
  const out: NigerianPort[] = [];

  for (const item of list) {
    const p = normalizePort(item);
    if (!p) continue;
    if (seenSlugs.has(p.slug)) continue;
    if (p.unLocode && seenLocodes.has(p.unLocode)) continue;
    seenSlugs.add(p.slug);
    if (p.unLocode) seenLocodes.add(p.unLocode);
    out.push(p);
  }

  // Sort commercial & deep-sea ports ahead of energy terminals, then Western before Eastern, then name
  return out.sort((a, b) => {
    if (a.category !== b.category) {
      // Keep NPA commercial + deep-sea complexes grouped ahead of energy export terminals
      const groupA = a.category === "energy-terminal" ? 1 : 0;
      const groupB = b.category === "energy-terminal" ? 1 : 0;
      if (groupA !== groupB) return groupA - groupB;
      const ca = CATEGORY_SORT_ORDER[a.category];
      const cb = CATEGORY_SORT_ORDER[b.category];
      if (ca !== cb) return ca - cb;
    }
    if (a.npaZone !== b.npaZone) {
      if (a.npaZone === "Western Ports") return -1;
      if (b.npaZone === "Western Ports") return 1;
    }
    return a.name.localeCompare(b.name);
  });
}

const PORTS: NigerianPort[] = loadVerifiedPorts();

export const PORTS_FILE_UPDATED_AT: string | null =
  typeof parsedFile.updatedAt === "string" ? parsedFile.updatedAt : null;

export const PORTS_SCOPE: string = typeof parsedFile.scope === "string" ? parsedFile.scope : "";

export const PORTS_PREFIX_CHOICE: string =
  typeof parsedFile.prefixChoice === "string" ? parsedFile.prefixChoice : "";

export const PORTS_NOTES: string = typeof parsedFile.notes === "string" ? parsedFile.notes : "";

export const PORTS_HUB_SOURCES: PortSource[] = normalizeSourceList(parsedFile.hubSources);

export function getAllPorts(): NigerianPort[] {
  return PORTS;
}

export function getPortBySlug(slug: string): NigerianPort | undefined {
  return PORTS.find((p) => p.slug === slug);
}

export function getPortByUnLocode(code: string): NigerianPort | undefined {
  const norm = normalizeUnLocode(code);
  if (!norm) return undefined;
  return PORTS.find((p) => p.unLocode === norm);
}

export function getPortsByCategory(category: PortCategory): NigerianPort[] {
  return PORTS.filter((p) => p.category === category);
}

export function getPortsByStateSlug(stateSlug: string): NigerianPort[] {
  return PORTS.filter((p) => p.stateSlug === stateSlug);
}

export function getPortsForAirport(airportSlug: string): NigerianPort[] {
  return PORTS.filter((p) => p.relatedAirportSlugs?.includes(airportSlug));
}

export function getPortsForOilGasOperator(operatorSlug: string): NigerianPort[] {
  return PORTS.filter((p) => p.relatedOilGasSlugs?.includes(operatorSlug));
}

export function getRelatedPorts(current: NigerianPort, limit = 4): NigerianPort[] {
  const sameState = PORTS.filter((p) => p.slug !== current.slug && p.stateSlug === current.stateSlug);
  const sameCat = PORTS.filter(
    (p) =>
      p.slug !== current.slug &&
      p.stateSlug !== current.stateSlug &&
      p.category === current.category,
  );
  const rest = PORTS.filter(
    (p) =>
      p.slug !== current.slug &&
      p.stateSlug !== current.stateSlug &&
      p.category !== current.category,
  );
  return [...sameState, ...sameCat, ...rest].slice(0, limit);
}

export function formatUnLocodeSpaced(unLocode: string | undefined): string | null {
  if (!unLocode || !/^NG[A-Z]{3}$/.test(unLocode)) return null;
  return `${unLocode.slice(0, 2)} ${unLocode.slice(2)}`;
}

export function portCategoryLabel(category: PortCategory): string {
  switch (category) {
    case "deep-sea-port":
      return "Deep-Sea Multipurpose Port";
    case "commercial-seaport":
      return "NPA Landlord Commercial Seaport";
    case "energy-terminal":
      return "Crude Oil & LNG Marine Export Terminal";
  }
}

export function portCategoryShortLabel(category: PortCategory): string {
  switch (category) {
    case "deep-sea-port":
      return "Deep-sea";
    case "commercial-seaport":
      return "Commercial seaport";
    case "energy-terminal":
      return "Energy terminal";
  }
}

export function getCoastalPortStates(): Array<{
  stateSlug: string;
  stateName: string;
  count: number;
  ports: NigerianPort[];
}> {
  const map = new Map<string, { stateSlug: string; stateName: string; ports: NigerianPort[] }>();
  for (const p of PORTS) {
    const existing = map.get(p.stateSlug);
    if (existing) {
      existing.ports.push(p);
    } else {
      map.set(p.stateSlug, { stateSlug: p.stateSlug, stateName: p.stateName, ports: [p] });
    }
  }
  return [...map.values()]
    .map((entry) => ({ ...entry, count: entry.ports.length }))
    .sort((a, b) => b.count - a.count || a.stateName.localeCompare(b.stateName));
}

export function getPortsStats() {
  const commercialComplexes = PORTS.filter(
    (p) => p.category === "commercial-seaport" || p.category === "deep-sea-port",
  ).length;
  const deepSea = PORTS.filter((p) => p.category === "deep-sea-port").length;
  const energyTerminals = PORTS.filter((p) => p.category === "energy-terminal").length;
  const withUnLocode = PORTS.filter((p) => Boolean(p.unLocode)).length;
  const statesCovered = new Set(PORTS.map((p) => p.stateSlug)).size;
  const westernPorts = PORTS.filter((p) => p.npaZone === "Western Ports").length;
  const easternPorts = PORTS.filter((p) => p.npaZone === "Eastern Ports").length;
  const latestVerified =
    PORTS.map((p) => p.lastVerified)
      .sort()
      .at(-1) ??
    PORTS_FILE_UPDATED_AT ??
    "2026-10-24";

  return {
    total: PORTS.length,
    commercialComplexes,
    deepSea,
    energyTerminals,
    withUnLocode,
    statesCovered,
    westernPorts,
    easternPorts,
    latestVerified,
  };
}
