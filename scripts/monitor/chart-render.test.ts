/**
 * Render tests for the history charts. They render the real components with react-dom/server, so a
 * fabricated line, a missing empty state or a non-textual series distinction fails the build.
 * Run with: npm run chart:test
 */
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { HistoryChart, HistoryEmptyState, formatChartValue, type ChartSeries } from "../../components/live/history-chart";
import { MiniSparkline } from "../../components/live/sparkline";
import { MAX_HISTORY_POINTS_PER_DATASET, type HistoryPoint } from "../../lib/history";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};

const NOW = Date.parse("2026-10-11T21:00:00.000Z");
const DAY = 86_400_000;

function point(dataset: string, daysAgo: number, value: number, hourUtc = 12): HistoryPoint {
  const iso = new Date(NOW - daysAgo * DAY).toISOString().slice(0, 11) + `${String(hourUtc).padStart(2, "0")}:00:00.000Z`;
  return {
    dataset,
    observedAt: iso,
    sourceTime: iso,
    value,
    unit: dataset.startsWith("fuel") ? "NGN per litre" : "NGN per USD",
    geography: "Nigeria",
    sourceUrl: dataset.startsWith("fuel") ? "https://awajis.com/fuel-price-in-nigeria-today/" : "https://abokiforex.app/",
  };
}

const PARALLEL_SPEC = {
  dataset: "parallel-usd-ngn-buy",
  label: "Parallel USD buy (Aboki indicative quote)",
  shortLabel: "Parallel USD buy",
  fractionDigits: 0,
  marker: "circle" as const,
  tone: "primary" as const,
  sourceName: "Aboki Forex",
  sourceUrl: "https://abokiforex.app/",
};
const CBN_SPEC = {
  dataset: "cbn-usd-ngn",
  label: "CBN NFEM USD (official closing rate)",
  shortLabel: "CBN official USD",
  fractionDigits: 2,
  marker: "square" as const,
  dash: "6 3",
  tone: "sky" as const,
  sourceName: "Central Bank of Nigeria",
  sourceUrl: "https://www.cbn.gov.ng/rates/ExchRateByCurrency.html",
};

function render(series: ChartSeries[], props: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(HistoryChart, {
      id: "chart-test",
      title: "Test chart",
      unit: "NGN per US$",
      series,
      nowMs: NOW,
      maxPoints: MAX_HISTORY_POINTS_PER_DATASET,
      ...props,
    }),
  );
}

const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&amp;|&quot;/g, " ").replace(/\s+/g, " ");

test("A group with no dataset holding two real points renders the honest empty state and no line", () => {
  const html = render([{ spec: CBN_SPEC, points: [point("cbn-usd-ngn", 0, 1331.186)] }]);
  const text = strip(html);
  assert.ok(text.includes("Not enough readings yet"), text.slice(0, 400));
  assert.ok(text.includes("1 / 56 stored"));
  assert.ok(text.includes("at least 2 real observations"));
  assert.equal(html.includes("<polyline"), false, "an empty dataset must never draw a line");
  assert.equal(html.includes("<path d=\"M"), false);
});

test("An empty store renders the empty state rather than a flat zero line", () => {
  const html = render([{ spec: PARALLEL_SPEC, points: [] }]);
  assert.ok(strip(html).includes("Not enough readings yet"));
  assert.ok(strip(html).includes("0 / 56 stored"));
  assert.equal(html.includes("<polyline"), false);
});

test("HistoryEmptyState lists every dataset count and never claims a chart exists", () => {
  const html = renderToStaticMarkup(
    createElement(HistoryEmptyState, {
      headingId: "empty-test",
      title: "Wholesale depot fuel medians",
      entries: [
        { label: "Depot petrol median", count: 1 },
        { label: "Depot diesel median", count: 0 },
      ],
    }),
  );
  const text = strip(html);
  assert.ok(text.includes("Not enough readings yet"));
  assert.ok(text.includes("1 / 56 stored"));
  assert.ok(text.includes("0 / 56 stored"));
  assert.ok(text.includes("1 real reading across 2 datasets"));
  assert.equal(html.includes("<polyline"), false);
});

