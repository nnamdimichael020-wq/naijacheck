/**
 * Unit tests for the chart interaction layer and the /charts page registry.
 *
 * These helpers are what hover, touch scrub and arrow-key navigation call. The tests pin two
 * promises: a selection can only ever resolve to a stored reading, and a range with too little
 * stored data is reported honestly instead of being drawn.
 *
 * Run with: npm run chartui:test
 */
import assert from "node:assert/strict";
import {
  CHART_FOCUS_KEYS,
  HUD_DELTA_CONTEXT,
  HUD_FIRST_READING_NOTE,
  chartFocusAt,
  chartWindowStatuses,
  crosshairLabelFraction,
  crosshairSelection,
  cursorFromPointer,
  focusDeltaShort,
  focusHudCopy,
  hudModeFor,
  hudUnitLabel,
  nearestProjectedIndex,
  plotBandFraction,
  readingFocusAt,
  scrubPointerAction,
  stackAxisCallouts,
  stepFocusIndex,
} from "./chart-interaction";
import { formatChartValue } from "./chart-format";
import { formatWatFull } from "./utils";
import {
  CHART_PAGES,
  CHART_PAGE_DATASETS,
  CHART_PAGE_SLUGS,
  chartPageBySlug,
  chartPageForDataset,
  chartPagePath,
  chartPagesForDatasets,
} from "./chart-pages";
import { DATASET_REGISTRY } from "./source-registry";
import {
  historyPointTimeMs,
  historySeriesDomain,
  projectHistorySeries,
  type HistoryPoint,
} from "./history";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed += 1;
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
    sourceUrl: "https://example.com/source",
  };
}

test("With nothing stored, every range is unavailable and says how many readings are needed", () => {
  const statuses = chartWindowStatuses([[]], NOW);
  assert.deepEqual(statuses.map((status) => status.window), ["7d", "30d", "all"]);
  for (const status of statuses) {
    assert.equal(status.offered, false);
    assert.equal(status.needed, 2);
    assert.equal(status.plottedReadings, 0);
    assert.ok(status.reason && status.reason.includes("needs 2 real readings"), status.reason ?? "");
    assert.ok(status.reason && status.reason.includes("none are stored"), status.reason ?? "");
  }
});

test("One stored reading is not a chart: every range stays unavailable with a specific count", () => {
  const statuses = chartWindowStatuses([[point("cbn-usd-ngn", 0, 1333.72)]], NOW);
  assert.equal(statuses.every((status) => !status.offered), true);
  const seven = statuses.find((status) => status.window === "7d")!;
  assert.equal(seven.storedReadings, 1);
  assert.ok(seven.reason?.includes("only 1 is stored"), seven.reason ?? "");
});

test("Two recent readings enable 7D, 30D and ALL", () => {
  const statuses = chartWindowStatuses(
    [[point("parallel-usd-ngn-buy", 2, 1370), point("parallel-usd-ngn-buy", 1, 1372)]],
    NOW,
  );
  assert.deepEqual(
    statuses.map((status) => status.offered),
    [true, true, true],
  );
  assert.equal(statuses.find((status) => status.window === "7d")!.plottedReadings, 2);
  assert.equal(statuses.find((status) => status.window === "all")!.plottedReadings, 2);
});

test("Old readings leave 7D and 30D disabled while ALL keeps plotting the real points", () => {
  const statuses = chartWindowStatuses(
    [[point("parallel-usd-ngn-buy", 40, 1360), point("parallel-usd-ngn-buy", 39, 1361)]],
    NOW,
  );
  const seven = statuses.find((status) => status.window === "7d")!;
  const thirty = statuses.find((status) => status.window === "30d")!;
  const all = statuses.find((status) => status.window === "all")!;
  assert.equal(seven.offered, false);
  assert.equal(thirty.offered, false);
  assert.equal(all.offered, true);
  assert.equal(all.plottedReadings, 2);
  assert.ok(seven.reason?.includes("last 7 days"), seven.reason ?? "");
  assert.ok(thirty.reason?.includes("last 30 days"), thirty.reason ?? "");
});

