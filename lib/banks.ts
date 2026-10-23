import banksRaw from "@/data/banks.json";

export type BankSortCode = {
  code: string;
  label: string;
  type?: string;
};

export type BankUssd = {
  code: string;
  label: string;
  purpose?: string;
};

export type BankSourceKind = "primary" | "secondary";

export type BankSource = {
  label: string;
  url: string;
  kind?: BankSourceKind;
};

export type BankHeadquartersLinks = {
  postalHref?: string;
  postalLabel?: string;
  geoHref?: string;
  geoLabel?: string;
};

export type Bank = {
  slug: string;
  name: string;
  fullName?: string;
  fullLegalName?: string;
  parentGroup?: string;
  officialWebsite?: string;
  headquarters?: string;
  headquartersCity?: string;
  headquartersLinks?: BankHeadquartersLinks;
  licenceType?: string;
  statusNote?: string;
  sortCodes: BankSortCode[];
  ussd: BankUssd[];
  sources: BankSource[];
  lastVerified: string;
  verification: "manual";
  notes?: string;
};

type BanksFile = {
  updatedAt?: string;
  scope?: string;
  notes?: string;
  hubSources?: unknown;
  banks: Bank[];
};

function isValidSlug(s: unknown): boolean {
  return typeof s === "string" && /^[a-z0-9-]+$/.test(s);
}

function cleanOptionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function normalizeSourceList(raw: unknown): BankSource[] {
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
    .map((r): BankSource => {
      const kind: BankSourceKind | undefined =
        r.kind === "primary" || r.kind === "secondary" ? r.kind : undefined;
      return {
        label: String(r.label).trim(),
        url: String(r.url).trim(),
        kind,
      };
    })
    .filter((s) => s.label.length > 0 && s.url.length > 0);
}

function normalizeHeadquartersLinks(raw: unknown): BankHeadquartersLinks | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const postalHref =
    typeof r.postalHref === "string" && r.postalHref.trim().startsWith("/") ? r.postalHref.trim() : undefined;
  const postalLabel = cleanOptionalString(r.postalLabel);
  const geoHref =
    typeof r.geoHref === "string" && r.geoHref.trim().startsWith("/") ? r.geoHref.trim() : undefined;
  const geoLabel = cleanOptionalString(r.geoLabel);
  if (!postalHref && !geoHref) return undefined;
  return { postalHref, postalLabel, geoHref, geoLabel };
}

function normalizeBank(b: unknown): Bank | null {
  if (!b || typeof b !== "object") return null;
  const cand = b as Partial<Bank> & {
    sortCodes?: unknown;
    ussd?: unknown;
    sources?: unknown;
    headquartersLinks?: unknown;
  };
  if (!isValidSlug(cand.slug)) return null;
  if (typeof cand.name !== "string" || !cand.name.trim()) return null;
  if (!Array.isArray(cand.sortCodes) || cand.sortCodes.length === 0) return null;
  if (!Array.isArray(cand.ussd) || cand.ussd.length === 0) return null;
  if (!Array.isArray(cand.sources) || cand.sources.length === 0) return null;
  if (typeof cand.lastVerified !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cand.lastVerified)) return null;

  const sortCodes: BankSortCode[] = (cand.sortCodes as unknown[])
    .filter(
      (x): x is BankSortCode =>
        Boolean(
          x &&
            typeof (x as Record<string, unknown>).code === "string" &&
            typeof (x as Record<string, unknown>).label === "string",
        ),
    )
    .map((x) => {
      const r = x as Record<string, string>;
      return { code: r.code.trim(), label: r.label.trim(), type: r.type?.trim() || undefined };
    })
    .filter((x) => x.code.length > 0);

  const ussd: BankUssd[] = (cand.ussd as unknown[])
    .filter(
      (x): x is BankUssd =>
        Boolean(
          x &&
            typeof (x as Record<string, unknown>).code === "string" &&
            typeof (x as Record<string, unknown>).label === "string",
        ),
    )
    .map((x) => {
      const r = x as Record<string, string>;
      return { code: r.code.trim(), label: r.label.trim(), purpose: r.purpose?.trim() || undefined };
    })
    .filter((x) => x.code.length > 0);

  const sources = normalizeSourceList(cand.sources);
  if (!sortCodes.length || !ussd.length || !sources.length) return null;

  const officialWebsite =
    typeof cand.officialWebsite === "string" && /^https?:\/\//.test(cand.officialWebsite.trim())
      ? cand.officialWebsite.trim()
      : undefined;

  return {
    slug: cand.slug!.trim(),
    name: cand.name.trim(),
    fullName: cleanOptionalString(cand.fullName),
    fullLegalName: cleanOptionalString(cand.fullLegalName),
    parentGroup: cleanOptionalString(cand.parentGroup),
    officialWebsite,
    headquarters: cleanOptionalString(cand.headquarters),
    headquartersCity: cleanOptionalString(cand.headquartersCity),
    headquartersLinks: normalizeHeadquartersLinks(cand.headquartersLinks),
    licenceType: cleanOptionalString(cand.licenceType),
    statusNote: cleanOptionalString(cand.statusNote),
    sortCodes,
    ussd,
    sources,
    lastVerified: cand.lastVerified.trim(),
    verification: "manual",
    notes: cleanOptionalString(cand.notes),
  };
}

const parsed = banksRaw as unknown as BanksFile;
const all = Array.isArray(parsed?.banks) ? (parsed.banks.map(normalizeBank).filter(Boolean) as Bank[]) : [];
const hubSources = normalizeSourceList(parsed?.hubSources);

export const BANKS_FILE_UPDATED_AT: string | null =
  typeof parsed?.updatedAt === "string" ? parsed.updatedAt.trim() : null;
export const BANKS_FILE_SCOPE: string | null =
  typeof parsed?.scope === "string" ? parsed.scope.trim() : null;
export const BANKS_FILE_NOTES: string | null =
  typeof parsed?.notes === "string" ? parsed.notes.trim() : null;

export function getAllBanks(): Bank[] {
  return all.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function getBankBySlug(slug: string): Bank | undefined {
  return all.find((b) => b.slug === slug);
}

export function getAllBankSlugs(): string[] {
  return all.map((b) => b.slug);
}

export function getBanksHubSources(): BankSource[] {
  return hubSources.slice();
}

export function banksUpdatedAt(): string {
  return BANKS_FILE_UPDATED_AT ?? "2026-10-23";
}

export function isKnownBankSlug(slug: string): boolean {
  return all.some((b) => b.slug === slug);
}

export function bankLicenceTierShort(licenceType?: string): "International" | "National" | "Unverified" {
  if (!licenceType) return "Unverified";
  const lower = licenceType.toLowerCase();
  if (lower.includes("international")) return "International";
  if (lower.includes("national")) return "National";
  return "Unverified";
}
