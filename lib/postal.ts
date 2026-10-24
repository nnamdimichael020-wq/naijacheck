import postalRaw from "@/data/postal-codes.json";

export type PostalSource = {
  label: string;
  url: string;
};

export type PostalPlace = {
  name: string;
  code: string;
  slug?: string;
  label?: string;
  sources?: PostalSource[];
  notes?: string;
};

export type PostalGeopoliticalZone =
  | "South-West"
  | "South-East"
  | "South-South"
  | "North-Central"
  | "North-West"
  | "North-East";

export type PostalState = {
  slug: string;
  name: string;
  capital: string;
  zoneCode: string;
  geopoliticalZone: PostalGeopoliticalZone;
  headOfficeCode: string;
  range?: string;
  intro: string;
  description?: string;
  places: PostalPlace[];
  sources: PostalSource[];
  lastVerified: string;
  verification: "manual";
  notes?: string;
};

type PostalFile = {
  updatedAt?: string;
  notes?: string;
  states: unknown[];
};

export const POSTAL_GEOPOLITICAL_ZONES: readonly PostalGeopoliticalZone[] = [
  "South-West",
  "South-East",
  "South-South",
  "North-Central",
  "North-West",
  "North-East",
] as const;

const STATE_ZONE_MAP: Record<string, PostalGeopoliticalZone> = {
  lagos: "South-West",
  ogun: "South-West",
  oyo: "South-West",
  osun: "South-West",
  ondo: "South-West",
  ekiti: "South-West",
  abia: "South-East",
  anambra: "South-East",
  ebonyi: "South-East",
  enugu: "South-East",
  imo: "South-East",
  "akwa-ibom": "South-South",
  bayelsa: "South-South",
  "cross-river": "South-South",
  delta: "South-South",
  edo: "South-South",
  rivers: "South-South",
  benue: "North-Central",
  "fct-abuja": "North-Central",
  kogi: "North-Central",
  kwara: "North-Central",
  nasarawa: "North-Central",
  niger: "North-Central",
  plateau: "North-Central",
  jigawa: "North-West",
  kaduna: "North-West",
  kano: "North-West",
  katsina: "North-West",
  kebbi: "North-West",
  sokoto: "North-West",
  zamfara: "North-West",
  adamawa: "North-East",
  bauchi: "North-East",
  borno: "North-East",
  gombe: "North-East",
  taraba: "North-East",
  yobe: "North-East",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePlace(p: unknown): PostalPlace | null {
  if (!p || typeof p !== "object") return null;
  const c = p as Partial<PostalPlace>;
  if (typeof c.name !== "string" || !c.name.trim()) return null;
  if (typeof c.code !== "string" || !/^\d{6}$/.test(c.code.trim())) return null;
  const sources = Array.isArray(c.sources)
    ? (c.sources as unknown[])
        .filter(
          (x): x is PostalSource =>
            Boolean(
              x &&
                typeof (x as Record<string, unknown>).label === "string" &&
                (x as Record<string, string>).label.trim().length > 0 &&
                typeof (x as Record<string, unknown>).url === "string" &&
                /^https?:\/\//.test((x as Record<string, string>).url.trim()),
            ),
        )
        .map((x) => ({ label: x.label.trim(), url: x.url.trim() }))
    : [];
  // Absolute rule: never accept an unsourced 6-digit postal code.
  if (sources.length === 0) return null;
  return {
    name: c.name.trim(),
    code: c.code.trim(),
    slug: typeof c.slug === "string" && c.slug.trim() ? slugify(c.slug) : slugify(c.name),
    label: typeof c.label === "string" && c.label.trim() ? c.label.trim() : undefined,
    sources,
    notes: typeof c.notes === "string" && c.notes.trim() ? c.notes.trim() : undefined,
  };
}

function normalizeState(s: unknown): PostalState | null {
  if (!s || typeof s !== "object") return null;
  const c = s as Partial<PostalState> & { places?: unknown; sources?: unknown };
  if (typeof c.slug !== "string" || !/^[a-z0-9-]+$/.test(c.slug)) return null;
  if (typeof c.name !== "string" || !c.name.trim()) return null;
  if (typeof c.capital !== "string" || !c.capital.trim()) return null;
  if (typeof c.headOfficeCode !== "string" || !/^\d{6}$/.test(c.headOfficeCode.trim())) return null;
  if (typeof c.intro !== "string" || !c.intro.trim()) return null;
  if (!Array.isArray(c.places) || c.places.length === 0) return null;
  if (!Array.isArray(c.sources) || c.sources.length === 0) return null;
  if (typeof c.lastVerified !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.lastVerified)) return null;
  const places = (c.places as unknown[]).map(normalizePlace).filter(Boolean) as PostalPlace[];
  if (!places.length) return null;
  const sources = (c.sources as unknown[])
    .filter(
      (x): x is PostalSource =>
        Boolean(
          x &&
            typeof (x as Record<string, unknown>).label === "string" &&
            (x as Record<string, string>).label.trim().length > 0 &&
            typeof (x as Record<string, unknown>).url === "string" &&
            /^https?:\/\//.test((x as Record<string, string>).url.trim()),
        ),
    )
    .map((x) => ({ label: x.label.trim(), url: x.url.trim() }));
  if (!sources.length) return null;
  const slug = c.slug.trim();
  const geopoliticalZone = STATE_ZONE_MAP[slug] ?? "North-Central";
  return {
    slug,
    name: c.name.trim(),
    capital: c.capital.trim(),
    zoneCode: typeof c.zoneCode === "string" ? c.zoneCode.trim() : c.headOfficeCode.trim().slice(0, 3),
    geopoliticalZone,
    headOfficeCode: c.headOfficeCode.trim(),
    range: typeof c.range === "string" ? c.range.trim() : undefined,
    intro: c.intro.trim(),
    description: typeof c.description === "string" ? c.description.trim() : undefined,
    places,
    sources,
    lastVerified: c.lastVerified.trim(),
    verification: "manual",
    notes: typeof c.notes === "string" && c.notes.trim() ? c.notes.trim() : undefined,
  };
}