test("One drawable series renders a real polyline, its point count and the excluded dataset's honest note", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 2, 1370), point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1372)] },
    { spec: CBN_SPEC, points: [point("cbn-usd-ngn", 0, 1331.186)] },
  ]);
  const text = strip(html);

  const polyline = html.match(/<polyline[^>]*points="([^"]+)"/);
  assert.ok(polyline, "the drawable series must render a polyline");
  const coords = polyline![1].trim().split(/\s+/);
  assert.equal(coords.length, 3, "exactly one plotted coordinate per stored reading");

  assert.ok(text.includes("3/56 points"), text.slice(0, 600));
  assert.ok(text.includes("3 / 4 stored readings plotted"), text.slice(0, 600));
  assert.ok(text.includes("CBN NFEM USD (official closing rate)"));
  assert.ok(text.includes("not enough readings yet"));
  assert.ok(text.includes("1/56"));
  assert.ok(text.includes("No line is drawn for it until a second real observation exists."));
  assert.ok(text.includes("As of 11 Oct 2026, 1:00 pm WAT"), text.slice(0, 600));
  // Accessible name carries the real count and range
  assert.ok(html.includes("3 real readings"));
  assert.ok(html.includes("between ₦1,370 and ₦1,372"));
  assert.ok(html.includes("No value is estimated between readings."));
});

test("Two same-unit series share one axis and stay distinguishable without colour", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1375)] },
    { spec: CBN_SPEC, points: [point("cbn-usd-ngn", 1, 1331), point("cbn-usd-ngn", 0, 1333)] },
  ]);
  const polylines = [...html.matchAll(/<polyline[^>]*points="([^"]+)"[^>]*>/g)];
  assert.equal(polylines.length, 2);

  // Shared domain 1331..1375: the higher series sits above the lower one on the same axis
  const yOf = (pts: string) => pts.trim().split(/\s+/).map((c) => Number(c.split(",")[1]));
  assert.ok(Math.max(...yOf(polylines[0][1])) < Math.min(...yOf(polylines[1][1])));

  // Not colour-only: dash pattern, marker shape and a text legend all differ
  assert.ok(html.includes('stroke-dasharray="6 3"'), "second series must use a distinct dash");
  assert.ok(html.includes("<rect"), "second series must use a distinct marker shape");
  assert.ok(html.includes("<circle"), "first series must use a distinct marker shape");
  const legend = html.match(/<ul id="chart-test-legend"[\s\S]*?<\/ul>/);
  assert.ok(legend, "legend must be real text in the DOM, not painted inside the SVG");
  assert.ok(strip(legend![0]).includes("Parallel USD buy"));
  assert.ok(strip(legend![0]).includes("CBN official USD"));
  assert.ok(strip(legend![0]).includes("2/56 points"));
});

test("A flat dataset says so instead of implying movement", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 3, 1370), point("parallel-usd-ngn-buy", 2, 1370), point("parallel-usd-ngn-buy", 1, 1370)] },
  ]);
  const text = strip(html);
  assert.ok(text.includes("Flat: every stored reading is identical"));
  assert.ok(text.includes("no change in window"));
  assert.ok(text.includes("unchanged at ₦1,370 across every reading"));
  const ys = (html.match(/<polyline[^>]*points="([^"]+)"/)![1].trim().split(/\s+/)).map((c) => Number(c.split(",")[1]));
  assert.deepEqual([...new Set(ys)], [70], "a flat series is drawn on the centre line");
});

