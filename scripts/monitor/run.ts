/**
 * Live monitor. Fetches every configured source, parses it, and writes:
 *   data/live/fx.json        CBN NFEM official rate, black market (Aboki), reference cross rates
 *   data/live/fuel.json      Depot medians and depot tables (Awajis, from petroleumprice.ng)
 *   data/live/feeds.json     Headlines per topic (Google News RSS)
 *   data/live/trends.json    News mentions and Wikipedia pageview signals per trend term
 *   data/live/watch.json     Fingerprints of official pages (changes are flagged, never auto-written)
 *   data/live/health.json    Per-source status: last success, last error
 * It also patches the data files the pages already read (rates.json, fuel.json, slang.json),
 * so every page picks up the new numbers on the next build.
 *
 * A source that fails or changes layout keeps its last confirmed value and is marked stale in
 * health.json. Nothing is invented.
 *
 * Run: npm run monitor   (the GitHub Action runs this every 3 hours)
 */
import fs from "node:fs";
import path from "node:path";
import * as P from "./parsers";

const ROOT = path.resolve(__dirname, "../..");
const DATA = path.join(ROOT, "data");
const LIVE = path.join(DATA, "live");
const UA = "NaijaCheckMonitor/1.0 (+https://naijacheck.ng; daily price monitor)";
const NOW = Date.now();
const NOW_ISO = new Date(NOW).toISOString();

const SOURCES = {
  cbn: { label: "Central Bank of Nigeria: NFEM exchange rates", url: "https://www.cbn.gov.ng/rates/ExchRateByCurrency.html" },
  aboki: { label: "Aboki Forex: black market and CBN widget", url: "https://abokiforex.app/" },
  openEr: { label: "open.er-api.com: daily reference rates", url: "https://open.er-api.com/v6/latest/USD" },
  awajis: { label: "Awajis fuel tables (petroleumprice.ng depot data)", url: "https://awajis.com/fuel-price-in-nigeria-today/" },
  news: { label: "Google News (public RSS)", url: "https://news.google.com/rss/search?hl=en-NG&gl=NG&ceid=NG:en&q=" },
  wiki: { label: "Wikimedia Pageviews API", url: "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/" },
};

/** Topics shown in the live feeds. Each query is a plain Google News search. */
const FEED_TOPICS: { slug: string; label: string; q: string }[] = [
  { slug: "fuel", label: "Fuel", q: "petrol price Nigeria" },
  { slug: "dollar", label: "Dollar and naira", q: "naira dollar exchange rate Nigeria" },
  { slug: "jamb", label: "JAMB and admissions", q: "JAMB cut-off mark 2026" },
  { slug: "telecom", label: "Data and telecom", q: "MTN Airtel Glo data price Nigeria" },
  { slug: "identity", label: "Passports and NIN", q: "Nigeria passport fee NIN registration" },
  { slug: "food", label: "Food prices", q: "rice garri beans price Nigeria market" },
];

/** Wikipedia articles used as a second, official signal of public attention. */
const WIKI_ARTICLES = ["Nigeria", "Nigerian_naira", "Dangote_Refinery", "Lagos", "Joint_Admissions_and_Matriculation_Board", "Afrobeats"];

/** Official pages watched for changes. A changed fingerprint is a flag, not an auto-edit. */
const WATCH = [
  { id: "jamb", label: "JAMB", url: "https://www.jamb.gov.ng/" },
  { id: "nimc", label: "NIMC (NIN)", url: "https://nimc.gov.ng/" },
  { id: "immigration", label: "Nigeria Immigration Service", url: "https://portal.immigration.gov.ng/" },
  { id: "cbn", label: "Central Bank of Nigeria", url: "https://www.cbn.gov.ng/" },
];

type Health = Record<string, { ok: boolean; checkedAt: string; asOf?: string | null; error?: string; lastSuccessfulAt?: string | null }>;
const health: Health = readJson(path.join(LIVE, "health.json"), {});
let successfulSources = 0;

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

