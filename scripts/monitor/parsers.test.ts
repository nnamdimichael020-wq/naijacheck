/**
 * Fixture tests for the live-source parsers. Fixtures are trimmed from real responses captured
 * on 9 Oct 2026. Run with: npm run monitor:test
 */
import assert from "node:assert/strict";
import {
  parseCbnNfem,
  hasCbnNfemTable,
  parseCbnNfemApi,
  parseAboki,
  parseOpenEr,
  parseAwajisFuel,
  parseNewsRss,
  countRecent,
  sumPageviews,
  watToIso,
  pageFingerprint,
  CHART_MIN_POINTS,
  HISTORY_WINDOWS,
  MAX_HISTORY_POINTS_PER_DATASET,
  appendBoundedHistory,
  availableHistoryWindows,
  computeDatasetDelta,
  describeHistorySeries,
  filterHistoryWindow,
  getDatasetHistory,
  historyMarkerStride,
  historyPointTimeMs,
  historyPolylinePoints,
  historySeriesDomain,
  projectHistorySeries,
  summarizeHistorySeries,
  type HistoryPoint,
  type HistoryStore,
} from "./parsers";
import { scanArticleRecord, scanOfficialWatchState } from "../../lib/content-audit";
import { formatWatDay, formatWatDayShort, formatWatDayTime, formatWatFull } from "../../lib/utils";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};

test("CBN uses the exact NFEM Rate column and newest dated row", () => {
  const html = `<table><tr><th>Date</th><th>Opening Rate</th><th>NFEM Rate (₦/US$)</th><th>Closing Rate</th></tr>
    <tr><td>October-08-2026</td><td>1,100.00</td><td>1,332.1021</td><td>1,999.00</td></tr>
    <tr><td>October-09-2026</td><td>1,200.00</td><td>1,331.1860</td><td>1,888.00</td></tr></table>`;
  assert.deepEqual(parseCbnNfem(html), { date: "2026-10-09", rate: 1331.186 });
});

test("CBN rejects nearby numbers unless Date and exact NFEM Rate headers exist", () => {
  const noHeader = `<p>October-09-202613181320</p><table><tr><td>October-09-2026</td><td>1,331.1860</td></tr></table>`;
  const wrongHeader = `<table><tr><th>Date</th><th>Official Rate</th></tr><tr><td>October-09-2026</td><td>1,331.1860</td></tr></table>`;
  const implausible = `<table><tr><th>Date</th><th>NFEM Rate</th></tr><tr><td>October-09-2026</td><td>13.5000</td></tr></table>`;
  assert.equal(parseCbnNfem(noHeader), null);
  assert.equal(parseCbnNfem(wrongHeader), null);
  assert.equal(hasCbnNfemTable(wrongHeader), false);
  assert.equal(parseCbnNfem(implausible), null);
});

test("CBN captured page schema gates its JSON endpoint and newest row", () => {
  const capturedPage = `<table><tr><td colspan="10">NIGERIAN FOREIGN EXCHANGE MARKET (NFEM) RATES (₦/US$)</td></tr>
    <tr><td>Date</td><td>NFEM Rate (₦/US$)</td><td>Highest Rate (₦/US$)</td></tr></table>`;
  const capturedApi = [
    { ratedate: "2026-10-08T00:00:00", weightedAvgRate: "1,332.1021", highestrate: 1400 },
    { ratedate: "2026-10-09T00:00:00", weightedAvgRate: 1331.186, highestrate: 1500 },
  ];
  assert.equal(hasCbnNfemTable(capturedPage), true);
  assert.deepEqual(parseCbnNfemApi(capturedApi), { date: "2026-10-09", rate: 1331.186 });
  assert.equal(parseCbnNfemApi([{ ratedate: "2026-10-09", highestrate: 1331.186 }]), null);
});

