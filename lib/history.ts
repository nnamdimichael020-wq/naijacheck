/**
 * Bounded observation history and delta helpers for monitored datasets.
 * Only real, validated monitor parses are appended; values are never invented or backfilled.
 */

export const MAX_HISTORY_POINTS_PER_DATASET = 56;

export type HistoryDatasetId =
  | "parallel-usd-ngn-buy"
  | "fuel-depot-petrol"
  | "cbn-usd-ngn"
  | "fuel-depot-diesel"
  | "fuel-depot-lpg"
  | (string & {});

export type HistoryPoint = {
  dataset: HistoryDatasetId;
  observedAt: string;
  sourceTime: string;
  value: number;
  unit: string;
  geography: string;
  sourceUrl: string;
};

export type HistoryStore = {
  collectionStartedAt: string | null;
  points: HistoryPoint[];
};

export type HistoryDelta = {
  dataset: string;
  latest: HistoryPoint;
  previous: HistoryPoint;
  delta: number;
  pctChange: number | null;
  direction: "up" | "down" | "flat";
};

export function isValidHistoryPoint(point: unknown): point is HistoryPoint {
  if (!point || typeof point !== "object") return false;
  const candidate = point as Partial<HistoryPoint>;
  if (typeof candidate.dataset !== "string" || candidate.dataset.trim().length === 0) return false;
  if (typeof candidate.value !== "number" || !Number.isFinite(candidate.value) || candidate.value <= 0) return false;
  if (typeof candidate.sourceTime !== "string" || !Number.isFinite(Date.parse(candidate.sourceTime))) return false;
  if (typeof candidate.observedAt !== "string" || !Number.isFinite(Date.parse(candidate.observedAt))) return false;
  if (typeof candidate.unit !== "string" || candidate.unit.trim().length === 0) return false;
  if (typeof candidate.geography !== "string" || candidate.geography.trim().length === 0) return false;
  if (typeof candidate.sourceUrl !== "string" || candidate.sourceUrl.trim().length === 0) return false;
  return true;
}

/**
 * Appends a real observation if it is valid and represents a new source reading or changed value,
 * while bounding each dataset independently to the most recent `maxPerDataset` points (default 56).
 */
export function appendBoundedHistory(
  store: HistoryStore,
  candidate: HistoryPoint,
  maxPerDataset: number = MAX_HISTORY_POINTS_PER_DATASET,
): HistoryStore {
  const existingPoints = Array.isArray(store?.points) ? store.points.filter(isValidHistoryPoint) : [];
  if (!isValidHistoryPoint(candidate) || maxPerDataset < 1) {
    return {
      collectionStartedAt: store?.collectionStartedAt ?? existingPoints[0]?.observedAt ?? null,
      points: existingPoints,
    };
  }

  const lastForDataset = [...existingPoints].reverse().find((p) => p.dataset === candidate.dataset);
  const candidateSourceMs = Date.parse(candidate.sourceTime);
  const lastSourceMs = lastForDataset ? Date.parse(lastForDataset.sourceTime) : -Infinity;

  // Ignore duplicate reading with identical sourceTime and value, or out-of-order older sourceTime.
  const shouldAppend =
    !lastForDataset ||
    candidateSourceMs > lastSourceMs ||
    (candidateSourceMs === lastSourceMs && candidate.value !== lastForDataset.value);

  const combined = shouldAppend ? [...existingPoints, candidate] : [...existingPoints];

  // Bound each dataset independently to its last `maxPerDataset` points while preserving order.
  const countsByDataset = new Map<string, number>();
  const keptReversed: HistoryPoint[] = [];
  for (let i = combined.length - 1; i >= 0; i -= 1) {
    const item = combined[i];
    const used = countsByDataset.get(item.dataset) ?? 0;
    if (used < maxPerDataset) {
      countsByDataset.set(item.dataset, used + 1);
      keptReversed.push(item);
    }
  }
  const boundedPoints = keptReversed.reverse();

  return {
    collectionStartedAt: boundedPoints[0]?.observedAt ?? store?.collectionStartedAt ?? null,
    points: boundedPoints,
  };
}

/**
 * Returns the bounded history points for a dataset in chronological order.
 */
export function getDatasetHistory(
  store: HistoryStore,
  dataset: string,
  limit: number = MAX_HISTORY_POINTS_PER_DATASET,
): HistoryPoint[] {
  if (!store?.points?.length || limit < 1) return [];
  return store.points
    .filter((p) => isValidHistoryPoint(p) && p.dataset === dataset)
    .slice(-limit);
}

/**
 * Computes the change between the latest two real observations for a dataset.
 * Returns null when fewer than two real observations exist.
 */
