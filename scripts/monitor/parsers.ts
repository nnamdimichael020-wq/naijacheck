/**
 * Pure parsers for every live source. No network calls here, so they can be unit-tested
 * against captured fixtures (see parsers.test.ts). Each parser returns null when the page
 * layout is not what we expect, so the runner keeps the last confirmed value instead of
 * writing a guess.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
];
const MONTH_RE = MONTHS.join("|");

export function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Turn HTML into plain text, keeping table cells separated by " | " and rows on new lines. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n");
}

const num = (s: string): number => Number(s.replace(/[,₦\s]/g, ""));

/** "9 October 2026, 5:21 pm WAT" or "9 October 2026 17:07 WAT" -> ISO string (UTC). */
export function watToIso(s: string): string | null {
  const m = s.match(/(\d{1,2}) (\w+) (\d{4}),?\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  const month = MONTHS.findIndex((x) => x.toLowerCase().startsWith(m[2].slice(0, 3).toLowerCase()));
  if (month < 0) return null;
  let hour = Number(m[4]);
  if (m[6]) {
    const pm = m[6].toLowerCase() === "pm";
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
  }
  // WAT is UTC+1
  return new Date(Date.UTC(Number(m[3]), month, Number(m[1]), hour - 1, Number(m[5]))).toISOString();
}

/* ---------- CBN: Nigerian Foreign Exchange Market (official NFEM rate) ---------- */

export function parseCbnNfem(html: string): { date: string; rate: number } | null {
  const text = htmlToText(html).replace(/\s+/g, " ");
  const re = new RegExp(`(${MONTH_RE})-(\\d{2})-(\\d{4})\\s*\\|\\s*([\\d,]+\\.\\d{2,4})`);
  const m = text.match(re);
  if (!m) return null;
  const rate = num(m[4]);
  if (!(rate > 500 && rate < 5000)) return null;
  const mon = MONTHS.indexOf(m[1]) + 1;
  return { date: `${m[3]}-${String(mon).padStart(2, "0")}-${m[2]}`, rate };
}

/* ---------- Aboki Forex: black market buy/sell + CBN widget ---------- */

export type BuySell = { buy: number; sell: number };

export function parseAboki(html: string): {
  asOf: string | null;
  blackMarket: Record<"USD" | "GBP" | "EUR", BuySell> | null;
  cbnOfficial: Partial<Record<"USD" | "GBP" | "EUR", number>>;
} | null {
  const text = htmlToText(html).replace(/\s+/g, " ");
  const pair = (code: string, label: string): BuySell | null => {
    const re = new RegExp(`BUY ₦ ?([\\d,.]+) ${label} SELL ₦ ?([\\d,.]+)`);
    const m = text.match(re);
    if (!m) return null;
    const buy = num(m[1]);
    const sell = num(m[2]);
    return buy > 0 && sell >= buy && sell < buy * 1.2 ? { buy, sell } : null;
  };
  const usd = pair("USD", "DOLLAR \\(USD\\)");
  const gbp = pair("GBP", "POUND \\(GBP\\)");
  const eur = pair("EUR", "EURO \\(EUR\\)");
  if (!usd) return null;

  const cbnSection = text.slice(text.indexOf("Official CBN Exchange Rates"));
  const cbnOfficial: Partial<Record<"USD" | "GBP" | "EUR", number>> = {};
  const cbn = (label: string) => {
    const m = cbnSection.match(new RegExp(`${label} ₦ ?([\\d,.]+)`));
    return m ? num(m[1]) : undefined;
  };
  const cu = cbn("DOLLAR \\(USD\\)");
  const cg = cbn("POUND \\(GBP\\)");
  const ce = cbn("EURO \\(EUR\\)");
  if (cu) cbnOfficial.USD = cu;
  if (cg) cbnOfficial.GBP = cg;
  if (ce) cbnOfficial.EUR = ce;

  const stamp = text.match(/Rates updated ([^.\n]+?WAT)/);
  return {
    asOf: stamp ? watToIso(stamp[1]) : null,
    blackMarket: { USD: usd, GBP: gbp ?? { buy: 0, sell: 0 }, EUR: eur ?? { buy: 0, sell: 0 } },
    cbnOfficial,
  };
}

/* ---------- open.er-api.com: daily reference rates, free, no key ---------- */

export function parseOpenEr(json: unknown): { asOf: string; rates: Record<string, number> } | null {
  const j = json as { result?: string; time_last_update_utc?: string; base_code?: string; rates?: Record<string, number> };
  if (j?.result !== "success" || j.base_code !== "USD" || !j.rates?.NGN || !j.time_last_update_utc) return null;
  const asOf = new Date(j.time_last_update_utc).toISOString();
  return { asOf, rates: { NGN: j.rates.NGN, GBP: j.rates.GBP, EUR: j.rates.EUR } };
}

/* ---------- Awajis depot tables (sourced from petroleumprice.ng, hourly) ---------- */

export type DepotRow = { depot: string; state: string; price: number };
export type FuelParse = {
  asOf: string | null;
  medians: { petrol: number | null; diesel: number | null; lpg: number | null };
  depots: { petrol: DepotRow[]; diesel: DepotRow[]; lpg: DepotRow[] };
  trend30d: { date: string; petrol: number; diesel: number }[];
};

export function parseAwajisFuel(html: string): FuelParse | null {
  const text = htmlToText(html);
  const flat = text.replace(/\s+/g, " ");
  const med = (label: string) => {
    const m = flat.match(new RegExp(`₦([\\d,]+) ${label}`));
    return m ? num(m[1]) : null;
  };
  const medians = {
    petrol: med("Petrol \\(PMS\\)"),
    diesel: med("Diesel \\(AGO\\)"),
    lpg: med("Cooking Gas \\(LPG\\)"),
  };
  const stamp = text.match(/(?:Updated|Last checked:?)\s*(\d{1,2} \w+ \d{4},?\s*\d{1,2}:\d{2}\s*[ap]m WAT)/i);
  const asOf = stamp ? watToIso(stamp[1]) : null;

  // Walk the text line by line, switching product when a section heading appears.
  const depots: FuelParse["depots"] = { petrol: [], diesel: [], lpg: [] };
  let current: keyof FuelParse["depots"] | null = null;
  const rowRe = /^\|?\s*([^|\n]+?)\s*\|\s*([^|\n]+?)\s*\|\s*([\d,]+\.\d{2})\s*\|/;
  const trendRe = /^\|?\s*(\d{1,2} \w{3})\s*\|\s*([\d,]+\.\d{2})\s*\|\s*([\d,]+\.\d{2})/;
  const trend30d: FuelParse["trend30d"] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (/Petrol \(PMS\) depot prices/i.test(line)) current = "petrol";
    else if (/Diesel \(AGO\) depot prices/i.test(line)) current = "diesel";
    else if (/Cooking Gas \(LPG\) depot prices/i.test(line)) current = "lpg";
    else if (/trend|Pump prices this week|Official pump prices|pump price/i.test(line)) current = null;

    // Trend rows have two numeric columns after the date, so check them before depot rows.
    const t = line.match(trendRe);
    if (t) {
      trend30d.push({ date: t[1], petrol: num(t[2]), diesel: num(t[3]) });
      continue;
    }
    const r = line.match(rowRe);
    if (r && current && !/^[\d,.]+$/.test(r[2].trim()) && !/^(Depot|State|Date)$/i.test(r[1].trim())) {
      depots[current].push({ depot: r[1].trim(), state: r[2].trim(), price: num(r[3]) });
    }
  }

  const hasAny = medians.petrol || depots.petrol.length || depots.diesel.length;
  if (!hasAny) return null;
  return { asOf, medians, depots, trend30d };
}