test("A window counts only drawable series and only points that exist inside it", () => {
  const statuses = chartWindowStatuses(
    [
      [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1372)],
      [point("cbn-usd-ngn", 20, 1300), point("cbn-usd-ngn", 10, 1310), point("cbn-usd-ngn", 5, 1320)],
    ],
    NOW,
  );
  const seven = statuses.find((status) => status.window === "7d")!;
  assert.equal(seven.drawableSeries, 1);
  assert.equal(seven.plottedReadings, 2, "only the two parallel readings are drawn in 7D");
  assert.equal(
    seven.storedReadings,
    3,
    "the count is honest: two parallel readings plus one CBN reading exist in the range, and the CBN series is listed as too short to draw",
  );
  const all = statuses.find((status) => status.window === "all")!;
  assert.equal(all.drawableSeries, 2);
  assert.equal(all.plottedReadings, 5);
});

test("nearestProjectedIndex snaps to a real projected reading and handles empty input", () => {
  const projected = [
    { x: 0, y: 100, value: 10, timeMs: 1, point: point("parallel-usd-ngn-buy", 2, 10) },
    { x: 100, y: 50, value: 20, timeMs: 2, point: point("parallel-usd-ngn-buy", 1, 20) },
    { x: 200, y: 0, value: 30, timeMs: 3, point: point("parallel-usd-ngn-buy", 0, 30) },
  ];
  assert.equal(nearestProjectedIndex(projected, -50), 0);
  assert.equal(nearestProjectedIndex(projected, 10), 0);
  assert.equal(nearestProjectedIndex(projected, 60), 1);
  assert.equal(nearestProjectedIndex(projected, 150), 1, "an exact tie resolves to the earlier reading, deterministically");
  assert.equal(nearestProjectedIndex(projected, 151), 2);
  assert.equal(nearestProjectedIndex([], 10), null);
  assert.equal(nearestProjectedIndex(projected, Number.NaN), null);
});

test("Nearest-index selection always resolves to an exact stored reading, never to a midpoint value", () => {
  const points = [point("fuel-depot-petrol", 4, 1342.5), point("fuel-depot-petrol", 2, 1349.5), point("fuel-depot-petrol", 0, 1350)];
  const domain = historySeriesDomain([points])!;
  const projected = projectHistorySeries(points, domain, { width: 300, height: 140, paddingLeft: 3, paddingRight: 3 });
  for (const p of projected) {
    const index = nearestProjectedIndex(projected, p.x)!;
    assert.equal(points[index].value, p.value);
    assert.equal(historyPointTimeMs(points[index]), p.timeMs);
  }
  const middleOfTwoPoints = (projected[0].x + projected[1].x) / 2 + 0.01;
  const snappedIndex = nearestProjectedIndex(projected, middleOfTwoPoints);
  assert.notEqual(snappedIndex, null);
  const snapped = points[snappedIndex!].value;
  assert.ok(snapped === 1342.5 || snapped === 1349.5, `snapped value ${snapped} must be a stored value`);
});

test("chartFocusAt reports the previous stored reading and its delta, or null at the first point", () => {
  const points = [
    point("parallel-usd-ngn-buy", 2, 1370),
    point("parallel-usd-ngn-buy", 1, 1372),
    point("parallel-usd-ngn-buy", 0, 1372),
  ];
  const first = chartFocusAt(points, 0)!;
  assert.equal(first.previous, null);
  assert.equal(first.delta, null);
  assert.equal(first.pctChange, null);
  assert.equal(first.direction, null);

  const second = chartFocusAt(points, 1)!;
  assert.equal(second.delta, 2);
  assert.equal(second.direction, "up");
  assert.equal(second.pctChange, 0.15);
  assert.equal(second.previous?.value, 1370);

  const flat = chartFocusAt(points, 2)!;
  assert.equal(flat.delta, 0);
  assert.equal(flat.direction, "flat");

  assert.equal(chartFocusAt(points, -1), null);
  assert.equal(chartFocusAt(points, 3), null);
  assert.equal(chartFocusAt(points, 1.5), null);
  assert.equal(chartFocusAt([], 0), null);
});

