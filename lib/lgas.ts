import lgasRaw from "@/data/lgas.json";
import { getAllPostalStates } from "@/lib/postal";

export type Lga = {
  slug: string;
  name: string;
  headquarters?: string;
  sources: { label: string; url: string }[];
  notes?: string;
};

export type LgaState = {
  slug: string;
  name: string;
  count: number;
  lgas: Lga[];
  lastVerified: string;
  verification: "manual";
  notes?: string;
};

type LgasFile = {
  updatedAt?: string;
  datasetNotes?: string;
  sources?: { label: string; url: string }[];
  states: (LgaState & { lgas: unknown[] })[];
};

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeLga(raw: unknown): Lga | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<Lga> & { sources?: unknown };
  if (typeof c.name !== "string" || !c.name.trim()) return null;
  if (typeof c.slug !== "string" || !/^[a-z0-9-]+$/.test(c.slug.trim())) return null;
  const sources = Array.isArray(c.sources)
    ? (c.sources as unknown[])
        .filter(
          (x): x is { label: string; url: string } =>
            Boolean(x && typeof (x as Record<string, unknown>).label === "string" && typeof (x as Record<string, unknown>).url === "string" && /^https?:\/\//.test((x as Record<string, string>).url)),
        )
        .map((x) => ({ label: (x as Record<string, string>).label.trim(), url: (x as Record<string, string>).url.trim() }))
    : [];
  if (!sources.length) return null;
  return {
    slug: slugify(c.slug),
    name: c.name.trim(),
    headquarters: typeof c.headquarters === "string" && c.headquarters.trim() ? c.headquarters.trim() : undefined,
    sources,
    notes: typeof c.notes === "string" && c.notes.trim() ? c.notes.trim() : undefined,
  };
}

function normalizeState(raw: unknown): LgaState | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<LgaState> & { lgas?: unknown; sources?: unknown };
  if (typeof c.slug !== "string" || !/^[a-z0-9-]+$/.test(c.slug.trim())) return null;
  if (typeof c.name !== "string" || !c.name.trim()) return null;
  if (!Array.isArray(c.lgas) || c.lgas.length === 0) return null;
  if (typeof c.lastVerified !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.lastVerified.trim())) return null;
  const lgas = (c.lgas as unknown[]).map(normalizeLga).filter(Boolean) as Lga[];
  if (!lgas.length) return null;
  return {
    slug: c.slug.trim(),
    name: c.name.trim(),
    count: lgas.length,
    lgas: lgas.sort((a, b) => a.name.localeCompare(b.name)),
    lastVerified: c.lastVerified.trim(),
    verification: "manual",
    notes: typeof c.notes === "string" ? c.notes.trim() : undefined,
  };
}

const parsed = lgasRaw as unknown as LgasFile;
const allStates: LgaState[] = Array.isArray(parsed?.states) ? (parsed.states.map(normalizeState).filter(Boolean) as LgaState[]) : [];

export const LGAS_FILE_UPDATED_AT: string | null = typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null;
export const LGAS_FILE_NOTES: string | null = typeof parsed?.datasetNotes === "string" ? parsed.datasetNotes : null;
export const LGAS_FILE_SOURCES: { label: string; url: string }[] = Array.isArray(parsed?.sources) ? (parsed.sources as { label: string; url: string }[]) : [];

export function getAllLgaStates(): LgaState[] {
  return allStates.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function getLgaState(slug: string): LgaState | undefined {
  return allStates.find((s) => s.slug === slug);
}

export function getAllLgaStateSlugs(): string[] {
  return allStates.map((s) => s.slug);
}

export function getLga(stateSlug: string, lgaSlug: string): { state: LgaState; lga: Lga } | undefined {
  const state = getLgaState(stateSlug);
  if (!state) return undefined;
  const lga = state.lgas.find((l) => l.slug === lgaSlug);
  if (!lga) return undefined;
  return { state, lga };
}

export function getAllLgaParams(): { state: string; lga: string }[] {
  const out: { state: string; lga: string }[] = [];
  for (const s of allStates) for (const l of s.lgas) out.push({ state: s.slug, lga: l.slug });
  return out;
}

export function lgaCounts(): { states: number; lgas: number } {
  return { states: allStates.length, lgas: allStates.reduce((a, s) => a + s.lgas.length, 0) };
}

// Postal cross-links — best-effort by state slug match
export function postalPlacesForState(stateSlug: string) {
  const postalStates = getAllPostalStates();
  // direct slug match (abia->abia) covers most; fct-abuja is exact
  const hit = postalStates.find((p) => p.slug === stateSlug);
  if (hit) return hit.places;
  // fallback: try name contains (not needed now)
  return [];
}

// For unique intro variety — pick a phrase bucket
export function lgaIntroVariant(lga: Lga, state: LgaState, postalCount: number): string {
  const base = `${lga.name} is a Local Government Area in ${state.name} State — one of ${state.count} LGAs that make up the state under the 1999 Constitution.`;
  const hqPart = lga.headquarters ? ` Its headquarters is ${lga.headquarters} where council business sits.` : ` Headquarters not shown here (not verified in this build — see Sources).`;
  const postalPart =
    postalCount > 0
      ? ` We link ${postalCount} NIPOST postal place${postalCount === 1 ? "" : "s"} in ${state.name} to help you pick the right 6-digit code for forms.`
      : ` No district-level postal code is mapped to this LGA yet — use ${state.name} head-office code via /codes/postal/${state.slug} plus full street address.`;
  // Add Lagos LCDA note if Lagos
  const lcdaNote = state.slug === "lagos" ? ` Lagos LCDAs (37) are subdivisions of its 20 LGAs — not separate LGAs in this 774 count.` : "";
  return base + hqPart + postalPart + lcdaNote;
}
