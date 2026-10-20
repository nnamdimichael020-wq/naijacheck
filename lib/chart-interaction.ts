/**
 * Pure interaction helpers for the stored-history charts.
 *
 * Everything here works on observations that `appendBoundedHistory()` already accepted. A hover,
 * a touch scrub or an arrow key only *selects* one of those stored readings; it can never create
 * a value, a timestamp or a delta that is not in `data/history.json`.
 */
import {
  CHART_MIN_POINTS,
  HISTORY_WINDOWS,
  filterHistoryWindow,
  historyPointTimeMs,
  type HistoryPoint,
  type HistoryWindow,
  type ProjectedHistoryPoint,
} from "@/lib/history";

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const WINDOW_COPY: Record<HistoryWindow, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  all: "whole stored history",
};

export const WINDOW_SHORT_LABEL: Record<HistoryWindow, string> = {
  "7d": "7D",
  "30d": "30D",
  all: "ALL",
};

export type ChartWindowStatus = {
  window: HistoryWindow;
  /** True only when at least one series holds CHART_MIN_POINTS real points inside the window. */
  offered: boolean;
  drawableSeries: number;
  plottedReadings: number;
  storedReadings: number;
  /** CHART_MIN_POINTS, repeated so copy can name the requirement without importing history. */
  needed: number;
  /** Honest, specific copy when the window cannot be drawn. Null when it is offered. */
  reason: string | null;
};

/**
 * Per-window availability for a group of series. A window is offered only when it contains enough
 * stored observations to draw a real line, so a toggle can never narrow the chart to a fake point.
 */
export function chartWindowStatuses(pointsBySeries: HistoryPoint[][], nowMs: number): ChartWindowStatus[] {
  const series = Array.isArray(pointsBySeries) ? pointsBySeries : [];
  return HISTORY_WINDOWS.map((window) => {
    const perSeries = series.map((points) => filterHistoryWindow(points, window, nowMs));
    const drawable = perSeries.filter((points) => points.length >= CHART_MIN_POINTS);
    const storedReadings = perSeries.reduce((sum, points) => sum + points.length, 0);
    const plottedReadings = drawable.reduce((sum, points) => sum + points.length, 0);
    const offered = drawable.length > 0;
    const storedCopy =
      storedReadings === 0 ? "none are stored" : storedReadings === 1 ? "only 1 is stored" : `only ${storedReadings} are stored`;
    const reason = offered
      ? null
      : `${WINDOW_SHORT_LABEL[window]} needs ${CHART_MIN_POINTS} real readings in the ${WINDOW_COPY[window]}; ${storedCopy}.`;
    return {
      window,
      offered,
      drawableSeries: drawable.length,
      plottedReadings,
      storedReadings,
      needed: CHART_MIN_POINTS,
      reason,
    };
  });
}

/** Index of the projected reading nearest a viewBox x position, or null for an empty series. */
export function nearestProjectedIndex(projected: ProjectedHistoryPoint[], x: number): number | null {
  if (!Array.isArray(projected) || projected.length === 0 || !Number.isFinite(x)) return null;
  let bestIndex = 0;
  let bestDistance = Math.abs(projected[0].x - x);
  for (let i = 1; i < projected.length; i += 1) {
    const distance = Math.abs(projected[i].x - x);
    if (distance < bestDistance) {
      bestIndex = i;
      bestDistance = distance;
    }
  }
  return bestIndex;
}

export type ChartFocus = {
  /** Index inside the plotted window (0 = earliest plotted reading). */
  index: number;
  point: HistoryPoint;
  timeMs: number;
  /** The immediately preceding *plotted* reading inside the same window, if any. */
  previous: HistoryPoint | null;
  previousTimeMs: number | null;
  delta: number | null;
  pctChange: number | null;
  direction: "up" | "down" | "flat" | null;
};

/**
 * Details for one stored reading, including the change against the previous reading plotted in
 * the same window. `previous` is null for the first plotted point: no earlier value is invented.
 */
export function chartFocusAt(points: HistoryPoint[], index: number): ChartFocus | null {
  if (!Array.isArray(points) || index === null || index === undefined) return null;
  if (!Number.isInteger(index) || index < 0 || index >= points.length) return null;
  const point = points[index];
  const previous = index > 0 ? points[index - 1] : null;
  if (!previous) {
    return {
      index,
      point,
      timeMs: historyPointTimeMs(point),
      previous: null,
      previousTimeMs: null,
      delta: null,
      pctChange: null,
      direction: null,
    };
  }
  const delta = round4(point.value - previous.value);
  const pctChange = previous.value > 0 ? round2((delta / previous.value) * 100) : null;
  return {
    index,
    point,
    timeMs: historyPointTimeMs(point),
    previous,
    previousTimeMs: historyPointTimeMs(previous),
    delta,
    pctChange,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

export type ChartFocusKey = "ArrowLeft" | "ArrowRight" | "Home" | "End";

export const CHART_FOCUS_KEYS: ChartFocusKey[] = ["ArrowLeft", "ArrowRight", "Home", "End"];

/**
 * Next selected index for keyboard navigation.
 *
 * With nothing selected yet, every key starts on the latest real reading (Home starts at the
 * earliest), so the first press never jumps past a reading the visitor has not seen.
 */
export function stepFocusIndex(current: number | null, count: number, key: ChartFocusKey): number | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const last = count - 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  if (current === null || !Number.isInteger(current) || current < 0 || current > last) return last;
  if (key === "ArrowLeft") return Math.max(0, current - 1);
  return Math.min(last, current + 1);
}

/** Maps a pointer offset inside the plot to a clamped viewBox x coordinate. Null when unmeasurable. */
export function cursorFromPointer(offsetPx: number, widthPx: number, viewWidth: number): number | null {
  if (!Number.isFinite(offsetPx) || !Number.isFinite(widthPx) || !Number.isFinite(viewWidth)) return null;
  if (widthPx <= 0 || viewWidth <= 0) return null;
  const ratio = offsetPx / widthPx;
  return round2(Math.min(viewWidth, Math.max(0, ratio * viewWidth)));
}