test("Aboki black market and CBN widget parse from captured text", () => {
  const html = `<p>Rates updated 9 October 2026, 17:07 WAT</p>
    <p>BUY</p><p>₦1370</p><p>DOLLAR (USD)</p><p>SELL</p><p>₦1380</p>
    <p>BUY</p><p>₦1825</p><p>POUND (GBP)</p><p>SELL</p><p>₦1845</p>
    <p>BUY</p><p>₦1520</p><p>EURO (EUR)</p><p>SELL</p><p>₦1540</p>
    <h2>Official CBN Exchange Rates</h2>
    <p>DOLLAR (USD)</p><p>₦ 1332.10</p><p>POUND (GBP)</p><p>₦ 1759.17</p><p>EURO (EUR)</p><p>₦ 1490.22</p>`;
  const r = parseAboki(html);
  assert.ok(r);
  assert.deepEqual(r!.blackMarket!.USD, { buy: 1370, sell: 1380 });
  assert.deepEqual(r!.blackMarket!.GBP, { buy: 1825, sell: 1845 });
  assert.equal(r!.cbnOfficial.USD, 1332.1);
  assert.equal(r!.cbnOfficial.GBP, 1759.17);
  assert.equal(r!.asOf, "2026-10-09T16:07:00.000Z");
});

test("open.er-api JSON parses NGN, GBP and EUR with its own timestamp", () => {
  const json = {
    result: "success",
    time_last_update_utc: "Fri, 09 Oct 2026 00:02:31 +0000",
    base_code: "USD",
    rates: { NGN: 1331.013867, GBP: 0.756516, EUR: 0.892251 },
  };
  const r = parseOpenEr(json);
  assert.equal(r!.rates.NGN, 1331.013867);
  assert.equal(r!.asOf, "2026-10-09T00:02:31.000Z");
  assert.equal(parseOpenEr({ result: "error" }), null);
});

test("Awajis depot medians, depot rows and 30-day trend parse", () => {
  const html = `<p>Updated 9 Oct 2026, 5:21 pm WAT</p>
    <p><b>₦1,350</b> Petrol (PMS) · median depot, per litre</p>
    <p><b>₦1,855</b> Diesel (AGO) · median depot, per litre</p>
    <p><b>₦1,160</b> Cooking Gas (LPG) · median depot</p>
    <h3>Petrol (PMS) depot prices</h3>
    <table><tr><th>Depot</th><th>State</th><th>Price (₦)</th></tr>
    <tr><td>Aipec</td><td>Lagos</td><td>1,340.00</td><td>▲ +16.00</td></tr>
    <tr><td>Stockgap</td><td>Rivers</td><td>1,360.00</td><td>▲ +63.00</td></tr></table>
    <h3>Diesel (AGO) depot prices</h3>
    <table><tr><td>Ibachem</td><td>Lagos</td><td>1,800.00</td><td>▼ -100.00</td></tr>
    <tr><td>Ascon</td><td>Lagos</td><td>1,900.00</td><td>▲ +150.00</td></tr></table>
    <h3>Cooking Gas (LPG) depot prices</h3>
    <table><tr><td>Dangote</td><td>Lagos</td><td>1,010.00</td><td>▲ +20.00</td></tr></table>
    <h3>30-day national average trend</h3>
    <table><tr><td>9 Oct</td><td>1,352.38</td><td>1,870.39</td></tr></table>
    <p>Pump prices this week</p>`;
  const r = parseAwajisFuel(html);
  assert.ok(r);
  assert.deepEqual(r!.medians, { petrol: 1350, diesel: 1855, lpg: 1160 });
  assert.equal(r!.asOf, "2026-10-09T16:21:00.000Z");
  assert.equal(r!.depots.petrol.length, 2);
  assert.deepEqual(r!.depots.diesel[1], { depot: "Ascon", state: "Lagos", price: 1900 });
  assert.equal(r!.depots.lpg[0].depot, "Dangote");
  assert.equal(r!.trend30d[0].petrol, 1352.38);
});

