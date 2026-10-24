import type { SearchEntry } from "@/lib/types";

/**
 * Omni search — shared scoring, aliases, category mapping, top-level dropdown
 * allowlist, and real-data idle suggestions.
 *
 * Architecture:
 *  A) Header dropdown (`rankedDropdownSearch`) = shallow top-level section hubs ONLY
 *     (governed by `DROPDOWN_TOP_LEVEL_ALLOWLIST` below).
 *  B) Full `/search` page (`rankedSearch`) = full omni deep index (all 12 banks,
 *     37 postal states + 12 leaves, 774 LGAs, 5 chart series, cities, guides, etc.).
 *  C) Idle animation suggestions (`SEARCH_SUGGESTIONS`) = curated exclusively from
 *     real SSOT data/routes in this repository.
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
  airports: "Airport",
  airlines: "Airline",
  "oil-gas": "Oil & Gas",
  ports: "Seaport",
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
  { id: "airports", label: "Airports", kinds: ["airports"], desc: "IATA, ICAO & cities" },
  { id: "airlines", label: "Airlines", kinds: ["airlines"], desc: "Active & historical carriers" },
  { id: "oil-gas", label: "Oil & gas", kinds: ["oil-gas"], desc: "NNPC, IOCs & operators" },
  { id: "ports", label: "Seaports", kinds: ["ports"], desc: "NPA ports & UN/LOCODEs" },
  { id: "howto", label: "Gov how-to", kinds: ["howto"], desc: "NIN, passport, CAC…" },
  { id: "tools", label: "Tools & quiz", kinds: ["tools", "cookbook"], desc: "Calculators & quizzes" },
  { id: "trends", label: "Slang/trends", kinds: ["trends-slang", "trends-psych"], desc: "Decoder & trends" },
  {
    id: "other",
    label: "Other/site",
    kinds: ["hub", "learn", "exam", "telecom", "prices-item", "prices-market", "hustle-blueprint", "hustle-combo"],
    desc: "About, status, prices…",
  },
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
  airport: "airports iata icao",
  airline: "airlines carrier aviation iata icao",
  iata: "airport airline iata",
  icao: "airport airline icao",
  waac: "nigeria airways waac",
  virgin: "air nigeria virgin",
  fuel: "petrol diesel depot",
  nnpc: "nnpc nnpcl nepl npdc",
  spdc: "renaissance shell",
  mpnu: "seplat sepnu exxonmobil",
  naoc: "oando agip eni",
  nlng: "nigeria lng bonny",
  ioc: "shell chevron exxonmobil totalenergies eni",
  port: "seaport seaports ports npa unlocode",
  seaport: "seaports ports npa unlocode",
  seaports: "seaport ports npa unlocode",
  npa: "nigerian ports authority seaport",
  locode: "unlocode seaport port",
  unlocode: "locode seaport port",
  tincan: "tin can island ngtin",
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
  const titleWords = title.split(/\s+/);
  const words = `${title} ${keys}`.split(/\s+/);
  let s = 0;
  for (const raw of terms) {
    const expanded = `${raw} ${SEARCH_ALIASES[raw] ?? ""}`.trim().split(/\s+/).filter(Boolean);
    for (const t of expanded) {
      if (title.includes(t)) s += 3;
      if (keys.includes(t)) s += 2;
      if (desc.includes(t)) s += 1;
      if (t.length >= 4 && words.some((word) => oneEditAway(t, word))) s += 1;
      // Boost exact whole-word short codes (2-4 char IATA/ICAO designators like P4, QI, VK, LOS, ABV, APK or 5-char NGxxx UN/LOCODEs)
      if (((t.length >= 2 && t.length <= 4) || /^ng[a-z]{3}$/.test(t)) && words.includes(t)) {
        s += titleWords.includes(t) ? 5 : 3;
      }
      // Boost exact digit/code matches (e.g. 058, 100001)
      if (/^\d+$/.test(t) && (title.includes(t) || keys.includes(t))) s += 2;
    }
  }
  // Tiny tie-breaker boost for shorter, more specific paths ONLY when at least one term matched
  if (s > 0 && entry.path.split("/").length <= 3) s += 0.1;
  return s;
}

export function filterByCategory(entries: SearchEntry[], categoryId: string | null): SearchEntry[] {
  if (!categoryId || categoryId === "all") return entries;
  const kinds = kindsForCategory(categoryId);
  if (!kinds) return entries;
  return entries.filter((e) => kinds.includes(e.kind));
}

const SEARCH_STOPWORDS = new Set([
  "what",
  "whats",
  "how",
  "can",
  "the",
  "for",
  "in",
  "on",
  "of",
  "to",
  "is",
  "it",
  "my",
  "me",
  "do",
  "does",
  "are",
  "with",
  "from",
  "and",
  "or",
]);

export function extractSearchTerms(query: string): string[] {
  const raw = normalizeSearch(query)
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (raw.length <= 1) return raw;
  const meaningful = raw.filter((t) => !SEARCH_STOPWORDS.has(t));
  return meaningful.length > 0 ? meaningful : raw;
}

/**
 * Full omni search (used on `/search` page): searches all 1,054+ entries including
 * deep bank pages, postal states/leaves, 774 LGAs, chart series, cities, and guides.
 */