async function get(url: string, as: "text" | "json" = "text"): Promise<string | unknown> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: as === "json" ? "application/json" : "text/html,application/xml;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return as === "json" ? res.json() : res.text();
}

/** Run one source; record health; return null on failure so callers keep the last value. */
async function step<T>(key: string, fn: () => Promise<T | null>): Promise<T | null> {
  try {
    const value = await fn();
    if (value === null) throw new Error("layout not recognised");
    health[key] = { ok: true, checkedAt: NOW_ISO, asOf: (value as { asOf?: string | null })?.asOf ?? null, lastSuccessfulAt: NOW_ISO };
    successfulSources += 1;
    console.log(`[monitor] ok   ${key}`);
    return value;
  } catch (e) {
    const prev = health[key];
    health[key] = { ok: false, checkedAt: NOW_ISO, asOf: prev?.asOf ?? null, lastSuccessfulAt: prev?.lastSuccessfulAt ?? null, error: (e as Error).message };
    console.warn(`[monitor] FAIL ${key}: ${(e as Error).message}`);
    return null;
  }
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, "");

type HistoryPoint = { dataset: string; observedAt: string; sourceTime: string; value: number; unit: string; geography: string; sourceUrl: string };
function appendHistory(point: HistoryPoint) {
  const file = path.join(DATA, "history.json");
  const history = readJson<{ collectionStartedAt: string | null; points: HistoryPoint[] }>(file, { collectionStartedAt: null, points: [] });
  const last = [...history.points].reverse().find((p) => p.dataset === point.dataset);
  // Store only successful, changed observations. Never backfill or duplicate an unchanged value.
  if (!last || last.value !== point.value || last.sourceTime !== point.sourceTime) history.points.push(point);
  history.points = history.points.slice(-400); // bounded repository growth across all datasets
  history.collectionStartedAt = history.points[0]?.observedAt ?? null;
  writeJson(file, history);
}