test("Keyboard steps stay inside the stored readings and start on the latest one", () => {
  assert.deepEqual(CHART_FOCUS_KEYS, ["ArrowLeft", "ArrowRight", "Home", "End"]);
  assert.equal(stepFocusIndex(null, 5, "ArrowLeft"), 4);
  assert.equal(stepFocusIndex(null, 5, "ArrowRight"), 4);
  assert.equal(stepFocusIndex(null, 5, "Home"), 0);
  assert.equal(stepFocusIndex(null, 5, "End"), 4);
  assert.equal(stepFocusIndex(0, 5, "ArrowLeft"), 0, "cannot step before the earliest reading");
  assert.equal(stepFocusIndex(4, 5, "ArrowRight"), 4, "cannot step past the latest reading");
  assert.equal(stepFocusIndex(2, 5, "ArrowLeft"), 1);
  assert.equal(stepFocusIndex(2, 5, "ArrowRight"), 3);
  assert.equal(stepFocusIndex(99, 5, "ArrowLeft"), 4, "an out-of-range selection recovers to the latest");
  assert.equal(stepFocusIndex(0, 0, "ArrowRight"), null, "an empty series has nothing to select");
  assert.equal(stepFocusIndex(0, 0, "Home"), null);
});

test("Pointer positions map into the viewBox and clamp at both edges", () => {
  assert.equal(cursorFromPointer(0, 300, 300), 0);
  assert.equal(cursorFromPointer(150, 300, 300), 150);
  assert.equal(cursorFromPointer(300, 300, 300), 300);
  assert.equal(cursorFromPointer(-20, 300, 300), 0);
  assert.equal(cursorFromPointer(360, 300, 300), 300);
  assert.equal(cursorFromPointer(75, 300, 480), 120);
  assert.equal(cursorFromPointer(10, 0, 300), null);
  assert.equal(cursorFromPointer(Number.NaN, 300, 300), null);
});

/* ---------- TradingView-style crosshair: selection, HUD copy, callouts, pointer policy ---------- */

const PARALLEL_POINTS = [
  point("parallel-usd-ngn-buy", 4, 1360),
  point("parallel-usd-ngn-buy", 3, 1365),
  point("parallel-usd-ngn-buy", 1, 1372),
  point("parallel-usd-ngn-buy", 0, 1370),
];
const PARALLEL_DOMAIN = historySeriesDomain([PARALLEL_POINTS])!;
const PARALLEL_PROJECTED = projectHistorySeries(PARALLEL_POINTS, PARALLEL_DOMAIN, {
  width: 480,
  height: 240,
  paddingTop: 12,
  paddingBottom: 12,
  paddingLeft: 4,
  paddingRight: 4,
});
const naira0 = (value: number) => formatChartValue(value, 0);

test("hudModeFor: no cursor (or an unusable one) rests on the latest reading; any real cursor is a selection", () => {
  assert.equal(hudModeFor(null), "latest");
  assert.equal(hudModeFor(Number.NaN), "latest");
  assert.equal(hudModeFor(Number.POSITIVE_INFINITY), "latest");
  assert.equal(hudModeFor(0), "selected");
  assert.equal(hudModeFor(240.5), "selected");
});

test("Idle crosshair falls back to the latest stored reading — the documented pointer-leave choice", () => {
  const idle = crosshairSelection(PARALLEL_PROJECTED, null)!;
  const last = PARALLEL_PROJECTED[PARALLEL_PROJECTED.length - 1];
  assert.equal(idle.index, PARALLEL_PROJECTED.length - 1);
  assert.equal(idle.x, last.x);
  assert.equal(idle.y, last.y);
  assert.equal(idle.value, 1370);
  assert.equal(idle.timeMs, historyPointTimeMs(PARALLEL_POINTS[3]));
  assert.equal(crosshairSelection([], null), null, "an empty series has no crosshair");
  assert.equal(crosshairSelection([], 120), null);
});