export function rankedSearch(entries: SearchEntry[], query: string, categoryId: string | null, limit = 8): SearchEntry[] {
  const terms = extractSearchTerms(query);
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

// ---------------------------------------------------------------------------
// A) Type-ahead dropdown = top-level section hubs only
// ---------------------------------------------------------------------------

/**
 * Normalize a route path: strip query/hash, collapse duplicate slashes, and
 * strip trailing slash (preserving "/").
 */
export function normalizeRoutePath(rawPath: string): string {
  const clean = (rawPath ?? "").split(/[?#]/)[0].trim().replace(/\/+/g, "/");
  if (!clean || clean === "/") return "/";
  const withLeading = clean.startsWith("/") ? clean : `/${clean}`;
  return withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
}

/**
 * Strict path rule: true iff normalized path is `/` or has at most one segment
 * beyond `/` (excluding non-hub utility routes `/admin` and `/search`).
 * e.g. `/rates`, `/codes`, `/geo`, `/howto` -> true
 *      `/rates/history`, `/codes/banks`, `/codes/banks/gtbank`, `/geo/lagos/ikeja` -> false
 */
export function isTopLevelPath(rawPath: string): boolean {
  const p = normalizeRoutePath(rawPath);
  if (p === "/admin" || p === "/search") return false;
  if (p === "/") return true;
  const segs = p.split("/").filter(Boolean);
  return segs.length <= 1;
}

/**
 * Explicit two-segment product section homes kept visible in the dropdown so
 * Bank codes and Postal/ZIP queries/filters show their section landing page
 * without dumping deep bank or postal leaves.
 */
export const DROPDOWN_TWO_SEGMENT_HUB_EXCEPTIONS = ["/codes/banks", "/codes/postal"] as const;

/**
 * Hub registry: the ONLY routes the header live type-ahead dropdown may display.
 * Consists of all 16 public one-segment section hubs plus the 2 documented
 * product-hub exceptions (`/codes/banks`, `/codes/postal`).
 *
 * Excluded from dropdown (available on Enter via `/search`):
 *  - `/rates/history`
 *  - `/prices/fuel`, `/prices/lagos`, `/prices/lagos/rice`, `/prices/markets/*`
 *  - `/codes/banks/gtbank` and all other bank leaves
 *  - `/codes/postal/lagos`, `/codes/postal/lagos/ikeja` and all postal leaves
 *  - `/geo/lagos`, `/geo/lagos/ikeja` and all 37 state + 774 LGA pages
 *  - `/charts/parallel-usd-buy` and all chart series leaves
 *  - `/howto/*`, `/tools/*`, `/trends/*`, `/hustle/*`, `/exam/*`, `/learn/*`, `/telecom/*` leaves
 */
export const DROPDOWN_TOP_LEVEL_ALLOWLIST: readonly string[] = [
  "/",
  "/rates",
  "/codes",
  "/codes/banks",
  "/codes/postal",
  "/geo",
  "/airports",
  "/airlines",
  "/oil-gas",
  "/ports",
  "/howto",
  "/tools",
  "/trends",
  "/charts",
  "/prices",
  "/hustle",
  "/exam",
  "/learn",
  "/telecom",
  "/status",
  "/about",
  "/privacy",
] as const;

const DROPDOWN_ALLOW_SET = new Set<string>(DROPDOWN_TOP_LEVEL_ALLOWLIST);

export function isDropdownAllowlistedPath(rawPath: string): boolean {
  return DROPDOWN_ALLOW_SET.has(normalizeRoutePath(rawPath));
}

/**
 * Category -> shallow section hub(s) shown in the dropdown.
 * Filtering by Banks/Postal/LGAs/Cities in the dropdown surfaces ONLY the
 * section hub (e.g. Banks -> `/codes/banks`, Cities -> `/prices`) and prompts
 * the user to press Enter for the full deep list on `/search`.
 */
export const DROPDOWN_CATEGORY_HUBS: Record<string, readonly string[]> = {
  all: DROPDOWN_TOP_LEVEL_ALLOWLIST,
  cities: ["/prices"],
  rates: ["/rates"],
  charts: ["/charts", "/prices"],
  banks: ["/codes/banks"],
  postal: ["/codes/postal"],
  geo: ["/geo"],
  airports: ["/airports"],
  airlines: ["/airlines"],
  "oil-gas": ["/oil-gas"],
  ports: ["/ports"],
  howto: ["/howto"],
  tools: ["/tools"],
  trends: ["/trends"],
  other: ["/", "/prices", "/codes", "/hustle", "/exam", "/learn", "/telecom", "/status", "/about", "/privacy"],
} as const;

/**
 * Map any deep index entry to its owning allowlisted section hub so queries like
 * "gtbank", "uba", "umuahia", or "rice" surface the relevant top-level hub in the
 * dropdown while keeping deep leaves strictly on `/search`.
 */
export function owningDropdownHubPath(rawPath: string): string | null {
  const p = normalizeRoutePath(rawPath);
  if (DROPDOWN_ALLOW_SET.has(p)) return p;
  if (p === "/codes/banks" || p.startsWith("/codes/banks/")) return "/codes/banks";
  if (p === "/codes/postal" || p.startsWith("/codes/postal/")) return "/codes/postal";
  const firstSeg = p.split("/").filter(Boolean)[0];
  if (!firstSeg) return "/";
  const candidate = `/${firstSeg}`;
  return DROPDOWN_ALLOW_SET.has(candidate) ? candidate : null;
}

export function getDropdownCandidates(index: SearchEntry[], categoryId: string | null): SearchEntry[] {
  const pool = index.filter((e) => DROPDOWN_ALLOW_SET.has(normalizeRoutePath(e.path)));
  if (!categoryId || categoryId === "all") return pool;
  const hubPaths = DROPDOWN_CATEGORY_HUBS[categoryId];
  if (hubPaths) {
    const hubSet = new Set<string>(hubPaths);
    return pool.filter((e) => hubSet.has(normalizeRoutePath(e.path)));
  }
  return pool;
}

/**
 * Shallow ranked search for the header dropdown:
 *  - Returns ONLY entries in `DROPDOWN_TOP_LEVEL_ALLOWLIST` (never deep leaves).
 *  - Empty query + `all` -> `[]` (dropdown shows Popular shortcuts).
 *  - Empty query + category -> shallow section hub(s) for that category.
 *  - Non-empty query -> ranks allowlisted hubs using direct hub score + rolled-up
 *    deep leaf relevance within the active category, preserving honest empty states
 *    when nothing matches.
 */
export function rankedDropdownSearch(
  entries: SearchEntry[],
  query: string,
  categoryId: string | null,
  limit = 6,
): SearchEntry[] {
  const terms = extractSearchTerms(query);
  const candidates = getDropdownCandidates(entries, categoryId);
  if (terms.length === 0) {
    if (!categoryId || categoryId === "all") return [];
    return candidates.slice(0, limit);
  }

  const candidateByPath = new Map<string, SearchEntry>();
  for (const c of candidates) {
    candidateByPath.set(normalizeRoutePath(c.path), c);
  }

  const scores = new Map<string, number>();
  const isAll = !categoryId || categoryId === "all";
  const catKinds = categoryId ? kindsForCategory(categoryId) : null;

  // 1) Direct score on candidate hubs (for specific categories, only score hub directly
  //    if its own kind belongs to the category so unrelated hub text doesn't false-match).
  for (const [hubPath, hubEntry] of candidateByPath.entries()) {
    if (isAll || !catKinds || catKinds.includes(hubEntry.kind)) {
      const s = scoreEntry(hubEntry, terms);
      if (s > 0) scores.set(hubPath, s + 0.25);
    }
  }

  // 2) Roll up deep matches (filtered by category when active) to their owning allowlisted hub.
  const deepPool = filterByCategory(entries, categoryId);
  for (const entry of deepPool) {
    const s = scoreEntry(entry, terms);
    if (s <= 0) continue;
    let hubPath = owningDropdownHubPath(entry.path);
    // If a category has a single canonical hub (e.g. cities -> /prices, charts -> /charts for /prices/fuel),
    // ensure matches in that category roll up to an allowed hub for that category.
    if (!isAll && hubPath && !candidateByPath.has(hubPath)) {
      const fallbackHub = DROPDOWN_CATEGORY_HUBS[categoryId!]?.[0] ?? null;
      hubPath = fallbackHub && candidateByPath.has(fallbackHub) ? fallbackHub : null;
    }
    if (hubPath && candidateByPath.has(hubPath)) {
      const rolled = s * 0.85;
      const prev = scores.get(hubPath) ?? 0;
      if (rolled > prev) scores.set(hubPath, rolled);
    }
  }

  return [...scores.entries()]
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([p]) => candidateByPath.get(p)!)
    .filter(Boolean);
}

/**
 * Count how many full-index entries match `query` + `categoryId` (used by the
 * dropdown to tell the user accurately what pressing Enter will show on `/search`).
 */
export function countDeepMatches(entries: SearchEntry[], query: string, categoryId: string | null): number {
  const terms = extractSearchTerms(query);
  const pool = filterByCategory(entries, categoryId);
  if (terms.length === 0) return pool.length;
  let n = 0;
  for (const e of pool) {
    if (scoreEntry(e, terms) > 0) n += 1;
  }
  return n;
}

/**
 * Popular shortcuts shown in dropdown when All + empty query.
 * Every shortcut path is in `DROPDOWN_TOP_LEVEL_ALLOWLIST` so dropdown stays strictly shallow.
 */
export const POPULAR_SHORTCUTS: { label: string; path: string; kind: string }[] = [
  { label: "Rates & FX history", path: "/rates", kind: "rates" },
  { label: "Postal codes by state", path: "/codes/postal", kind: "postal" },
  { label: "Bank sort & USSD codes", path: "/codes/banks", kind: "banks" },
  { label: "774 LGAs by state", path: "/geo", kind: "geo" },
  { label: "Food & fuel prices", path: "/prices", kind: "hub" },
  { label: "Data status & sources", path: "/status", kind: "hub" },
];

// ---------------------------------------------------------------------------
// C) Idle search-bar animation — rotating suggestions from real SSOT topics/data
// ---------------------------------------------------------------------------

export type SearchSuggestion = {
  text: string;
  /** Documented SSOT source proving the topic/place/code exists in repo data. */
  source: string;
  /** Real route in `public/search-index.json` that answers this query. */
  href: string;
};

/**
 * Curated suggestion queries rotated in the idle typewriter overlay.
 * Rules:
 *  - Every suggestion maps to real routes & data in `data/*.json` / `public/search-index.json`.
 *  - Never claim a ZIP/postal code for a place absent from `data/postal-codes.json`.
 *  - Decorative overlay only (`aria-hidden="true"`): never populates real `input.value`
 *    or submits accidentally on Enter.
 */
export const SEARCH_SUGGESTIONS: readonly SearchSuggestion[] = [
  {
    text: "prices of fuel today",
    source: "data/live/fuel.json + /prices/fuel — monitored depot petrol, diesel & LPG",
    href: "/prices/fuel",
  },
  {
    text: "what’s the ZIP of Umuahia?",
    source: "data/postal-codes.json — Abia State capital Umuahia GPO 440001 (/codes/postal/abia)",
    href: "/codes/postal/abia",
  },
  {
    text: "prices of rice",
    source: "content/generated/articles.json — dated city rice estimates (/prices/lagos/rice)",
    href: "/prices/lagos/rice",
  },
  {
    text: "dollar rate?",
    source: "data/live/fx.json + /rates — CBN NFEM official vs parallel USD buy quote",
    href: "/rates",
  },
  {
    text: "what can 80k buy in Lagos?",
    source: "content/generated/articles.json — How Far Will ₦80k Go in Lagos? (/prices/cost-of-living) + /learn/budget-80k",
    href: "/prices/cost-of-living",
  },
  {
    text: "how can I change my name on my NIN?",
    source: "data/govhowto.json — slug nin-correction (/howto/nin-correction)",
    href: "/howto/nin-correction",
  },
  {
    text: "GTBank sort code & USSD",
    source: "data/banks.json — GTBank sort 058 & *737# (/codes/banks/gtbank)",
    href: "/codes/banks/gtbank",
  },
  {
    text: "postal code for Ikeja?",
    source: "data/postal-codes.json — Lagos Ikeja 100271 (/codes/postal/lagos/ikeja)",
    href: "/codes/postal/lagos/ikeja",
  },
  {
    text: "what does kelebu mean?",
    source: "data/slang.json — trendingNow kelebu (/trends/kelebu)",
    href: "/trends/kelebu",
  },
  {
    text: "LGAs in Kano State",
    source: "data/lgas.json — Kano State 44 LGAs (/geo/kano)",
    href: "/geo/kano",
  },
  {
    text: "major oil companies in Nigeria",
    source: "data/oil-gas-operators.json — 16 verified major operators (/oil-gas)",
    href: "/oil-gas",
  },
  {
    text: "airlines operating in Nigeria",
    source: "data/airlines.json — 23 verified Nigerian airlines (/airlines)",
    href: "/airlines",
  },
  {
    text: "major seaports in Nigeria",
    source: "data/ports.json — 12 verified Nigerian seaports & marine terminals (/ports)",
    href: "/ports",
  },
] as const;