async function main() {
  /* ---------- FX ---------- */
  const cbnHtml = await step("cbn", async () => {
    const html = (await get(SOURCES.cbn.url)) as string;
    const r = P.parseCbnNfem(html);
    return r ? { ...r, asOf: new Date(`${r.date}T15:00:00+01:00`).toISOString() } : null;
  });
  const aboki = await step("aboki", async () => P.parseAboki((await get(SOURCES.aboki.url)) as string));
  const openEr = await step("openEr", async () => P.parseOpenEr(await get(SOURCES.openEr.url, "json")));

  const fxPath = path.join(LIVE, "fx.json");
  const prevFx = readJson<any>(fxPath, {});
  const fx: any = {
    checkedAt: cbnHtml || aboki || openEr ? NOW_ISO : prevFx.checkedAt ?? null,
    // A failed source keeps its last confirmed value, so one bad fetch never blanks the page.
    official: {
      USD: cbnHtml?.rate ?? prevFx.official?.USD ?? null,
      GBP: openEr ? Math.round((openEr.rates.NGN / openEr.rates.GBP) * 100) / 100 : prevFx.official?.GBP ?? null,
      EUR: openEr ? Math.round((openEr.rates.NGN / openEr.rates.EUR) * 100) / 100 : prevFx.official?.EUR ?? null,
    },
    seeded: cbnHtml || aboki ? false : prevFx.seeded ?? false,
    officialAsOf: cbnHtml?.asOf ?? (prevFx as { officialAsOf?: string }).officialAsOf ?? null,
    officialSource: cbnHtml ? SOURCES.cbn : (prevFx as { officialSource?: unknown }).officialSource ?? SOURCES.cbn,
    crossRateAsOf: openEr?.asOf ?? prevFx.crossRateAsOf ?? null,
    crossRateSource: openEr ? SOURCES.openEr : prevFx.crossRateSource ?? null,
    blackMarket: aboki?.blackMarket
      ? {
          USD: aboki.blackMarket.USD,
          GBP: aboki.blackMarket.GBP.buy ? aboki.blackMarket.GBP : null,
          EUR: aboki.blackMarket.EUR.buy ? aboki.blackMarket.EUR : null,
        }
      : (prevFx as { blackMarket?: unknown }).blackMarket ?? null,
    blackMarketAsOf: aboki?.asOf ?? (prevFx as { blackMarketAsOf?: string }).blackMarketAsOf ?? null,
    blackMarketSource: SOURCES.aboki,
    cbnWidgetOfficial: aboki?.cbnOfficial ?? null,
  };
  writeJson(fxPath, fx);
  if (cbnHtml?.rate && cbnHtml.asOf) appendHistory({ dataset: "cbn-usd-ngn", observedAt: NOW_ISO, sourceTime: cbnHtml.asOf, value: cbnHtml.rate, unit: "NGN per USD", geography: "Nigeria", sourceUrl: SOURCES.cbn.url });
  if (aboki?.blackMarket?.USD?.buy && aboki.asOf) appendHistory({ dataset: "parallel-usd-ngn-buy", observedAt: NOW_ISO, sourceTime: aboki.asOf, value: aboki.blackMarket.USD.buy, unit: "NGN per USD", geography: "Nigeria indicative quote", sourceUrl: SOURCES.aboki.url });

  // Patch the file the pages read. Black market headline uses the BUY rate, as Aboki does.
  const rates = readJson<Record<string, any>>(path.join(DATA, "rates.json"), {});
  if (cbnHtml || aboki) {
  if (fx.official.USD) {
    rates.official = { USD: fx.official.USD, GBP: fx.official.GBP ?? rates.official?.GBP, EUR: fx.official.EUR ?? rates.official?.EUR };
  }
  if (fx.blackMarket) {
    rates.blackMarket = {
      USD: fx.blackMarket.USD.buy,
      GBP: fx.blackMarket.GBP?.buy ?? rates.blackMarket?.GBP,
      EUR: fx.blackMarket.EUR?.buy ?? rates.blackMarket?.EUR,
    };
    rates.blackMarketSell = { USD: fx.blackMarket.USD.sell, GBP: fx.blackMarket.GBP?.sell ?? null, EUR: fx.blackMarket.EUR?.sell ?? null };
  }
  rates.updatedAt = NOW_ISO;
  rates.status = "live";
  rates.sources = [
    { label: SOURCES.cbn.label, url: SOURCES.cbn.url, asOf: fx.officialAsOf },
    { label: SOURCES.aboki.label, url: SOURCES.aboki.url, asOf: fx.blackMarketAsOf },
    { label: SOURCES.openEr.label, url: SOURCES.openEr.url, asOf: fx.crossRateAsOf },
  ];
  rates.note =
    "Official USD is the CBN NFEM closing rate. Black market is Aboki Forex's buy rate (sell in blackMarketSell). GBP and EUR official values are cross rates from open.er-api, labelled as reference, not CBN quotes.";
  writeJson(path.join(DATA, "rates.json"), rates);
  }

  /* ---------- Fuel ---------- */
  const fuelParse = await step("awajis", async () => P.parseAwajisFuel((await get(SOURCES.awajis.url)) as string));
  if (fuelParse) {
    const fuelLive = { ...fuelParse, checkedAt: NOW_ISO, seeded: false, source: SOURCES.awajis };
    writeJson(path.join(LIVE, "fuel.json"), fuelLive);
    for (const [product, value] of Object.entries(fuelParse.medians)) {
      if (typeof value === "number" && fuelParse.asOf) appendHistory({ dataset: `fuel-depot-${product}`, observedAt: NOW_ISO, sourceTime: fuelParse.asOf, value, unit: product === "lpg" ? "NGN per kg" : "NGN per litre", geography: "Nigeria depot median", sourceUrl: SOURCES.awajis.url });
    }

    const fuel = readJson<Record<string, any>>(path.join(DATA, "fuel.json"), {});
    const lagosDiesel = fuelParse.depots.diesel.filter((d) => d.state === "Lagos").map((d) => d.price);
    const set = (name: string, patch: Record<string, unknown>) => {
      const row = fuel.depots?.find((d: { name: string }) => d.name === name);
      if (row) Object.assign(row, patch);
    };
    const day = (fuelParse.asOf ?? NOW_ISO).slice(0, 10);
    if (fuelParse.medians.petrol) set("National median depot (petrol)", { price: fuelParse.medians.petrol, date: day });
    if (fuelParse.medians.diesel) set("National median depot (diesel)", { price: fuelParse.medians.diesel, date: day });
    if (fuelParse.medians.lpg) set("National median depot (cooking gas, LPG)", { price: fuelParse.medians.lpg, date: day });
    if (lagosDiesel.length) set("Lagos depot cluster (diesel)", { range: [Math.min(...lagosDiesel), Math.max(...lagosDiesel)], date: day });
    fuel.updatedAt = NOW_ISO;
    fuel.status = "live";
    fuel.sources = [
      { label: SOURCES.awajis.label, url: SOURCES.awajis.url, asOf: fuelParse.asOf },
      { label: "NNPC and Dangote pump and gantry prices: see news feed. Not auto-parsed.", url: SOURCES.news.url + "petrol+price+nigeria" },
    ];
    writeJson(path.join(DATA, "fuel.json"), fuel);
  }

  /* ---------- News feeds ---------- */
  const feeds: Record<string, unknown> = { checkedAt: NOW_ISO, seeded: false, source: { label: SOURCES.news.label, url: SOURCES.news.url }, topics: [] };
  const allItems: Record<string, P.FeedItem[]> = {};
  const feedOk = await step("news", async () => {
    let any = false;
    for (const t of FEED_TOPICS) {
      try {
        const xml = (await get(SOURCES.news.url + encodeURIComponent(t.q))) as string;
        const items = P.parseNewsRss(xml);
        allItems[t.slug] = items;
        (feeds.topics as unknown[]).push({ slug: t.slug, label: t.label, query: t.q, items: items.slice(0, 8) });
        any = true;
      } catch (e) {
        console.warn(`[monitor] news topic ${t.slug}: ${(e as Error).message}`);
      }
    }
    if (!any) throw new Error("every news topic failed");
    return { asOf: NOW_ISO };
  });
  if (feedOk) writeJson(path.join(LIVE, "feeds.json"), feeds);

  /* ---------- Trend signals ---------- */
  const slang = readJson<Record<string, any>>(path.join(DATA, "slang.json"), {});
  const terms: { slug: string; term: string; mentions7d: number }[] = [];
  const news = Object.values(allItems).flat();
  // One query per term, same source as feeds. Counts only items the RSS returned, so this is a floor.
  for (const t of (slang.terms ?? []) as { slug: string; term: string }[]) {
    try {
      const items = P.parseNewsRss((await get(SOURCES.news.url + encodeURIComponent(`"${t.term}" Nigeria`))) as string);
      terms.push({ slug: t.slug, term: t.term, mentions7d: P.countRecent(items, 7, NOW) });
    } catch (e) {
      console.warn(`[monitor] term ${t.term}: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  if (terms.length && !feedOk) successfulSources += 1; // term queries can succeed even if all topic-feed queries failed
  const max = Math.max(0, ...terms.map((t) => t.mentions7d));
  const scored = terms.map((t) => ({ ...t, score: max ? Math.round((t.mentions7d / max) * 100) : 0 }));

  const wiki = await step("wiki", async () => {
    const out: { article: string; views7d: number; prev7d: number; changePct: number | null }[] = [];
    const end = NOW - 86400000;
    for (const a of WIKI_ARTICLES) {
      try {
        const last7 = P.sumPageviews(await get(`${SOURCES.wiki.url}${a}/daily/${isoDay(end - 6 * 86400000)}/${isoDay(end)}`, "json"));
        const prev7 = P.sumPageviews(await get(`${SOURCES.wiki.url}${a}/daily/${isoDay(end - 13 * 86400000)}/${isoDay(end - 7 * 86400000)}`, "json"));
        if (!last7) continue;
        const prev = prev7?.total ?? 0;
        out.push({ article: a.replace(/_/g, " "), views7d: last7.total, prev7d: prev, changePct: prev ? Math.round(((last7.total - prev) / prev) * 1000) / 10 : null });
      } catch (e) {
        console.warn(`[monitor] wiki ${a}: ${(e as Error).message}`);
      }
    }
    return out.length ? { asOf: NOW_ISO, articles: out } : null;
  });

  if (terms.length || wiki) writeJson(path.join(LIVE, "trends.json"), {
    checkedAt: NOW_ISO,
    seeded: false,
    method:
      "Mentions = Google News items for \"term\" Nigeria published in the last 7 days (the feed returns the most recent items, so this is a floor). Score = mentions scaled to the highest term today. Wikipedia = official pageviews, last 7 days vs previous 7.",
    limitation: "X and TikTok are not read. Their data needs a paid API, so these signals come from news and Wikipedia only.",
    terms: scored.sort((a, b) => b.score - a.score),
    wiki: wiki?.articles ?? [],
    sources: [SOURCES.news, SOURCES.wiki],
  });

  if (terms.length) {
    // Patch slang.json so the trend badges and "trending now" list follow live counts.
    const byslug = new Map(scored.map((s) => [s.slug, s]));
    for (const t of slang.terms as any[]) {
      const s = byslug.get(t.slug);
      if (!s) continue;
      t.trendScore = s.score;
      t.trend = s.score >= 60 ? "rising" : s.score >= 25 ? "steady" : "quiet";
      t.mentions7d = s.mentions7d;
    }
    slang.trendingNow = scored.filter((s) => s.mentions7d > 0).sort((a, b) => b.score - a.score).slice(0, 5).map((s) => s.slug);
    if (!slang.trendingNow.length) slang.trendingNow = (slang.terms as any[]).slice(0, 5).map((t) => t.slug);
    slang.updatedAt = NOW_ISO;
    slang.trendSource = "Google News mentions (7 days) and Wikipedia pageviews. Not X or TikTok.";
    writeJson(path.join(DATA, "slang.json"), slang);
  }

  /* ---------- Official page change watch ---------- */
  const watchPath = path.join(LIVE, "watch.json");
  const prevWatch = readJson<{ pages: Record<string, any> }>(watchPath, { pages: {} });
  const pages: Record<string, any> = {};
  let watchSuccesses = 0;
  for (const w of WATCH) {
    try {
      const fp = P.pageFingerprint((await get(w.url)) as string);
      const prev = prevWatch.pages[w.id];
      const changed = !!prev && prev.fingerprint !== fp;
      watchSuccesses += 1;
      pages[w.id] = {
        label: w.label,
        url: w.url,
        fingerprint: fp,
        lastChecked: NOW_ISO,
        changedAt: changed ? NOW_ISO : prev?.changedAt ?? null,
        changedSincePrevious: changed,
      };
    } catch (e) {
      pages[w.id] = { ...prevWatch.pages[w.id], label: w.label, url: w.url, error: (e as Error).message };
    }
  }
  successfulSources += watchSuccesses;
  writeJson(watchPath, { checkedAt: watchSuccesses ? NOW_ISO : (prevWatch as { checkedAt?: string | null }).checkedAt ?? null, seeded: watchSuccesses ? false : (prevWatch as { seeded?: boolean }).seeded ?? true, note: "A changed fingerprint means the official page wording changed. A person should read it before any fee or rule is updated.", pages });

  writeJson(path.join(LIVE, "health.json"), health);
  if (successfulSources === 0) throw new Error("Every configured source failed; last-good snapshots were preserved");
  console.log(`[monitor] done ${NOW_ISO}; ${successfulSources} source groups succeeded`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