export function computeDatasetDelta(store: HistoryStore, dataset: string): HistoryDelta | null {
  const points = getDatasetHistory(store, dataset, MAX_HISTORY_POINTS_PER_DATASET);
  if (points.length < 2) return null;
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const delta = Math.round((latest.value - previous.value) * 10000) / 10000;
  const pctChange =
    previous.value > 0
      ? Math.round(((latest.value - previous.value) / previous.value) * 10000) / 100
      : null;
  const direction: HistoryDelta["direction"] = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    dataset,
    latest,
    previous,
    delta,
    pctChange,
    direction,
  };
}

/* ---------- Chart series helpers (same bounded store, presentation-agnostic) ----------
 * These functions only re-shape observations that appendBoundedHistory already accepted.
 * They never interpolate, backfill, smooth or synthesise a point, so a chart can only ever
 * draw what the monitor really read.
 */

/** A dataset needs at least two real observations before any line is drawn. */
export const CHART_MIN_POINTS = 2;

export type HistoryWindow = "7d" | "30d" | "all";

export const HISTORY_WINDOW_DAYS: Record<Exclude<HistoryWindow, "all">, number> = {
  "7d": 7,
  "30d": 30,
};

/** Narrowest first so callers can offer the tightest window that still has enough points. */
export const HISTORY_WINDOWS: HistoryWindow[] = ["7d", "30d", "all"];

const DAY_MS = 86_400_000;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
const round2 = (n: number) => Math.round(n * 100) / 100;

function chronological(points: HistoryPoint[]): HistoryPoint[] {
  return points
    .filter((p) => isValidHistoryPoint(p) && Number.isFinite(historyPointTimeMs(p)))
    .slice()
    .sort((a, b) => historyPointTimeMs(a) - historyPointTimeMs(b));
}

/**
 * The instant a stored observation is plotted against: the source's own reading time, falling
 * back to the moment the monitor recorded it. Both come from the stored point; neither is made up.
 */
export function historyPointTimeMs(point: HistoryPoint): number {
  const sourceMs = Date.parse(point?.sourceTime);
  if (Number.isFinite(sourceMs)) return sourceMs;
  const observedMs = Date.parse(point?.observedAt);
  return Number.isFinite(observedMs) ? observedMs : Number.NaN;
}

/** Keeps only already-stored real points inside a rolling window, oldest first. */
export function filterHistoryWindow(
  points: HistoryPoint[],
  window: HistoryWindow,
  nowMs: number = Date.now(),
): HistoryPoint[] {
  const valid = chronological(Array.isArray(points) ? points : []);
  if (window === "all") return valid;
  const cutoff = nowMs - HISTORY_WINDOW_DAYS[window] * DAY_MS;
  return valid.filter((p) => historyPointTimeMs(p) >= cutoff);
}

/** Windows holding at least CHART_MIN_POINTS real observations. Anything absent is not offered. */
export function availableHistoryWindows(
  points: HistoryPoint[],
  nowMs: number = Date.now(),
): HistoryWindow[] {
  return HISTORY_WINDOWS.filter((w) => filterHistoryWindow(points, w, nowMs).length >= CHART_MIN_POINTS);
}

export type HistorySeriesStats = {
  count: number;
  maxPoints: number;
  min: number;
  max: number;
  range: number;
  first: HistoryPoint;
  last: HistoryPoint;
  /** Last value minus first value across the plotted window. */
  change: number;
  pctChange: number | null;
  direction: "up" | "down" | "flat";
  /** True when every real reading in the window is identical: the flat line is the truth. */
  flat: boolean;
  spanMs: number;
  startedAtMs: number;
  endedAtMs: number;
};

/** Stats over real points only, or null when fewer than CHART_MIN_POINTS exist (no chart, no fake line). */
export function summarizeHistorySeries(
  points: HistoryPoint[],
  maxPoints: number = MAX_HISTORY_POINTS_PER_DATASET,
): HistorySeriesStats | null {
  const valid = chronological(Array.isArray(points) ? points : []);
  if (valid.length < CHART_MIN_POINTS) return null;
  const values = valid.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = valid[0];
  const last = valid[valid.length - 1];
  const change = round4(last.value - first.value);
  return {
    count: valid.length,
    maxPoints: Math.max(1, maxPoints),
    min,
    max,
    range: round4(max - min),
    first,
    last,
    change,
    pctChange: first.value > 0 ? round2((change / first.value) * 100) : null,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    flat: max === min,
    spanMs: historyPointTimeMs(last) - historyPointTimeMs(first),
    startedAtMs: historyPointTimeMs(first),
    endedAtMs: historyPointTimeMs(last),
  };
}

export type HistoryChartGeometry = {
  width: number;
  height: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
};

export type ProjectedHistoryPoint = {
  x: number;
  y: number;
  value: number;
  timeMs: number;
  point: HistoryPoint;
};