test("Crosshair lines sit exactly on a stored reading's own x and y, wherever the pointer is", () => {
  const xs = new Set(PARALLEL_PROJECTED.map((p) => p.x));
  const ys = new Set(PARALLEL_PROJECTED.map((p) => p.y));
  const stored = new Set(PARALLEL_POINTS.map((p) => p.value));
  const times = new Set(PARALLEL_POINTS.map((p) => historyPointTimeMs(p)));
  // Sweep a pointer across every pixel of a 390px-wide phone plot, plus beyond both edges.
  for (let px = -20; px <= 410; px += 1) {
    const cursor = cursorFromPointer(px, 390, 480);
    assert.notEqual(cursor, null);
    const selection = crosshairSelection(PARALLEL_PROJECTED, cursor)!;
    assert.ok(xs.has(selection.x), `vertical crosshair x ${selection.x} must be a stored reading's x (pointer ${px}px)`);
    assert.ok(ys.has(selection.y), `horizontal crosshair y ${selection.y} must be a stored reading's y (pointer ${px}px)`);
    assert.ok(stored.has(selection.value), `selected value ${selection.value} must be stored`);
    assert.ok(times.has(selection.timeMs), "selected time must be a stored reading time");
    assert.equal(PARALLEL_PROJECTED[selection.index].x, selection.x, "index and coordinates describe the same reading");
  }
});

test("Between two readings the crosshair snaps to one of them — it never draws a midpoint price", () => {
  const [a, b] = [PARALLEL_PROJECTED[1], PARALLEL_PROJECTED[2]];
  const justLeft = crosshairSelection(PARALLEL_PROJECTED, (a.x + b.x) / 2 - 0.01)!;
  const justRight = crosshairSelection(PARALLEL_PROJECTED, (a.x + b.x) / 2 + 0.01)!;
  assert.equal(justLeft.value, 1365);
  assert.equal(justRight.value, 1372);
  const midpointPrice = (a.value + b.value) / 2;
  assert.notEqual(justLeft.value, midpointPrice);
  assert.notEqual(justRight.value, midpointPrice);
  assert.ok([a.y, b.y].includes(justLeft.y) && [a.y, b.y].includes(justRight.y), "the horizontal line never sits between vertices");
});

test("readingFocusAt (homepage sparkline) and chartFocusAt (full chart) report identical stored deltas", () => {
  const readings = PARALLEL_PROJECTED.map((p) => ({ value: p.value, timeMs: p.timeMs }));
  for (let i = 0; i < PARALLEL_POINTS.length; i += 1) {
    const slim = readingFocusAt(readings, i)!;
    const full = chartFocusAt(PARALLEL_POINTS, i)!;
    assert.equal(slim.value, full.point.value);
    assert.equal(slim.value, full.value);
    assert.equal(slim.timeMs, full.timeMs);
    assert.equal(slim.delta, full.delta);
    assert.equal(slim.pctChange, full.pctChange);
    assert.equal(slim.direction, full.direction);
    assert.equal(slim.previousValue, full.previous?.value ?? null);
  }
  assert.equal(readingFocusAt(readings, 0)!.previousValue, null, "the first plotted reading has no invented predecessor");
  assert.equal(readingFocusAt(readings, -1), null);
  assert.equal(readingFocusAt(readings, readings.length), null);
  assert.equal(readingFocusAt(readings, 0.5), null);
  assert.equal(readingFocusAt([], 0), null);
  assert.equal(readingFocusAt([{ value: Number.NaN, timeMs: 1 }], 0), null);
});

test("focusDeltaShort gives a short signed change vs the previous plotted reading, or nothing at the first", () => {
  assert.equal(focusDeltaShort(chartFocusAt(PARALLEL_POINTS, 1), naira0), "▲ +₦5 (+0.37%)");
  assert.equal(focusDeltaShort(chartFocusAt(PARALLEL_POINTS, 3), naira0), "▼ −₦2 (−0.15%)");
  assert.equal(focusDeltaShort(chartFocusAt(PARALLEL_POINTS, 0), naira0), null, "no earlier reading → no delta");
  const flat = [point("parallel-usd-ngn-buy", 1, 1370), point("parallel-usd-ngn-buy", 0, 1370)];
  assert.equal(focusDeltaShort(chartFocusAt(flat, 1), naira0), "■ unchanged");
  assert.equal(focusDeltaShort(null, naira0), null);
});