test("7d/30d filters appear only when enough real points exist inside them", () => {
  const recent = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 2, 1370), point("parallel-usd-ngn-buy", 1, 1372)] },
  ]);
  assert.ok(recent.includes(">7d</button>"));
  assert.ok(recent.includes(">30d</button>"));
  assert.ok(recent.includes(">All</button>"));
  assert.ok(strip(recent).includes("2 / 2 stored readings plotted"), strip(recent).slice(0, 300));
  assert.ok(recent.includes("all stored readings: 2 of 2 stored real readings plotted"));
  // The button exposes how many stored readings each window would actually plot
  assert.ok(recent.includes("last 7 days: 2 of 2 stored readings plotted"));

  const old = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 40, 1360), point("parallel-usd-ngn-buy", 39, 1361)] },
  ]);
  const text = strip(old);
  assert.equal(old.includes(">7d</button>"), false, "7d holds no readings, so it must not be offered");
  assert.equal(old.includes(">30d</button>"), false, "30d holds no readings, so it must not be offered");
  assert.equal(old.includes("<button"), false, "when only one window can plot real points there is nothing to toggle");
  assert.ok(text.includes("2 / 2 stored readings plotted"), text.slice(0, 300));
  assert.ok(text.includes("all stored readings"), "the chart must fall back to every stored real point");
  assert.ok(text.includes("2 of 56 stored"), "the readings table still states the stored/cap count");
});

test("The toggle is a real button group with pressed state and a focus-visible style", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 2, 1370), point("parallel-usd-ngn-buy", 1, 1372)] },
  ]);
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes('aria-pressed="false"'));
  assert.ok(html.includes('type="button"'));
  assert.ok(html.includes('role="group"'));
  assert.ok(html.includes("focus-visible:ring-2"));
  assert.ok(html.includes("Last 7 days") || html.includes("last 7 days"));
});

test("Every plotted reading is listed in a table with its source time and recorded time", () => {
  const points = [point("parallel-usd-ngn-buy", 2, 1370), point("parallel-usd-ngn-buy", 1, 1372)];
  const html = render([{ spec: PARALLEL_SPEC, points }]);
  const text = strip(html);
  assert.ok(text.includes("Show the 2 real readings plotted"));
  assert.ok(text.includes("Reading time (WAT)"));
  assert.ok(text.includes("Recorded (UTC)"));
  assert.ok(text.includes("10 Oct 2026, 1:00 pm WAT"), text.slice(0, 400));
  assert.ok(text.includes(points[1].observedAt.slice(0, 16).replace("T", " ")));
  assert.ok(text.includes("2 of 56 stored"));
});

test("The chart svg carries role=img, a title, a description and no focus trap", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1372)] },
  ]);
  assert.ok(html.includes('role="img"'));
  assert.ok(html.includes('aria-labelledby="chart-test-title chart-test-desc"'));
  assert.ok(html.includes("<title id=\"chart-test-title\">"));
  assert.ok(html.includes("<desc id=\"chart-test-desc\">"));
  assert.ok(html.includes('focusable="false"'));
  assert.ok(html.includes('viewBox="0 0 300 140"'));
  assert.ok(html.includes("preserveAspectRatio") === false, "uniform scaling keeps markers circular");
});

test("formatChartValue is deterministic and never uses locale-dependent grouping", () => {
  assert.equal(formatChartValue(1370), "₦1,370");
  assert.equal(formatChartValue(1342.5), "₦1,342.50");
  assert.equal(formatChartValue(1341, undefined, "/L"), "₦1,341/L");
  assert.equal(formatChartValue(1331.186, 2), "₦1,331.19");
  assert.equal(formatChartValue(1160, 0, "/kg"), "₦1,160/kg");
  assert.equal(formatChartValue(1234567.891, 2), "₦1,234,567.89");
  assert.equal(formatChartValue(Number.NaN), "Unavailable");
});

test("MiniSparkline draws only from stored points and shows an honest empty state", () => {
  // MiniSparkline reads the repository store directly, so this asserts the shared-source rule.
  const html = renderToStaticMarkup(
    createElement(MiniSparkline, { dataset: "parallel-usd-ngn-buy", label: "Parallel USD buy", fractionDigits: 0 }),
  );
  if (html.includes("<polyline")) {
    const coords = html.match(/<polyline[^>]*points="([^"]+)"/)![1].trim().split(/\s+/);
    assert.ok(coords.length >= 2);
    assert.ok(strip(html).includes("/56 real readings"));
    assert.ok(html.includes('role="img"'));
  } else {
    assert.ok(strip(html).includes("not enough readings yet"));
    assert.ok(strip(html).includes("/56 stored"));
  }
});

console.log(`\n${passed} chart render tests passed`);