/* ---------- Google News RSS (public feed, no key) ---------- */

export type FeedItem = { title: string; link: string; source: string; published: string };

export function parseNewsRss(xml: string): FeedItem[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const out: FeedItem[] = [];
  for (const it of items) {
    const get = (tag: string) => {
      const m = it.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
      return m ? decodeEntities(m[1]).trim() : "";
    };
    const source = get("source");
    let title = get("title");
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const link = get("link");
    const pub = Date.parse(get("pubDate"));
    if (!title || !link || Number.isNaN(pub)) continue;
    out.push({ title, link, source, published: new Date(pub).toISOString() });
  }
  return out;
}

/** Count items published in the last `days` days relative to `now`. */
export function countRecent(items: FeedItem[], days: number, now: number): number {
  const cutoff = now - days * 86400000;
  return items.filter((i) => Date.parse(i.published) >= cutoff).length;
}

/* ---------- Wikimedia Pageviews (official REST API) ---------- */

export function sumPageviews(json: unknown): { total: number; days: number } | null {
  const items = (json as { items?: { views: number }[] })?.items;
  if (!items?.length) return null;
  return { total: items.reduce((a, b) => a + b.views, 0), days: items.length };
}

/* ---------- Official page change detection ---------- */

/** Stable 32-bit FNV-1a hash of the visible text, so layout noise is ignored. */
export function pageFingerprint(html: string): string {
  const text = htmlToText(html).replace(/\s+/g, " ").toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