export type HistorySeriesDomain = {
  minValue: number;
  maxValue: number;
  minTimeMs: number;
  maxTimeMs: number;
  /** True when every plotted reading shares one value; the series is drawn on the centre line. */
  flat: boolean;
  /** True when every plotted reading shares one source time; points are then spaced by order. */
  singleInstant: boolean;
};

/** Shared value/time domain for several datasets, so one honest axis can serve them all. */
export function historySeriesDomain(series: HistoryPoint[][]): HistorySeriesDomain | null {
  const all = (Array.isArray(series) ? series : []).flatMap((s) => chronological(Array.isArray(s) ? s : []));
  if (all.length < CHART_MIN_POINTS) return null;
  const values = all.map((p) => p.value);
  const times = all.map((p) => historyPointTimeMs(p));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const minTimeMs = Math.min(...times);
  const maxTimeMs = Math.max(...times);
  return {
    minValue,
    maxValue,
    minTimeMs,
    maxTimeMs,
    flat: minValue === maxValue,
    singleInstant: minTimeMs === maxTimeMs,
  };
}

/**
 * Maps real observations into viewBox coordinates. Higher values sit higher (smaller y).
 * A flat domain is drawn on the centre line; readings that share one source time are spaced by
 * order so they stay visible. Nothing is added between real points.
 */
export function projectHistorySeries(
  points: HistoryPoint[],
  domain: HistorySeriesDomain,
  geometry: HistoryChartGeometry,
): ProjectedHistoryPoint[] {
  const valid = chronological(Array.isArray(points) ? points : []);
  if (!valid.length || !domain) return [];
  const width = Math.max(1, geometry.width);
  const height = Math.max(1, geometry.height);
  const padTop = Math.max(0, geometry.paddingTop ?? 0);
  const padRight = Math.max(0, geometry.paddingRight ?? 0);
  const padBottom = Math.max(0, geometry.paddingBottom ?? 0);
  const padLeft = Math.max(0, geometry.paddingLeft ?? 0);
  const x0 = padLeft;
  const x1 = Math.max(x0, width - padRight);
  const y0 = padTop;
  const y1 = Math.max(y0, height - padBottom);
  const valueSpan = domain.maxValue - domain.minValue;
  const timeSpan = domain.maxTimeMs - domain.minTimeMs;

  return valid.map((point, index) => {
    const timeMs = historyPointTimeMs(point);
    let x: number;
    if (domain.singleInstant || timeSpan <= 0) {
      x = valid.length === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * index) / (valid.length - 1);
    } else {
      x = x0 + ((x1 - x0) * (timeMs - domain.minTimeMs)) / timeSpan;
    }
    let y: number;
    if (domain.flat || valueSpan <= 0) {
      y = (y0 + y1) / 2;
    } else {
      y = y1 - ((y1 - y0) * (point.value - domain.minValue)) / valueSpan;
    }
    return { x: round2(x), y: round2(y), value: point.value, timeMs, point };
  });
}

/** SVG polyline/polygon `points` attribute for projected real observations. */
export function historyPolylinePoints(projected: ProjectedHistoryPoint[]): string {
  return projected.map((p) => `${p.x},${p.y}`).join(" ");
}

/** Stride that keeps at most `maxMarkers` markers on a dense series, always marking both ends. */
export function historyMarkerStride(pointCount: number, maxMarkers: number = 12): number {
  if (pointCount <= Math.max(1, maxMarkers)) return 1;
  return Math.ceil(pointCount / Math.max(1, maxMarkers));
}

/** Sentence used as the SVG's accessible name. Values come from the plotted real points only. */
export function describeHistorySeries(opts: {
  label: string;
  stats: HistorySeriesStats;
  formatValue: (value: number) => string;
  formatDate: (ms: number) => string;
  windowLabel?: string;
}): string {
  const { label, stats, formatValue, formatDate, windowLabel } = opts;
  const scope = windowLabel ? ` in the ${windowLabel} window` : "";
  const trend =
    stats.direction === "flat"
      ? `unchanged at ${formatValue(stats.last.value)} across every reading`
      : `${stats.direction === "up" ? "up" : "down"} from ${formatValue(stats.first.value)} to ${formatValue(stats.last.value)}${
          stats.pctChange === null ? "" : ` (${stats.pctChange > 0 ? "+" : ""}${stats.pctChange}%)`
        }`;
  return `${label}${scope}: ${stats.count} real reading${stats.count === 1 ? "" : "s"} from ${formatDate(
    stats.startedAtMs,
  )} to ${formatDate(stats.endedAtMs)}, between ${formatValue(stats.min)} and ${formatValue(stats.max)}, ${trend}. No value is estimated between readings.`;
}
