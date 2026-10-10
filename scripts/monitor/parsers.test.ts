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
} from "./parsers";

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

console.log(`\n${passed} parser tests passed`);
