/**
 * Render tests for the history charts. They render the real components with react-dom/server, so a
 * fabricated line, a missing empty state or a non-textual series distinction fails the build.
 * Run with: npm run chart:test
 */
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { HistoryChart, HistoryEmptyState, formatChartValue, type ChartSeries } from "../../components/live/history-chart";
import { ChartHud } from "../../components/live/chart-hud";
import { MiniSparkline } from "../../components/live/sparkline";
import { SparklineScrub } from "../../components/live/sparkline-scrub";
import { focusHudCopy, readingFocusAt } from "../../lib/chart-interaction";
import {
  MAX_HISTORY_POINTS_PER_DATASET,
  historyPointTimeMs,
  historySeriesDomain,
  projectHistorySeries,
  type HistoryPoint,
} from "../../lib/history";
import { datasetHistoryPoints } from "../../lib/live";
import { formatWatDayTime, formatWatFull } from "../../lib/utils";

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

test("7D/30D/ALL always appear; a range without two real readings is disabled with honest copy", () => {
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
  const recentSeven = recent.match(/<button[^>]*>7d<\/button>/)?.[0] ?? "";
  assert.ok(recentSeven.length > 0, "the 7D control must be rendered");
  assert.equal(recentSeven.includes("disabled"), false, "a range holding two real readings stays usable");
  assert.equal(strip(recent).includes("Ranges without enough stored readings stay off"), false);

  const old = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 40, 1360), point("parallel-usd-ngn-buy", 39, 1361)] },
  ]);
  const text = strip(old);
  // The controls stay in the DOM so a visitor can see the ranges exist, but they cannot be used.
  assert.ok(old.includes(">7d</button>"));
  assert.ok(old.includes(">30d</button>"));
  assert.ok(old.includes(">All</button>"));
  for (const label of ["7d", "30d"]) {
    const button = old.match(new RegExp(`<button[^>]*>${label}</button>`))?.[0] ?? "";
    assert.ok(button.length > 0, `${label} control must be rendered`);
    assert.ok(button.includes('disabled=""'), `${label} holds no readings, so it must be disabled`);
    assert.ok(button.includes("needs 2 real readings"), `${label} must explain why it is disabled`);
  }
  assert.ok(text.includes("Ranges without enough stored readings stay off"), text.slice(0, 500));
  assert.ok(text.includes("7D needs 2 real readings in the last 7 days; none are stored"), text.slice(0, 500));
  assert.ok(text.includes("30D needs 2 real readings in the last 30 days; none are stored"), text.slice(0, 500));
  assert.ok(text.includes("2 / 2 stored readings plotted"), text.slice(0, 300));
  assert.ok(text.includes("all stored readings"), "the chart must fall back to every stored real point");
  assert.ok(text.includes("2 of 56 stored"), "the readings table still states the stored/cap count");
  const coords = (old.match(/<polyline[^>]*points="([^"]+)"/)![1].trim().split(/\s+/));
  assert.equal(coords.length, 2, "two disabled ranges must not add a point");
});

test("A series with no readings in the chosen range says so instead of pretending it has no history", () => {
  const html = render(
    [
      { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 2, 1370), point("parallel-usd-ngn-buy", 1, 1372)] },
      {
        spec: CBN_SPEC,
        points: [point("cbn-usd-ngn", 40, 1300), point("cbn-usd-ngn", 39, 1301), point("cbn-usd-ngn", 38, 1302)],
      },
    ],
    { initialWindow: "7d" },
  );
  const text = strip(html);
  assert.ok(html.includes('aria-pressed="true"') && html.includes(">7d</button>"), "the requested range is selected");
  assert.ok(text.includes("2 of 2 stored readings in the last 7 days"), text.slice(0, 500));
  assert.ok(
    text.includes("only 0 of 3 stored readings fall inside the last 7 days"),
    "the excluded series must state how many real readings it does have",
  );
  assert.ok(text.includes("Choose ALL to plot its older readings"));
  assert.equal((html.match(/<polyline/g) ?? []).length, 1, "only the series with two in-range readings is drawn");
  assert.ok(text.includes("2 of 56 stored"), "the readings table still states the real stored/cap count");
});