test("Awajis accepts decimals, optional naira signs, changed heading order and month-first source time", () => {
  const html = `<p>Last updated: October 9, 2026 at 5:21 pm WAT</p>
    <p>Diesel (AGO) median: 1,855.75</p>
    <h3>Latest LPG depot prices</h3><table>
    <tr><th>Depot</th><th>State</th><th>Price</th></tr>
    <tr><td>Coastal Energy</td><td>Rivers</td><td>₦1,010</td></tr></table>`;
  const r = parseAwajisFuel(html);
  assert.ok(r);
  assert.equal(r!.medians.diesel, 1855.75);
  assert.equal(r!.medians.petrol, null);
  assert.deepEqual(r!.depots.lpg[0], { depot: "Coastal Energy", state: "Rivers", price: 1010 });
  assert.equal(r!.asOf, "2026-10-09T16:21:00.000Z");
});

test("Awajis succeeds when an independent diesel/LPG median is the only value", () => {
  assert.equal(parseAwajisFuel("<p>₦1,855.50 Diesel (AGO)</p>")!.medians.diesel, 1855.5);
  assert.equal(parseAwajisFuel("<p>Cooking Gas (LPG): ₦1,160.25</p>")!.medians.lpg, 1160.25);
  assert.equal(parseAwajisFuel("<html><body>Maintenance</body></html>"), null);
});

test("Google News RSS items parse, strip the source suffix and decode entities", () => {
  const xml = `<?xml version="1.0"?><rss><channel><title>x</title>
    <item><title>NNPC extends N66 petrol discount to October 31 - Punch Newspapers</title>
      <link>https://news.google.com/rss/articles/abc?oc=5</link>
      <pubDate>Fri, 09 Oct 2026 11:06:28 GMT</pubDate>
      <source url="https://punchng.com">Punch Newspapers</source></item>
    <item><title>Rand &amp; naira &#39;steady&#39;</title>
      <link>https://news.google.com/rss/articles/def</link>
      <pubDate>Thu, 01 Oct 2026 08:00:00 GMT</pubDate>
      <source url="https://x.com">X</source></item>
    <item><title>No link here</title><pubDate>Fri, 09 Oct 2026 11:06:28 GMT</pubDate></item>
    </channel></rss>`;
  const items = parseNewsRss(xml);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "NNPC extends N66 petrol discount to October 31");
  assert.equal(items[0].source, "Punch Newspapers");
  assert.equal(items[1].title, "Rand & naira 'steady'");
  const now = Date.parse("2026-10-09T12:00:00Z");
  assert.equal(countRecent(items, 7, now), 1); // Oct 1 item is 8 days old
  assert.equal(countRecent(items, 10, now), 2);
});

test("Wikimedia pageviews sum", () => {
  const r = sumPageviews({ items: [{ views: 100 }, { views: 50 }] });
  assert.deepEqual(r, { total: 150, days: 2 });
});

test("WAT parsing handles 12-hour and 24-hour forms", () => {
  assert.equal(watToIso("9 October 2026, 12:00 am WAT"), "2026-10-08T23:00:00.000Z");
  assert.equal(watToIso("9 October 2026 17:07 WAT"), "2026-10-09T16:07:00.000Z");
});

