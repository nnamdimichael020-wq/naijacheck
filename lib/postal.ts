import postalRaw from "@/data/postal-codes.json";

export type PostalPlace = {
  name: string;
  code: string;
  slug?: string;
  label?: string;
  sources?: { label: string; url: string }[];
  notes?: string;
};

export type PostalState = {
  slug: string;
  name: string;
  capital: string;
  zoneCode: string;
  headOfficeCode: string;
  range?: string;
  intro: string;
  description?: string;
  places: PostalPlace[];
  sources: { label: string; url: string }[];
  lastVerified: string;
  verification: "manual";
  notes?: string;
};

type PostalFile = {
  updatedAt?: string;
  notes?: string;
  states: PostalState[];
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
          (x): x is { label: string; url: string } =>
            Boolean(
              x &&
                typeof (x as Record<string, unknown>).label === "string" &&
                typeof (x as Record<string, unknown>).url === "string" &&
                /^https?:\/\//.test((x as Record<string, string>).url),
            ),
        )
        .map((x) => ({ label: (x as Record<string, string>).label.trim(), url: (x as Record<string, string>).url.trim() }))
    : [];
  return {
    name: c.name.trim(),
    code: c.code.trim(),
    slug: typeof c.slug === "string" && c.slug.trim() ? slugify(c.slug) : slugify(c.name),
    label: typeof c.label === "string" ? c.label.trim() : undefined,
    sources: sources.length ? sources : undefined,
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
      (x): x is { label: string; url: string } =>
        Boolean(x && typeof (x as Record<string, unknown>).label === "string" && typeof (x as Record<string, unknown>).url === "string"),
    )
    .map((x) => ({ label: (x as Record<string, string>).label.trim(), url: (x as Record<string, string>).url.trim() }));
  return {
    slug: c.slug.trim(),
    name: c.name.trim(),
    capital: c.capital.trim(),
    zoneCode: typeof c.zoneCode === "string" ? c.zoneCode.trim() : c.headOfficeCode!.slice(0, 3),
    headOfficeCode: c.headOfficeCode.trim(),
    range: typeof c.range === "string" ? c.range.trim() : undefined,
    intro: c.intro.trim(),
    description: typeof c.description === "string" ? c.description.trim() : undefined,
    places,
    sources,
    lastVerified: c.lastVerified.trim(),
    verification: "manual",
    notes: typeof c.notes === "string" ? c.notes.trim() : undefined,
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

export function getPostalPlace(stateSlug: string, areaSlug: string): { state: PostalState; place: PostalPlace } | undefined {
  const state = getPostalState(stateSlug);
  if (!state) return undefined;
  const place = state.places.find((p) => p.slug === areaSlug);
  if (!place) return undefined;
  return { state, place };
}

export function getAllPostalAreaParams(): { state: string; area: string }[] {
  // Curated high-intent leaves only — quality over village-level thin pages.
  // Lagos + FCT + Rivers + Kano — justified by distinct codes + distinct body text.
  const allow: { state: string; area: string }[] = [
    { state: "lagos", area: "ikeja" },
    { state: "lagos", area: "victoria-island" },
    { state: "lagos", area: "lekki" },
    { state: "lagos", area: "surulere" },
    { state: "lagos", area: "ikorodu" },
    { state: "fct-abuja", area: "garki" },
    { state: "fct-abuja", area: "wuse" },
    { state: "fct-abuja", area: "maitama" },
    { state: "fct-abuja", area: "asokoro" },
    { state: "fct-abuja", area: "gwarinpa" },
    { state: "rivers", area: "port-harcourt" },
    { state: "kano", area: "kano-municipal" },
  ];
  return allow.filter(({ state, area }) => Boolean(getPostalPlace(state, area)));
}

export function postalStateCount(): number { return all.length; }
export function postalPlaceCount(): number { return all.reduce((a, s) => a + s.places.length, 0); }