test("The interactive plot is a focusable group with instructions and a polite detail row", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1372)] },
  ]);
  assert.ok(html.includes('tabindex="0"'), "the plot must be reachable with the keyboard");
  assert.ok(html.includes('role="group"'));
  assert.ok(html.includes('aria-describedby="chart-test-instructions"'));
  assert.ok(html.includes('id="chart-test-instructions"'));
  assert.ok(html.includes('id="chart-test-detail"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes('aria-atomic="true"'));
  assert.ok(strip(html).includes("Hover or drag across the plot"));
  assert.ok(strip(html).includes("Only real readings are shown"));
});

test("The detail row under the chart shows the latest reading's WAT time, value and change vs the previous stored point", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1375)] },
  ]);
  const detail = html.match(/<div id="chart-test-detail"[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.ok(detail.length > 0, "the detail row must be server-rendered, not hover-only");
  const text = strip(detail);
  assert.ok(text.includes("Latest stored reading"));
  assert.ok(text.includes("₦1,375"));
  assert.ok(text.includes("11 Oct 2026, 1:00 pm WAT"));
  assert.ok(text.includes("▲ +₦5"), text);
  assert.ok(text.includes("vs previous plotted reading"));
  assert.ok(text.includes("10 Oct 2026, 1:00 pm WAT"));
});

test("A flat reading in the detail row says unchanged instead of inventing a movement", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1370)] },
  ]);
  const detail = html.match(/<div id="chart-test-detail"[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.ok(strip(detail).includes("unchanged from ₦1,370"));
  assert.equal(strip(detail).includes("▲"), false);
});

test("The large chart variant used by /charts pages keeps the same stored-only rules", () => {
  const html = render(
    [{ spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1372)] }],
    { size: "large" },
  );
  assert.ok(html.includes('viewBox="0 0 480 240"'));
  assert.ok(html.includes("<polyline"));
  assert.ok(strip(html).includes("2 / 2 stored readings plotted"));
  assert.ok(html.includes('aria-live="polite"'));
});

test("Full-chart links point at the dedicated chart pages", () => {
  const html = render(
    [{ spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1372)] }],
    { chartPageLinks: [{ label: "Parallel USD buy", href: "/charts/parallel-usd-buy" }] },
  );
  assert.ok(html.includes('href="/charts/parallel-usd-buy"'));
  assert.ok(strip(html).includes("Full chart: Parallel USD buy"));
});

test("No chart markup animates, and the only transition is reduced-motion safe", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1372)] },
  ]);
  assert.equal(/\banimate-/.test(html), false, "the chart must not animate");
  if (html.includes("transition-colors")) {
    assert.ok(html.includes("motion-reduce:transition-none"), "transitions must be disabled under prefers-reduced-motion");
  }
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

/* ---------- TradingView-style crosshair read-out ---------- */

const polylineCoords = (html: string, nth = 0) =>
  [...html.matchAll(/<polyline[^>]*points="([^"]+)"/g)][nth][1]
    .trim()
    .split(/\s+/)
    .map((c) => c.split(",").map(Number) as [number, number]);
const attrOf = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? "";
const crosshairLines = (html: string, kind: "vertical" | "horizontal") =>
  [...html.matchAll(new RegExp(`<line data-crosshair="${kind}"[^>]*>`, "g"))].map((m) => m[0]);
const hudOf = (html: string) => html.match(/<div id="chart-test-hud"[\s\S]*?<\/div>/)?.[0] ?? "";