test("hudUnitLabel reads the stored unit and never doubles a suffix the price already carries", () => {
  assert.equal(hudUnitLabel("NGN per USD"), "per USD");
  assert.equal(hudUnitLabel("NGN per US$"), "per US$");
  assert.equal(hudUnitLabel("₦ per US$"), "per US$");
  assert.equal(hudUnitLabel("NGN per kg"), "per kg");
  assert.equal(hudUnitLabel("NGN per litre", "/L"), null, "₦1,341/L already states the unit");
  assert.equal(hudUnitLabel("NGN per kg", "/kg"), null);
  assert.equal(hudUnitLabel(undefined), null);
  assert.equal(hudUnitLabel(null), null);
  assert.equal(hudUnitLabel("value"), null);
});

test("HUD copy: large stored price with unit, full WAT time, short delta and an honest Latest/Selected label", () => {
  const selected = focusHudCopy(chartFocusAt(PARALLEL_POINTS, 1), {
    mode: "selected",
    formatValue: naira0,
    formatDateTime: formatWatFull,
    unit: hudUnitLabel(PARALLEL_POINTS[1].unit),
  })!;
  assert.equal(selected.label, "Selected reading");
  assert.equal(selected.price, "₦1,365");
  assert.equal(selected.unit, "per USD");
  assert.equal(selected.timestamp, formatWatFull(historyPointTimeMs(PARALLEL_POINTS[1])));
  assert.match(selected.timestamp, /^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} (am|pm) WAT$/);
  assert.equal(selected.delta, "▲ +₦5 (+0.37%)");
  assert.equal(selected.deltaNote, HUD_DELTA_CONTEXT);
  assert.equal(selected.direction, "up");

  const latest = focusHudCopy(chartFocusAt(PARALLEL_POINTS, 3), { mode: "latest", formatValue: naira0, formatDateTime: formatWatFull })!;
  assert.equal(latest.label, "Latest reading");
  assert.equal(latest.price, "₦1,370");
  assert.equal(latest.unit, null);
  assert.equal(latest.timestamp, "11 Oct 2026, 1:00 pm WAT");

  const first = focusHudCopy(chartFocusAt(PARALLEL_POINTS, 0), { mode: "selected", formatValue: naira0, formatDateTime: formatWatFull })!;
  assert.equal(first.delta, null);
  assert.equal(first.deltaNote, HUD_FIRST_READING_NOTE, "the first reading says so instead of showing a change");

  const twoDp = focusHudCopy(readingFocusAt([{ value: 1365, timeMs: 1 }, { value: 1365.5, timeMs: 2 }], 1), {
    mode: "selected",
    formatValue: (value) => formatChartValue(value, 2),
    formatDateTime: formatWatFull,
  })!;
  assert.equal(twoDp.price, "₦1,365.50", "the HUD shows the stored value at the series' own precision");
  assert.equal(focusHudCopy(null, { mode: "latest", formatValue: naira0, formatDateTime: formatWatFull }), null);
});

test("Callout anchoring: the HUD and time pill always cover the crosshair x and never overflow the plot", () => {
  assert.equal(crosshairLabelFraction(0, 480), 0);
  assert.equal(crosshairLabelFraction(240, 480), 0.5);
  assert.equal(crosshairLabelFraction(480, 480), 1);
  assert.equal(crosshairLabelFraction(-10, 480), 0);
  assert.equal(crosshairLabelFraction(999, 480), 1);
  assert.equal(crosshairLabelFraction(Number.NaN, 480), 1, "unmeasurable → rest at the latest (right) end");
  assert.equal(crosshairLabelFraction(10, 0), 1);
  // CSS used by the components: left = f·trackWidth, translateX(−f·labelWidth).
  for (const trackPx of [150, 210, 330, 780]) {
    for (const labelPx of [60, 120, 149]) {
      if (labelPx > trackPx) continue;
      for (let x = 0; x <= 480; x += 7) {
        const f = crosshairLabelFraction(x, 480);
        const crosshairPx = f * trackPx;
        const start = f * trackPx - f * labelPx;
        const end = start + labelPx;
        assert.ok(start >= -1e-9 && end <= trackPx + 1e-9, `label [${start}, ${end}] must stay inside 0..${trackPx}`);
        assert.ok(start <= crosshairPx + 1e-9 && end >= crosshairPx - 1e-9, "label must cover the crosshair x");
      }
    }
  }
});

