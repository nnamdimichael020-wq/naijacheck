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
  chartFocusAt,
  chartWindowStatuses,
  cursorFromPointer,
  nearestProjectedIndex,
  stepFocusIndex,
} from "./chart-interaction";
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