test("Idle chart: both crosshair lines rest exactly on the latest stored vertex (documented pointer-leave fallback)", () => {
  const points = [point("parallel-usd-ngn-buy", 2, 1360), point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1375)];
  const html = render([{ spec: PARALLEL_SPEC, points }], { size: "large" });
  const [lastX, lastY] = polylineCoords(html).at(-1)!;
  assert.ok(html.includes('data-chart-crosshair="latest"'), "idle state is labelled latest");
  const vertical = crosshairLines(html, "vertical");
  const horizontal = crosshairLines(html, "horizontal");
  assert.equal(vertical.length, 1, "one vertical crosshair");
  assert.equal(horizontal.length, 1, "one horizontal crosshair per plotted series");
  assert.equal(Number(attrOf(vertical[0], "x1")), lastX);
  assert.equal(Number(attrOf(vertical[0], "x2")), lastX);
  assert.equal(Number(attrOf(horizontal[0], "y1")), lastY);
  assert.equal(Number(attrOf(horizontal[0], "y2")), lastY);
  assert.equal(Number(attrOf(horizontal[0], "x1")), 0, "the price line spans the plot");
  assert.equal(Number(attrOf(horizontal[0], "x2")), 480);
});

test("The selected vertex is emphasized: larger than every normal marker, on the stored point", () => {
  const points = [point("parallel-usd-ngn-buy", 2, 1360), point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1375)];
  const html = render([{ spec: PARALLEL_SPEC, points }], { size: "large" });
  const [lastX, lastY] = polylineCoords(html).at(-1)!;
  const vertex = html.match(/<g data-crosshair="vertex"[\s\S]*?<\/g>/)?.[0] ?? "";
  assert.ok(vertex.length > 0, "an emphasized vertex is rendered");
  const vertexRadii = [...vertex.matchAll(/<circle[^>]*\br="([\d.]+)"/g)].map((m) => Number(m[1]));
  const vertexCentres = [...vertex.matchAll(/<circle[^>]*cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
  for (const [cx, cy] of vertexCentres) assert.deepEqual([cx, cy], [lastX, lastY], "the emphasis sits on the stored vertex");
  const svgBody = html.slice(html.indexOf("<polyline"), html.indexOf("data-chart-crosshair"));
  const normalRadii = [...svgBody.matchAll(/<circle[^>]*\br="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(normalRadii.length > 0, "normal markers are still drawn");
  assert.ok(Math.max(...vertexRadii) > Math.max(...normalRadii) * 1.4, `vertex ${vertexRadii} must clearly exceed markers ${normalRadii}`);
});

test("Floating HUD shows the stored price large with its unit, full WAT time, short delta and a Latest label", () => {
  const points = [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1375)];
  const html = render([{ spec: PARALLEL_SPEC, points }]);
  const hud = hudOf(html);
  assert.ok(hud.length > 0, "the HUD is server-rendered, so it is visible before any interaction");
  assert.ok(hud.includes('data-chart-hud="latest"'));
  assert.ok(/aria-hidden="true"><div id="chart-test-hud"/.test(html), "the HUD is decorative: the aria-live detail row announces the same reading");
  const text = strip(hud);
  assert.ok(text.includes("Latest reading"), text);
  assert.ok(text.includes("₦1,375 per USD"), text);
  assert.ok(text.includes("11 Oct 2026, 1:00 pm WAT"), text);
  assert.ok(text.includes("▲ +₦5 (+0.36%)"), text);
  assert.ok(text.includes("vs previous plotted reading"), text);
  const price = hud.match(/<span data-hud="price" class="([^"]+)">([^<]+)<\/span>/)!;
  assert.ok(/\btext-base\b/.test(price[1]) && /\btabular-nums\b/.test(price[1]) && /\bfont-extrabold\b/.test(price[1]));
  assert.equal(price[2], "₦1,375");
  assert.equal(/\btransition|animate-/.test(hud), false, "the HUD moves instantly, with no animation");
  const large = hudOf(render([{ spec: PARALLEL_SPEC, points }], { size: "large" }));
  assert.ok(/data-hud="price" class="[^"]*\btext-xl\b/.test(large), "the /charts pages use an even larger price");
});

