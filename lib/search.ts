import type { SearchEntry } from "@/lib/types";

/**
 * Omni search — shared scoring, aliases and category mapping.
 * Single source of truth for both live type-ahead and /search page.
 */

export const WAT_SEARCH_KIND_LABEL: Record<string, string> = {
  "prices-city": "City",
  "prices-item": "Prices",
  "prices-market": "Market",
  "prices-static": "Prices",
  hub: "Section",
  rates: "Rates",
  charts: "Charts",
  banks: "Bank",
  postal: "Postal",
  geo: "LGA",
  "trends-slang": "Slang",
  "trends-psych": "Relationships",
  "hustle-blueprint": "Hustle",
  "hustle-combo": "Hustle",
  howto: "GovHowTo",
  exam: "Exam",
  telecom: "Telecom",
  cookbook: "Cookbook",
  tools: "Tools",
  learn: "Learn",
};

export type SearchCategory = {
  id: string;
  label: string;
  kinds: string[] | null; // null = all
  desc: string;
};

export const SEARCH_CATEGORIES: SearchCategory[] = [
  { id: "all", label: "All", kinds: null, desc: "Everything" },
  { id: "cities", label: "Cities", kinds: ["prices-city"], desc: "City price pages" },
  { id: "rates", label: "Rates & history", kinds: ["rates"], desc: "FX rates & history" },
  { id: "charts", label: "Fuel & charts", kinds: ["charts", "prices-static"], desc: "Fuel prices & charts" },
  { id: "banks", label: "Bank codes", kinds: ["banks"], desc: "Sort codes & USSD" },
  { id: "postal", label: "Postal/ZIP", kinds: ["postal"], desc: "State & district codes" },
  { id: "geo", label: "LGAs", kinds: ["geo"], desc: "Local Government Areas" },
  { id: "howto", label: "Gov how-to", kinds: ["howto"], desc: "NIN, passport, CAC…" },
  { id: "tools", label: "Tools & quiz", kinds: ["tools", "cookbook"], desc: "Calculators & quizzes" },
  { id: "trends", label: "Slang/trends", kinds: ["trends-slang", "trends-psych"], desc: "Decoder & trends" },
  { id: "other", label: "Other/site", kinds: ["hub", "learn", "exam", "telecom", "prices-item", "prices-market", "hustle-blueprint", "hustle-combo"], desc: "About, status, prices…" },
];

export function getCategoryById(id: string | null | undefined): SearchCategory | undefined {
  if (!id) return undefined;
  return SEARCH_CATEGORIES.find((c) => c.id === id);
}

export function kindsForCategory(categoryId: string): string[] | null {
  const cat = getCategoryById(categoryId);
  return cat ? cat.kinds : null;
}

// --- Normalize & aliases (must match generator and client)

export const SEARCH_ALIASES: Record<string, string> = {
  dollar: "usd",
  usd: "dollar usd",
  naira: "ngn",
  ngn: "naira ngn",
  gas: "fuel",
  pms: "petrol",
  ago: "diesel",
  jamb: "admission cutoff",
  "cut-off": "cutoff",
  data: "telecom bundle",
  business: "hustle",
  passport: "immigration",
  sort: "sort code cbn nip",
  ussd: "*737# *901#",
  zip: "postal",
  lga: "local government area council",
  fuel: "petrol diesel depot",
};

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9₦*#]+/g, " ")
    .trim();
}

export function oneEditAway(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + Number(i < a.length || j < b.length) <= 1;
}

export function scoreEntry(entry: SearchEntry, terms: string[]): number {
  const title = normalizeSearch(entry.title);
  const keys = normalizeSearch(entry.keys);
  const desc = normalizeSearch(entry.desc);
  const words = `${title} ${keys}`.split(/\s+/);
  let s = 0;
  for (const raw of terms) {
    const expanded = `${raw} ${SEARCH_ALIASES[raw] ?? ""}`.trim().split(/\s+/).filter(Boolean);
    for (const t of expanded) {
      if (title.includes(t)) s += 3;
      if (keys.includes(t)) s += 2;
      if (desc.includes(t)) s += 1;
      if (t.length >= 4 && words.some((word) => oneEditAway(t, word))) s += 1;
      // Boost exact digit/code matches (e.g. 058, 100001)
      if (/^\d+$/.test(t) && (title.includes(t) || keys.includes(t))) s += 2;
    }
  }
  // Tiny boost for shorter, more specific paths (hub vs deep page) — keep practical
  if (entry.path.split("/").length <= 3) s += 0.1;
  return s;
}

export function filterByCategory(entries: SearchEntry[], categoryId: string | null): SearchEntry[] {
  if (!categoryId || categoryId === "all") return entries;
  const kinds = kindsForCategory(categoryId);
  if (!kinds) return entries;
  return entries.filter((e) => kinds.includes(e.kind));
}

export function rankedSearch(entries: SearchEntry[], query: string, categoryId: string | null, limit = 8): SearchEntry[] {
  const q = normalizeSearch(query);
  const terms = q.split(/\s+/).filter((t) => t.length > 1);
  const pool = filterByCategory(entries, categoryId);
  if (terms.length === 0) {
    // Empty query + category: browse mode — return first N in category (already filtered)
    return pool.slice(0, limit);
  }
  return pool
    .map((e) => ({ e, s: scoreEntry(e, terms) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.e);
}

export const POPULAR_SHORTCUTS: { label: string; path: string; kind: string }[] = [
  { label: "Rates & FX history", path: "/rates", kind: "rates" },
  { label: "Postal codes by state", path: "/codes/postal", kind: "postal" },
  { label: "Bank sort & USSD codes", path: "/codes/banks", kind: "banks" },
  { label: "774 LGAs by state", path: "/geo", kind: "geo" },
  { label: "Data status & sources", path: "/status", kind: "hub" },
  { label: "Fuel depot prices", path: "/prices/fuel", kind: "prices-static" },
];