test("plotBandFraction maps a reading's y onto the value axis band and clamps", () => {
  assert.equal(plotBandFraction(12, 12, 228), 0);
  assert.equal(plotBandFraction(120, 12, 228), 0.5);
  assert.equal(plotBandFraction(228, 12, 228), 1);
  assert.equal(plotBandFraction(0, 12, 228), 0);
  assert.equal(plotBandFraction(400, 12, 228), 1);
  assert.equal(plotBandFraction(Number.NaN, 12, 228), 0.5);
  assert.equal(plotBandFraction(50, 100, 100), 0.5);
});

test("Price pills that would overlap are spread around their true levels; others stay exactly aligned", () => {
  const apart = stackAxisCallouts([{ id: "a", y: 10 }, { id: "b", y: 80 }], 12);
  assert.deepEqual(apart.map((p) => p.displayY), [10, 80], "non-overlapping pills sit on their crosshair");

  const close = stackAxisCallouts([{ id: "parallel", y: 50 }, { id: "cbn", y: 52 }], 12);
  assert.deepEqual(close.map((p) => p.id), ["parallel", "cbn"], "input order is preserved");
  assert.ok(Math.abs(close[1].displayY - close[0].displayY) >= 12 - 1e-9, "overlapping pills end up a full gap apart");
  assert.equal((close[0].displayY + close[1].displayY) / 2, 51, "the pair stays centred on its true levels");
  assert.ok(close[0].displayY < close[1].displayY, "the higher reading keeps the higher pill");

  const reversed = stackAxisCallouts([{ id: "low", y: 60 }, { id: "high", y: 58 }], 12);
  assert.ok(reversed[1].displayY < reversed[0].displayY, "stacking follows value order, not input order");

  const three = stackAxisCallouts([{ y: 40 }, { y: 41 }, { y: 42 }], 10);
  assert.deepEqual(three.map((p) => p.displayY), [31, 41, 51]);

  const odd = stackAxisCallouts([{ y: Number.NaN }, { y: 30 }], 12);
  assert.equal(odd.length, 2, "no pill is lost");
  assert.ok(Number.isNaN(odd[0].displayY));
  assert.equal(odd[1].displayY, 30);
  assert.deepEqual(stackAxisCallouts([], 12), []);
});

test("Scrub pointer policy: hover/drag selects, lifting/leaving/scrolling/Escape returns to the latest reading", () => {
  // Mouse: hovering scrubs (no button needed), leaving the plot falls back to latest, a click lift keeps it.
  assert.equal(scrubPointerAction("pointermove", "mouse", 0), "select");
  assert.equal(scrubPointerAction("pointerdown", "mouse", 1), "select");
  assert.equal(scrubPointerAction("pointerup", "mouse", 0), "keep");
  assert.equal(scrubPointerAction("pointerleave", "mouse", 0), "latest");
  // Touch: the crosshair follows the finger while it is down and responds on the first contact.
  assert.equal(scrubPointerAction("pointerdown", "touch", 1), "select");
  assert.equal(scrubPointerAction("pointermove", "touch", 1), "select");
  assert.equal(scrubPointerAction("pointermove", "touch", 0), "keep", "no contact → no jump");
  assert.equal(scrubPointerAction("pointerup", "touch", 0), "latest", "lifting the finger shows the latest reading again");
  assert.equal(scrubPointerAction("pointercancel", "touch", 0), "latest", "a vertical page scroll (pan-y) cancels the scrub");
  assert.equal(scrubPointerAction("pointerleave", "touch", 0), "keep", "pointerup already handled the touch lift");
  // Pen behaves like touch.
  assert.equal(scrubPointerAction("pointermove", "pen", 0), "keep");
  assert.equal(scrubPointerAction("pointermove", "pen", 1), "select");
  assert.equal(scrubPointerAction("pointerup", "pen", 0), "latest");
  // Focus leaving the plot returns to the latest reading too.
  assert.equal(scrubPointerAction("blur", "", 0), "latest");
});