test("Axis callouts: a price pill on the value axis and a time pill on the time axis, both from the stored reading", () => {
  const points = [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1375)];
  const html = render([{ spec: PARALLEL_SPEC, points }]);
  const pills = [...html.matchAll(/<span data-chart-callout="(price|time)"[^>]*style="([^"]*)"[^>]*>([^<]+)<\/span>/g)];
  const price = pills.filter((m) => m[1] === "price");
  const time = pills.filter((m) => m[1] === "time");
  assert.equal(price.length, 1);
  assert.equal(time.length, 1);
  assert.equal(price[0][3], "₦1,375");
  assert.match(price[0][2], /top:0%/, "the latest (highest) reading's pill sits at the top of the value band");
  assert.equal(time[0][3], `${formatWatDayTime(historyPointTimeMs(points[1]))} WAT`);
  const pct = Math.round((polylineCoords(html).at(-1)![0] / 300) * 10000) / 100;
  assert.ok(time[0][2].includes(`left:${pct}%`), `the time pill is anchored at the reading's own x (${pct}%): ${time[0][2]}`);
  assert.ok(time[0][2].includes(`translateX(-${pct}%)`), "proportional anchoring keeps the pill inside the plot");
  const timeRow = html.match(/<div aria-hidden="true" class="relative h-5"[^>]*>/)?.[0] ?? "";
  assert.ok(timeRow.includes("margin-left:4rem"), "the time pill has its own row, aligned with the plot's left edge");
});