test("Page fingerprint ignores whitespace and markup changes but not wording", () => {
  const a = pageFingerprint("<p>Fee is  ₦25,000</p>");
  const b = pageFingerprint("<div><p>Fee is ₦25,000</p></div>");
  const c = pageFingerprint("<p>Fee is ₦30,000</p>");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("Bounded history appends only real observations, deduplicates, and caps per dataset at 56", () => {
  let store: HistoryStore = { collectionStartedAt: null, points: [] };
  const basePoint: HistoryPoint = {
    dataset: "cbn-usd-ngn",
    observedAt: "2026-10-09T15:00:00.000Z",
    sourceTime: "2026-10-09T14:00:00.000Z",
    value: 1331.186,
    unit: "NGN per USD",
    geography: "Nigeria",
    sourceUrl: "https://www.cbn.gov.ng/rates/ExchRateByCurrency.html",
  };
  store = appendBoundedHistory(store, basePoint);
  assert.equal(store.points.length, 1);
  // Fewer than two real points: delta must be null
  assert.equal(computeDatasetDelta(store, "cbn-usd-ngn"), null);

  // Duplicate reading with identical sourceTime and value is ignored
  store = appendBoundedHistory(store, { ...basePoint, observedAt: "2026-10-09T18:00:00.000Z" });
  assert.equal(store.points.length, 1);

  // Invalid / non-positive / missing-timestamp readings are rejected (never invent points)
  store = appendBoundedHistory(store, { ...basePoint, value: 0, sourceTime: "2026-10-10T14:00:00.000Z" });
  store = appendBoundedHistory(store, { ...basePoint, value: Number.NaN, sourceTime: "2026-10-10T14:00:00.000Z" });
  store = appendBoundedHistory(store, { ...basePoint, sourceTime: "not-a-date" });
  assert.equal(store.points.length, 1);

  // Append 60 valid parallel USD points and 2 valid depot petrol points
  for (let i = 0; i < 60; i++) {
    const ts = new Date(Date.UTC(2026, 9, 1, 0, 0, 0) + i * 3 * 3600_000).toISOString();
    store = appendBoundedHistory(store, {
      dataset: "parallel-usd-ngn-buy",
      observedAt: ts,
      sourceTime: ts,
      value: 1350 + i,
      unit: "NGN per USD",
      geography: "Nigeria indicative quote",
      sourceUrl: "https://abokiforex.app/",
    });
  }
  store = appendBoundedHistory(store, {
    dataset: "fuel-depot-petrol",
    observedAt: "2026-10-10T12:30:00.000Z",
    sourceTime: "2026-10-10T12:21:00.000Z",
    value: 1342.5,
    unit: "NGN per litre",
    geography: "Nigeria depot median",
    sourceUrl: "https://awajis.com/fuel-price-in-nigeria-today/",
  });
  store = appendBoundedHistory(store, {
    dataset: "fuel-depot-petrol",
    observedAt: "2026-10-11T19:33:00.000Z",
    sourceTime: "2026-10-11T18:21:00.000Z",
    value: 1341,
    unit: "NGN per litre",
    geography: "Nigeria depot median",
    sourceUrl: "https://awajis.com/fuel-price-in-nigeria-today/",
  });

  const parallelPoints = getDatasetHistory(store, "parallel-usd-ngn-buy");
  assert.equal(parallelPoints.length, MAX_HISTORY_POINTS_PER_DATASET);
  assert.equal(parallelPoints[0].value, 1354); // oldest 4 of 60 were trimmed
  assert.equal(parallelPoints.at(-1)?.value, 1409);

  // High-frequency parallel updates must not evict CBN or depot petrol observations
  assert.equal(getDatasetHistory(store, "cbn-usd-ngn").length, 1);
  const fuelDelta = computeDatasetDelta(store, "fuel-depot-petrol");
  assert.ok(fuelDelta);
  assert.equal(fuelDelta!.delta, -1.5);
  assert.equal(fuelDelta!.direction, "down");
  assert.equal(fuelDelta!.previous.value, 1342.5);
  assert.equal(fuelDelta!.latest.value, 1341);
});

/* ---------- Phase B: charts may only draw real stored observations ---------- */

const DAY = 86_400_000;
const CHART_NOW = Date.parse("2026-10-11T21:00:00.000Z");

/** Builds real-shaped points at a fixed offset before CHART_NOW. No point is ever synthesised by the chart code. */
function pointAt(dataset: string, daysAgo: number, value: number, hourUtc = 12): HistoryPoint {
  const ms = CHART_NOW - daysAgo * DAY;
  const iso = new Date(ms).toISOString().slice(0, 11) + `${String(hourUtc).padStart(2, "0")}:00:00.000Z`;
  return {
    dataset,
    observedAt: iso,
    sourceTime: iso,
    value,
    unit: "NGN per USD",
    geography: "Nigeria indicative quote",
    sourceUrl: "https://abokiforex.app/",
  };
}

test("Chart windows keep only stored real points and never add, reorder or invent readings", () => {
  const unsorted = [pointAt("parallel-usd-ngn-buy", 1, 1372), pointAt("parallel-usd-ngn-buy", 40, 1360), pointAt("parallel-usd-ngn-buy", 10, 1365)];

  // "all" returns every stored point, oldest first, with no additions
  const all = filterHistoryWindow(unsorted, "all", CHART_NOW);
  assert.equal(all.length, 3);
  assert.deepEqual(all.map((p) => p.value), [1360, 1365, 1372]);
  assert.ok(historyPointTimeMs(all[0]) < historyPointTimeMs(all[1]));

  // Rolling windows are strict subsets of the stored points
  const last7 = filterHistoryWindow(unsorted, "7d", CHART_NOW);
  const last30 = filterHistoryWindow(unsorted, "30d", CHART_NOW);
  assert.deepEqual(last7.map((p) => p.value), [1372]);
  assert.deepEqual(last30.map((p) => p.value), [1365, 1372]);
  assert.ok(last7.every((p) => all.includes(p)));
  assert.ok(last30.every((p) => all.includes(p)));

  // Invalid readings are dropped by the same helpers the store uses, so a chart can never plot one
  const withJunk = [...all, { ...all[0], value: Number.NaN }, { ...all[0], sourceTime: "not-a-date" }] as HistoryPoint[];
  assert.equal(filterHistoryWindow(withJunk, "all", CHART_NOW).length, 3);
});

test("7d/30d filters are offered only when at least two real points exist inside them", () => {
  assert.equal(CHART_MIN_POINTS, 2);
  assert.deepEqual(HISTORY_WINDOWS, ["7d", "30d", "all"]);

  // Single stored observation: no window can support a chart
  assert.deepEqual(availableHistoryWindows([pointAt("cbn-usd-ngn", 0, 1331.186)], CHART_NOW), []);

  // Two old readings: only "all" has enough points, so 7d/30d must not be offered
  assert.deepEqual(
    availableHistoryWindows([pointAt("parallel-usd-ngn-buy", 40, 1360), pointAt("parallel-usd-ngn-buy", 39, 1361)], CHART_NOW),
    ["all"],
  );

  // Three readings spread over 20 days: 7d holds only one point, so it stays hidden
  assert.deepEqual(
    availableHistoryWindows([pointAt("parallel-usd-ngn-buy", 20, 1360), pointAt("parallel-usd-ngn-buy", 10, 1365), pointAt("parallel-usd-ngn-buy", 1, 1372)], CHART_NOW),
    ["30d", "all"],
  );

  // Recent readings: every window is honest
  assert.deepEqual(
    availableHistoryWindows([pointAt("parallel-usd-ngn-buy", 2, 1370), pointAt("parallel-usd-ngn-buy", 1, 1372)], CHART_NOW),
    ["7d", "30d", "all"],
  );
  assert.equal(availableHistoryWindows([], CHART_NOW).length, 0);
});

test("Series summaries refuse to describe fewer than two real points and report the real range", () => {
  assert.equal(summarizeHistorySeries([]), null);
  assert.equal(summarizeHistorySeries([pointAt("fuel-depot-petrol", 1, 1342.5)]), null);

  const stats = summarizeHistorySeries([
    pointAt("fuel-depot-petrol", 3, 1340),
    pointAt("fuel-depot-petrol", 2, 1342.5),
    pointAt("fuel-depot-petrol", 1, 1341),
  ]);
  assert.ok(stats);
  assert.equal(stats!.count, 3);
  assert.equal(stats!.maxPoints, MAX_HISTORY_POINTS_PER_DATASET);
  assert.equal(stats!.min, 1340);
  assert.equal(stats!.max, 1342.5);
  assert.equal(stats!.range, 2.5);
  assert.equal(stats!.change, 1);
  assert.equal(stats!.direction, "up");
  assert.equal(stats!.flat, false);
  assert.equal(stats!.first.value, 1340);
  assert.equal(stats!.last.value, 1341);
  assert.equal(stats!.spanMs, 2 * DAY);

  // Identical readings are reported as flat rather than being nudged into a fake trend
  const flat = summarizeHistorySeries([pointAt("parallel-usd-ngn-buy", 2, 1370), pointAt("parallel-usd-ngn-buy", 1, 1370)]);
  assert.ok(flat);
  assert.equal(flat!.flat, true);
  assert.equal(flat!.direction, "flat");
  assert.equal(flat!.range, 0);
  assert.equal(flat!.pctChange, 0);
});

test("Multi-series domain shares one axis across same-unit datasets and needs two real points", () => {
  const parallel = [pointAt("parallel-usd-ngn-buy", 2, 1370), pointAt("parallel-usd-ngn-buy", 1, 1372)];
  const cbn = [pointAt("cbn-usd-ngn", 2, 1331), pointAt("cbn-usd-ngn", 1, 1332.5)];
  const domain = historySeriesDomain([parallel, cbn]);
  assert.ok(domain);
  assert.equal(domain!.minValue, 1331);
  assert.equal(domain!.maxValue, 1372);
  assert.equal(domain!.flat, false);
  assert.equal(domain!.singleInstant, false);

  // One real point across every dataset: no drawable domain, so no chart
  assert.equal(historySeriesDomain([[pointAt("cbn-usd-ngn", 0, 1331)], []]), null);
  assert.equal(historySeriesDomain([]), null);

  const flatDomain = historySeriesDomain([[pointAt("fuel-depot-diesel", 2, 1805), pointAt("fuel-depot-diesel", 1, 1805)]]);
  assert.equal(flatDomain!.flat, true);
});

test("Projection maps stored readings into the plot box one-to-one, with real time gaps preserved", () => {
  const geometry = { width: 300, height: 140, paddingTop: 7, paddingBottom: 7, paddingLeft: 3, paddingRight: 3 };
  const points = [pointAt("parallel-usd-ngn-buy", 3, 1360), pointAt("parallel-usd-ngn-buy", 2, 1380), pointAt("parallel-usd-ngn-buy", 1, 1370)];
  const domain = historySeriesDomain([points])!;
  const projected = projectHistorySeries(points, domain, geometry);

  // Exactly one plotted coordinate per stored observation: nothing interpolated between readings
  assert.equal(projected.length, points.length);
  assert.equal(historyPolylinePoints(projected).split(" ").length, points.length);

  // Horizontal extent fills the plot box; higher values sit higher (smaller y)
  assert.equal(projected[0].x, 3);
  assert.equal(projected.at(-1)!.x, 297);
  assert.equal(projected[1].y, 7); // 1380 is the maximum
  assert.equal(projected[0].y, 133); // 1360 is the minimum
  assert.ok(projected[2].y > projected[1].y && projected[2].y < projected[0].y);

  // Equal daily spacing because the source times are evenly spaced
  const gapA = projected[1].x - projected[0].x;
  const gapB = projected[2].x - projected[1].x;
  assert.equal(Math.round(gapA), Math.round(gapB));

  // A flat series is drawn on the centre line instead of being scaled into a fake slope
  const flatPoints = [pointAt("fuel-depot-lpg", 2, 1160), pointAt("fuel-depot-lpg", 1, 1160)];
  const flatProjected = projectHistorySeries(flatPoints, historySeriesDomain([flatPoints])!, geometry);
  assert.equal(flatProjected[0].y, 70);
  assert.equal(flatProjected[1].y, 70);

  // Readings that share one source time are spaced by order so they stay visible
  const sameInstant = [
    { ...pointAt("fuel-depot-petrol", 1, 1342.5), sourceTime: "2026-10-10T12:00:00.000Z" },
    { ...pointAt("fuel-depot-petrol", 1, 1341), sourceTime: "2026-10-10T12:00:00.000Z" },
  ];
  const instantDomain = historySeriesDomain([sameInstant])!;
  assert.equal(instantDomain.singleInstant, true);
  const instantProjected = projectHistorySeries(sameInstant, instantDomain, geometry);
  assert.equal(instantProjected[0].x, 3);
  assert.equal(instantProjected[1].x, 297);
  assert.notEqual(instantProjected[0].y, instantProjected[1].y);

  // Empty and single-point input never fabricates a second coordinate
  assert.deepEqual(projectHistorySeries([], domain, geometry), []);
  assert.equal(projectHistorySeries([points[0]], domain, geometry).length, 1);
});

test("Marker stride keeps dense series readable and always marks both ends", () => {
  assert.equal(historyMarkerStride(9, 12), 1);
  assert.equal(historyMarkerStride(12, 12), 1);
  assert.equal(historyMarkerStride(56, 12), 5);
  const indices = Array.from({ length: 56 }, (_, i) => i).filter((i) => i % historyMarkerStride(56, 12) === 0 || i === 55);
  assert.ok(indices.includes(0));
  assert.ok(indices.includes(55));
  assert.ok(indices.length <= 13);
});

test("Chart accessible names state the real count, range and that nothing is estimated", () => {
  const points = [pointAt("parallel-usd-ngn-buy", 2, 1370), pointAt("parallel-usd-ngn-buy", 1, 1372)];
  const stats = summarizeHistorySeries(points)!;
  const label = describeHistorySeries({
    label: "Parallel USD buy",
    stats,
    formatValue: (v) => `NGN${v}`,
    formatDate: formatWatDay,
    windowLabel: "all stored readings",
  });
  assert.ok(label.includes("Parallel USD buy"));
  assert.ok(label.includes("2 real readings"));
  assert.ok(label.includes("NGN1370"));
  assert.ok(label.includes("NGN1372"));
  assert.ok(label.includes("up from"));
  assert.ok(label.includes("No value is estimated between readings."));

  const flatLabel = describeHistorySeries({
    label: "Depot diesel median",
    stats: summarizeHistorySeries([pointAt("fuel-depot-diesel", 2, 1805), pointAt("fuel-depot-diesel", 1, 1805)])!,
    formatValue: (v) => `NGN${v}`,
    formatDate: formatWatDay,
  });
  assert.ok(flatLabel.includes("2 real readings"));
  assert.ok(!flatLabel.includes("1 real reading,"));
  assert.ok(flatLabel.includes("unchanged at NGN1805"));

  // A single stored point cannot be described as a series, so the empty state is used instead
  assert.equal(summarizeHistorySeries([pointAt("cbn-usd-ngn", 0, 1331.186)]), null);
});

test("Chart history helpers agree with the bounded store the monitor writes", () => {
  let store: HistoryStore = { collectionStartedAt: null, points: [] };
  // The monitor's real append path stays the only writer; charts read what it accepted
  for (let i = 0; i < 5; i++) {
    store = appendBoundedHistory(store, {
      dataset: "fuel-depot-petrol",
      observedAt: new Date(CHART_NOW - (4 - i) * DAY).toISOString(),
      sourceTime: new Date(CHART_NOW - (4 - i) * DAY).toISOString(),
      value: 1342.5 - i * 0.5,
      unit: "NGN per litre",
      geography: "Nigeria depot median",
      sourceUrl: "https://awajis.com/fuel-price-in-nigeria-today/",
    });
  }
  // A duplicate reading (same sourceTime and value) is ignored, so the chart cannot show a fake extra point
  store = appendBoundedHistory(store, {
    dataset: "fuel-depot-petrol",
    observedAt: new Date(CHART_NOW + DAY).toISOString(),
    sourceTime: new Date(CHART_NOW).toISOString(),
    value: 1340.5,
    unit: "NGN per litre",
    geography: "Nigeria depot median",
    sourceUrl: "https://awajis.com/fuel-price-in-nigeria-today/",
  });

  const stored = getDatasetHistory(store, "fuel-depot-petrol");
  assert.equal(stored.length, 5);
  assert.equal(filterHistoryWindow(stored, "all", CHART_NOW + DAY).length, 5);
  const stats = summarizeHistorySeries(stored)!;
  assert.equal(stats.count, 5);
  assert.equal(stats.min, 1340.5);
  assert.equal(stats.max, 1342.5);
  assert.equal(stats.direction, "down");
  // The chart delta matches the badge delta because both read the same bounded store
  const delta = computeDatasetDelta(store, "fuel-depot-petrol")!;
  assert.equal(delta.delta, -0.5);
  assert.equal(delta.latest.value, stats.last.value);
  assert.equal(delta.previous.value, stored[stored.length - 2].value);
});

test("WAT chart labels are deterministic between the Node build and the browser", () => {
  const ms = Date.parse("2026-10-11T19:06:00.000Z");
  assert.equal(formatWatFull(ms), "11 Oct 2026, 8:06 pm WAT");
  assert.equal(formatWatDay(ms), "11 Oct 2026");
  assert.equal(formatWatDayShort(ms), "11 Oct");
  assert.equal(formatWatDayTime(ms), "11 Oct, 8:06 pm");

  // Midnight rollover and noon edge cases (Nigeria is UTC+1 with no daylight saving)
  assert.equal(formatWatFull(Date.parse("2026-10-11T23:30:00.000Z")), "12 Oct 2026, 12:30 am WAT");
  assert.equal(formatWatFull(Date.parse("2026-10-11T11:00:00.000Z")), "11 Oct 2026, 12:00 pm WAT");
  assert.equal(formatWatFull(Date.parse("2026-12-31T23:59:00.000Z")), "1 Jan 2027, 12:59 am WAT");
  assert.equal(formatWatFull(Number.NaN), "timestamp unavailable");
  assert.equal(formatWatDay(Number.NaN), "date unavailable");
});

test("Content audit scanner flags outdated years, stale verification dates, unnegated live claims, and watch changes", () => {
  const nowMs = Date.parse("2026-10-11T12:00:00Z");

  // Clean 2026 article with negated live disclaimer passes with 0 findings
  const cleanFindings = scanArticleRecord({
    route: "/prices/lagos/rice",
    title: "Rice Price in Lagos (2026): 50kg Bag & 1kg Guide",
    h1: "Rice Price in Lagos (2026)",
    bodyText: "This is a dated planning estimate for October 2026, not a live market price. Confirm at Mile 12.",
    section: "prices-item",
    updatedAt: "2026-10-09",
    currentYear: 2026,
    nowMs,
  });
  assert.equal(cleanFindings.length, 0);

  // Outdated year in headline + stale updatedAt + unnegated live claim on manual page
  const flaggedFindings = scanArticleRecord({
    route: "/howto/passport-renewal",
    title: "Nigerian Passport Renewal Fee 2024 Guide",
    h1: "Nigerian Passport Renewal Fee 2024",
    bodyText: "Check our live fee table below before visiting Ikoyi.",
    section: "howto",
    updatedAt: "2026-07-01",
    currentYear: 2026,
    nowMs,
  });
  const categories = flaggedFindings.map((f: { category: string }) => f.category);
  assert.ok(categories.includes("outdated-year-headline"));
  assert.ok(categories.includes("stale-verification-date"));
  assert.ok(categories.includes("live-label-risk"));

  // Official page watch change flag
  const watchFindings = scanOfficialWatchState({
    pages: {
      immigration: {
        label: "Nigeria Immigration Service",
        url: "https://immigration.gov.ng/passports/",
        changedSincePrevious: true,
        reviewRequired: true,
      },
    },
  });
  assert.equal(watchFindings.length, 1);
  assert.equal(watchFindings[0].category, "official-watch-changed");
});

console.log(`\n${passed} parser tests passed`);