test("Every pixel of a scrub produces HUD copy for a stored reading only", () => {
  const storedPrices = new Set(PARALLEL_POINTS.map((p) => naira0(p.value)));
  const storedStamps = new Set(PARALLEL_POINTS.map((p) => formatWatFull(historyPointTimeMs(p))));
  for (let px = 0; px <= 360; px += 3) {
    const selection = crosshairSelection(PARALLEL_PROJECTED, cursorFromPointer(px, 360, 480))!;
    const hud = focusHudCopy(chartFocusAt(PARALLEL_POINTS, selection.index), {
      mode: hudModeFor(px),
      formatValue: naira0,
      formatDateTime: formatWatFull,
    })!;
    assert.equal(hud.label, "Selected reading");
    assert.ok(storedPrices.has(hud.price), `HUD price ${hud.price} must be a stored price`);
    assert.ok(storedStamps.has(hud.timestamp), `HUD time ${hud.timestamp} must be a stored reading time`);
  }
});

test("Every chart page names one stored dataset with a matching, linked spec", () => {
  assert.equal(new Set(CHART_PAGE_SLUGS).size, CHART_PAGES.length, "slugs must be unique");
  for (const page of CHART_PAGES) {
    assert.match(page.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `slug "${page.slug}" must be URL-safe`);
    assert.equal(page.spec.dataset, page.dataset, "the presentation spec must describe the same dataset");
    assert.ok(CHART_PAGE_DATASETS.includes(page.dataset), `${page.dataset} must be a registered chart dataset`);
    assert.ok(
      DATASET_REGISTRY.some((dataset) => dataset.id === page.registryId),
      `${page.slug} must map to a source-registry dataset for its verification label`,
    );
    assert.equal(chartPageBySlug(page.slug)?.dataset, page.dataset);
    assert.equal(chartPageForDataset(page.dataset)?.slug, page.slug);
    assert.equal(chartPagePath(page), `/charts/${page.slug}`);
  }
});

test("Chart page copy is unique and never claims a series is live", () => {
  assert.equal(new Set(CHART_PAGES.map((page) => page.metaTitle)).size, CHART_PAGES.length);
  assert.equal(new Set(CHART_PAGES.map((page) => page.metaDescription)).size, CHART_PAGES.length);
  assert.equal(new Set(CHART_PAGES.map((page) => page.h1)).size, CHART_PAGES.length);
  for (const page of CHART_PAGES) {
    const copy = `${page.metaTitle} ${page.metaDescription} ${page.summary} ${page.h1}`;
    assert.equal(/\blive\b/i.test(copy), false, `${page.slug} copy must not claim a live reading: ${copy}`);
    assert.ok(page.metaDescription.length >= 60, `${page.slug} needs a descriptive meta description`);
  }
});

test("Related chart links only point at pages that exist", () => {
  for (const page of CHART_PAGES) {
    for (const slug of page.related) {
      const related = chartPageBySlug(slug);
      assert.ok(related, `${page.slug} links to missing chart page "${slug}"`);
      assert.notEqual(related!.slug, page.slug, `${page.slug} must not link to itself`);
    }
    const resolved = chartPagesForDatasets(page.related.map((slug) => chartPageBySlug(slug)!.dataset));
    assert.deepEqual(resolved.map((entry) => entry.slug), page.related);
  }
});

test("The five major stored series each have a full page", () => {
  for (const dataset of CHART_PAGE_DATASETS) {
    assert.ok(chartPageForDataset(dataset), `missing /charts page for ${dataset}`);
  }
  assert.equal(CHART_PAGES.length, CHART_PAGE_DATASETS.length);
});

console.log(`\n${passed} chart interaction tests passed`);