const parsed = postalRaw as unknown as PostalFile;
const all = Array.isArray(parsed?.states) ? (parsed.states.map(normalizeState).filter(Boolean) as PostalState[]) : [];

export const POSTAL_FILE_UPDATED_AT: string | null = typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null;
export const POSTAL_FILE_NOTES: string | null = typeof parsed?.notes === "string" ? parsed.notes : null;

export function getAllPostalStates(): PostalState[] {
  return all.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function getPostalState(slug: string): PostalState | undefined {
  return all.find((s) => s.slug === slug);
}

export function getAllPostalStateSlugs(): string[] {
  return all.map((s) => s.slug);
}

export function getPostalZone(stateSlug: string): PostalGeopoliticalZone | undefined {
  return STATE_ZONE_MAP[stateSlug];
}

export function getPostalPlace(stateSlug: string, areaSlug: string): { state: PostalState; place: PostalPlace } | undefined {
  const state = getPostalState(stateSlug);
  if (!state) return undefined;
  const place = state.places.find((p) => p.slug === areaSlug);
  if (!place) return undefined;
  return { state, place };
}

/**
 * Curated high-intent area leaves (`/codes/postal/[state]/[area]`).
 * Strictly restricted to major commercial/urban districts and cities that carry
 * distinct verified codes AND bespoke delivery/geography guidance — never village-level bloat.
 */
export const CURATED_POSTAL_LEAVES: readonly { state: string; area: string }[] = [
  // Lagos — 9 high-intent commercial, island, port & residential hubs
  { state: "lagos", area: "ikeja" },
  { state: "lagos", area: "victoria-island" },
  { state: "lagos", area: "lekki" },
  { state: "lagos", area: "surulere" },
  { state: "lagos", area: "ikorodu" },
  { state: "lagos", area: "yaba" },
  { state: "lagos", area: "apapa" },
  { state: "lagos", area: "ikoyi" },
  { state: "lagos", area: "ajah" },
  // FCT Abuja — 7 central & commuter satellite districts
  { state: "fct-abuja", area: "garki" },
  { state: "fct-abuja", area: "wuse" },
  { state: "fct-abuja", area: "maitama" },
  { state: "fct-abuja", area: "asokoro" },
  { state: "fct-abuja", area: "gwarinpa" },
  { state: "fct-abuja", area: "central-business-district" },
  { state: "fct-abuja", area: "kubwa" },
  // Major non-capital / regional commercial cities
  { state: "rivers", area: "port-harcourt" },
  { state: "kano", area: "kano-municipal" },
  { state: "abia", area: "aba" },
  { state: "anambra", area: "onitsha" },
] as const;

export function getAllPostalAreaParams(): { state: string; area: string }[] {
  return CURATED_POSTAL_LEAVES.filter(({ state, area }) => Boolean(getPostalPlace(state, area))).map(({ state, area }) => ({
    state,
    area,
  }));
}

export type AggregatedPostalSource = {
  label: string;
  url: string;
  placesCovered: string[];
};

/**
 * Deduplicate state-level + place-level public sources by URL so every single
 * place's citable source appears on-page without truncating at `.slice(0, 5)`.
 */
export function getAggregatedStateSources(state: PostalState): AggregatedPostalSource[] {
  const byUrl = new Map<string, AggregatedPostalSource>();
  for (const src of state.sources) {
    if (!byUrl.has(src.url)) {
      byUrl.set(src.url, { label: src.label, url: src.url, placesCovered: [] });
    }
  }
  for (const p of state.places) {
    const placeTag = `${p.name.split("—")[0].trim()} (${p.code})`;
    for (const src of p.sources ?? []) {
      const existing = byUrl.get(src.url);
      if (existing) {
        if (!existing.placesCovered.includes(placeTag)) {
          existing.placesCovered.push(placeTag);
        }
      } else {
        byUrl.set(src.url, { label: src.label, url: src.url, placesCovered: [placeTag] });
      }
    }
  }
  return [...byUrl.values()];
}

export function postalStateCount(): number {
  return all.length;
}

export function postalPlaceCount(): number {
  return all.reduce((a, s) => a + s.places.length, 0);
}
