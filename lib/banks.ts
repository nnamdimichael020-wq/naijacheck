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

export type BankSource = {
  label: string;
  url: string;
};

export type Bank = {
  slug: string;
  name: string;
  fullName?: string;
  sortCodes: BankSortCode[];
  ussd: BankUssd[];
  sources: BankSource[];
  lastVerified: string;
  verification: "manual";
  notes?: string;
};

type BanksFile = {
  updatedAt?: string;
  notes?: string;
  banks: Bank[];
};

function isValidSlug(s: unknown): boolean {
  return typeof s === "string" && /^[a-z0-9-]+$/.test(s);
}

function normalizeBank(b: unknown): Bank | null {
  if (!b || typeof b !== "object") return null;
  const cand = b as Partial<Bank> & { sortCodes?: unknown; ussd?: unknown; sources?: unknown };
  if (!isValidSlug(cand.slug)) return null;
  if (typeof cand.name !== "string" || !cand.name.trim()) return null;
  if (!Array.isArray(cand.sortCodes) || cand.sortCodes.length === 0) return null;
  if (!Array.isArray(cand.ussd) || cand.ussd.length === 0) return null;
  if (!Array.isArray(cand.sources) || cand.sources.length === 0) return null;
  if (typeof cand.lastVerified !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cand.lastVerified)) return null;
  const sortCodes: BankSortCode[] = (cand.sortCodes as unknown[]).
    filter((x): x is BankSortCode => Boolean(x && typeof (x as Record<string, unknown>).code === "string" && typeof (x as Record<string, unknown>).label === "string")).
    map((x) => {
      const r = x as Record<string, string>;
      return { code: r.code.trim(), label: r.label.trim(), type: r.type?.trim() || undefined };
    }).filter((x) => x.code.length > 0);
  const ussd: BankUssd[] = (cand.ussd as unknown[]).
    filter((x): x is BankUssd => Boolean(x && typeof (x as Record<string, unknown>).code === "string" && typeof (x as Record<string, unknown>).label === "string")).
    map((x) => {
      const r = x as Record<string, string>;
      return { code: r.code.trim(), label: r.label.trim(), purpose: r.purpose?.trim() || undefined };
    }).filter((x) => x.code.length > 0);
  const sources: BankSource[] = (cand.sources as unknown[]).
    filter((x): x is BankSource => Boolean(x && typeof (x as Record<string, unknown>).label === "string" && typeof (x as Record<string, unknown>).url === "string" && /^https?:\/\//.test((x as Record<string, string>).url))).
    map((x) => {
      const r = x as Record<string, string>;
      return { label: r.label.trim(), url: r.url.trim() };
    });
  if (!sortCodes.length || !ussd.length || !sources.length) return null;
  return {
    slug: cand.slug!.trim(),
    name: cand.name.trim(),
    fullName: typeof cand.fullName === "string" ? cand.fullName.trim() : undefined,
    sortCodes,
    ussd,
    sources,
    lastVerified: cand.lastVerified.trim(),
    verification: "manual",
    notes: typeof cand.notes === "string" ? cand.notes.trim() : undefined,
  };
}

const parsed = banksRaw as unknown as BanksFile;
const all = Array.isArray(parsed?.banks) ? parsed.banks.map(normalizeBank).filter(Boolean) as Bank[] : [];

export const BANKS_FILE_UPDATED_AT: string | null = typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null;
export const BANKS_FILE_NOTES: string | null = typeof parsed?.notes === "string" ? parsed.notes : null;

export function getAllBanks(): Bank[] {
  return all.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function getBankBySlug(slug: string): Bank | undefined {
  return all.find((b) => b.slug === slug);
}

export function getAllBankSlugs(): string[] {
  return all.map((b) => b.slug);
}

export function banksUpdatedAt(): string {
  return BANKS_FILE_UPDATED_AT ?? "2026-10-21";
}

export function isKnownBankSlug(slug: string): boolean {
  return all.some((b) => b.slug === slug);
}