test("Two series on one axis: one horizontal line, one price pill and one HUD line each — each its own stored reading", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1375)] },
    { spec: CBN_SPEC, points: [point("cbn-usd-ngn", 1, 1331), point("cbn-usd-ngn", 0, 1333.25)] },
  ]);
  const horizontal = crosshairLines(html, "horizontal");
  assert.equal(horizontal.length, 2);
  assert.equal(Number(attrOf(horizontal[0], "y1")), polylineCoords(html, 0).at(-1)![1]);
  assert.equal(Number(attrOf(horizontal[1], "y1")), polylineCoords(html, 1).at(-1)![1]);
  assert.equal(crosshairLines(html, "vertical").length, 1, "one vertical line, on the primary series' reading");
  const pills = [...html.matchAll(/data-chart-callout="price"[^>]*>([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(pills, ["₦1,375", "₦1,333.25"]);
  const hud = strip(hudOf(html));
  assert.ok(hud.includes("₦1,375 per USD"), hud);
  assert.ok(hud.includes("CBN official USD ₦1,333.25"), hud);
  assert.ok(hud.includes("11 Oct, 1:00 pm WAT"), "secondary lines carry their own WAT time");
});

test("The HUD keeps a constant height: four lines whether or not a previous reading exists", () => {
  const readings = [
    { value: 1370, timeMs: Date.parse("2026-10-10T12:00:00.000Z") },
    { value: 1375, timeMs: Date.parse("2026-10-11T12:00:00.000Z") },
  ];
  const copy = (index: number) =>
    focusHudCopy(readingFocusAt(readings, index), {
      mode: "selected",
      formatValue: (value) => formatChartValue(value, 0),
      formatDateTime: formatWatFull,
      unit: "per USD",
    })!;
  const first = renderToStaticMarkup(createElement(ChartHud, { hud: copy(0), size: "compact", fraction: 0 }));
  const second = renderToStaticMarkup(createElement(ChartHud, { hud: copy(1), size: "compact", fraction: 1 }));
  assert.equal((first.match(/<p\b/g) ?? []).length, 4);
  assert.equal((second.match(/<p\b/g) ?? []).length, 4);
  for (const html of [first, second]) {
    assert.ok(html.includes('data-chart-hud="selected"'));
    assert.ok(strip(html).includes("Selected reading"));
    assert.equal((html.match(/\btruncate\b/g) ?? []).length >= 4, true, "every line is single-line, so the plot never jumps");
    assert.ok(html.includes("border-primary/60"), "a selection is visibly emphasized");
  }
  assert.ok(strip(first).includes("first plotted reading in this range"), "no change is invented for the first reading");
  assert.ok(first.includes("left:0%;transform:translateX(-0%)"));
  assert.ok(second.includes("left:100%;transform:translateX(-100%)"));
  const mini = renderToStaticMarkup(createElement(ChartHud, { hud: copy(1), size: "mini", fraction: 1 }));
  assert.equal((mini.match(/<p\b/g) ?? []).length, 3, "the card-sparkline HUD is scaled down to three lines");
  assert.ok(/<span data-hud="label"[^>]*>Selected reading<\/span>/.test(mini), "label shares the price line on the mini HUD");
});

test("The plot keeps vertical page scroll (pan-y), suppresses the long-press callout and starts idle", () => {
  const html = render([
    { spec: PARALLEL_SPEC, points: [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1372)] },
  ]);
  const plot = html.match(/<div class="relative min-w-0 flex-1 cursor-crosshair[^>]*>/)?.[0] ?? "";
  assert.ok(plot.includes("touch-action:pan-y"), plot);
  assert.ok(plot.includes("[-webkit-touch-callout:none]"));
  assert.ok(plot.includes("select-none"));
  assert.ok(plot.includes('data-scrubbing="false"'));
  assert.ok(strip(html).includes("Letting go returns to the latest reading"));
});

test("Homepage sparkline: the same crosshair + price tag, scaled down, from the stored readings only", () => {
  const points = datasetHistoryPoints("parallel-usd-ngn-buy");
  const html = renderToStaticMarkup(
    createElement(MiniSparkline, { dataset: "parallel-usd-ngn-buy", label: "Parallel USD buy", fractionDigits: 0 }),
  );
  if (points.length < 2) {
    assert.ok(strip(html).includes("not enough readings yet"));
    assert.equal(html.includes("data-chart-hud"), false, "no price tag without a real line");
    return;
  }
  const latest = points.at(-1)!;
  assert.ok(html.includes('role="group"') && html.includes('tabindex="0"'), "the sparkline is interactive and keyboard reachable");
  assert.ok(html.includes("touch-action:pan-y"), "page scroll still works over the sparkline");
  assert.ok(html.includes('data-chart-hud="latest"'));
  const text = strip(html.match(/<div data-chart-hud[\s\S]*?<\/div>/)![0]);
  assert.ok(text.includes("Latest reading"), text);
  assert.ok(text.includes(`${formatChartValue(latest.value, 0)} per USD`), text);
  assert.ok(text.includes(formatWatFull(historyPointTimeMs(latest))), text);
  const coords = polylineCoords(html);
  assert.equal(coords.length, points.length, "one plotted coordinate per stored reading");
  const vertical = crosshairLines(html, "vertical");
  const horizontal = crosshairLines(html, "horizontal");
  assert.equal(vertical.length, 1);
  assert.equal(horizontal.length, 1);
  assert.equal(Number(attrOf(vertical[0], "x1")), coords.at(-1)![0]);
  assert.equal(Number(attrOf(horizontal[0], "y1")), coords.at(-1)![1]);
  assert.ok(html.includes('aria-live="polite"'), "screen readers hear the same read-out");
});

test("SparklineScrub renders the HUD for the reading the crosshair rests on, with the right unit", () => {
  const pts = [point("fuel-depot-petrol", 2, 1342.5), point("fuel-depot-petrol", 1, 1349.5), point("fuel-depot-petrol", 0, 1350)];
  const view = { width: 240, height: 36, paddingTop: 4, paddingBottom: 4, paddingLeft: 2, paddingRight: 2 };
  const projected = projectHistorySeries(pts, historySeriesDomain([pts])!, view);
  const html = renderToStaticMarkup(
    createElement(SparklineScrub, {
      label: "Depot petrol",
      title: "Depot petrol",
      ariaLabel: "Depot petrol: 3 real readings",
      readings: projected.map((p) => ({ x: p.x, y: p.y, value: p.value, timeMs: p.timeMs })),
      view,
      unitSuffix: "/L",
      unitLabel: null,
    }),
  );
  const text = strip(html.match(/<div data-chart-hud[\s\S]*?<\/div>/)![0]);
  assert.ok(text.includes("₦1,350.00/L") || text.includes("₦1,350/L"), text);
  assert.equal(text.includes("per litre"), false, "the /L suffix is not doubled with a unit label");
  assert.ok(text.includes("▲ +₦0.50/L (+0.04%)"), text);
  assert.equal(Number(attrOf(crosshairLines(html, "vertical")[0], "x1")), projected.at(-1)!.x);
});

console.log(`\n${passed} chart render tests passed`);
