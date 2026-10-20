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

/**
 * Index of the projected reading nearest a viewBox x position, or null for an empty series.
 * Accepts any projected reading with an `x` (full ProjectedHistoryPoint or the slim readings the
 * homepage sparkline receives), so every chart snaps with exactly the same rule.
 */
export function nearestProjectedIndex(projected: ReadonlyArray<{ x: number }>, x: number): number | null {
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

/** One plotted stored reading reduced to the two facts a read-out needs: its value and its time. */
export type PlottedReading = { value: number; timeMs: number };

/**
 * The selected stored reading plus its change against the immediately preceding *plotted* reading.
 * Shared by the full history chart and the homepage sparkline, so both report identical deltas.
 */
export type ReadingFocus = {
  /** Index inside the plotted window (0 = earliest plotted reading). */
  index: number;
  value: number;
  timeMs: number;
  previousValue: number | null;
  previousTimeMs: number | null;
  delta: number | null;
  pctChange: number | null;
  direction: "up" | "down" | "flat" | null;
};

export type ChartFocus = ReadingFocus & {
  point: HistoryPoint;
  /** The immediately preceding *plotted* reading inside the same window, if any. */
  previous: HistoryPoint | null;
};

function focusMath(index: number, current: PlottedReading, previous: PlottedReading | null): ReadingFocus {
  if (!previous) {
    return {
      index,
      value: current.value,
      timeMs: current.timeMs,
      previousValue: null,
      previousTimeMs: null,
      delta: null,
      pctChange: null,
      direction: null,
    };
  }
  const delta = round4(current.value - previous.value);
  const pctChange = previous.value > 0 ? round2((delta / previous.value) * 100) : null;
  return {
    index,
    value: current.value,
    timeMs: current.timeMs,
    previousValue: previous.value,
    previousTimeMs: previous.timeMs,
    delta,
    pctChange,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

const validIndex = (length: number, index: number) =>
  index !== null && index !== undefined && Number.isInteger(index) && index >= 0 && index < length;

/**
 * Focus details for one plotted reading in an already-plotted, chronological list of readings.
 * Null for an out-of-range index. The first reading has no previous value: nothing is invented.
 */
export function readingFocusAt(readings: ReadonlyArray<PlottedReading>, index: number): ReadingFocus | null {
  if (!Array.isArray(readings) || !validIndex(readings.length, index)) return null;
  const current = readings[index];
  if (!current || !Number.isFinite(current.value) || !Number.isFinite(current.timeMs)) return null;
  return focusMath(index, current, index > 0 ? readings[index - 1] : null);
}

/**
 * Details for one stored reading, including the change against the previous reading plotted in
 * the same window. `previous` is null for the first plotted point: no earlier value is invented.
 */
export function chartFocusAt(points: HistoryPoint[], index: number): ChartFocus | null {
  if (!Array.isArray(points) || !validIndex(points.length, index)) return null;
  const point = points[index];
  const previous = index > 0 ? points[index - 1] : null;
  const reading = (p: HistoryPoint): PlottedReading => ({ value: p.value, timeMs: historyPointTimeMs(p) });
  return {
    ...focusMath(index, reading(point), previous ? reading(previous) : null),
    point,
    previous,
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

/* ---------- TradingView-style crosshair read-out (crosshair, HUD, axis pills) ----------
 * The crosshair never follows the raw pointer. It snaps to ONE stored projected reading: the
 * vertical line sits on that reading's own x, the horizontal line on its own y, and every label
 * (floating HUD, price pill, time pill, detail row) repeats that reading's stored value and stored
 * time. Nothing here can produce a value between two readings.
 *
 * Pointer-leave policy: when nobody is scrubbing (mouse left the plot, finger lifted, page scroll
 * took over, Escape, focus left), the crosshair rests on the LATEST stored reading and the HUD says
 * "Latest reading". While scrubbing it says "Selected reading".
 */

/** Whether the plot is showing the visitor's selection or resting on the latest stored reading. */
export type ChartHudMode = "latest" | "selected";

export const HUD_MODE_LABEL: Record<ChartHudMode, string> = {
  latest: "Latest reading",
  selected: "Selected reading",
};

/** Idle (null cursor) → resting on the latest reading; any finite cursor → a visitor selection. */
export function hudModeFor(cursorX: number | null): ChartHudMode {
  return cursorX === null || !Number.isFinite(cursorX) ? "latest" : "selected";
}

/**
 * The stored projected reading the crosshair sits on: the latest one when idle, otherwise the one
 * nearest the cursor. The returned x/y/value/timeMs are that reading's own — never a midpoint.
 */
export function crosshairSelection<T extends { x: number }>(
  projected: ReadonlyArray<T>,
  cursorX: number | null,
): (T & { index: number }) | null {
  if (!Array.isArray(projected) || projected.length === 0) return null;
  const index = hudModeFor(cursorX) === "latest" ? projected.length - 1 : nearestProjectedIndex(projected, cursorX as number);
  if (index === null) return null;
  return { ...projected[index], index };
}

export const HUD_DELTA_CONTEXT = "vs previous plotted reading";
export const HUD_FIRST_READING_NOTE = "first plotted reading in this range";

/**
 * Short change against the previous *plotted* reading, e.g. "▲ +₦5 (+0.37%)".
 * Null at the first plotted reading: there is no earlier stored value to compare with.
 */
export function focusDeltaShort(focus: ReadingFocus | null, formatValue: (value: number) => string): string | null {
  if (!focus || focus.previousValue === null || focus.delta === null || focus.direction === null) return null;
  if (focus.direction === "flat") return "■ unchanged";
  const sign = focus.direction === "up" ? "+" : "−";
  const pct = focus.pctChange === null ? "" : ` (${sign}${Math.abs(focus.pctChange)}%)`;
  return `${focus.direction === "up" ? "▲" : "▼"} ${sign}${formatValue(Math.abs(focus.delta))}${pct}`;
}

/**
 * The unit printed next to the HUD price, read from the stored reading's own unit
 * ("NGN per USD" → "per USD"). Null when the formatted value already carries a suffix ("/L").
 */
export function hudUnitLabel(unit: string | null | undefined, unitSuffix?: string | null): string | null {
  if (unitSuffix) return null;
  if (typeof unit !== "string") return null;
  const perUnit = unit.trim().replace(/^(?:NGN|₦)\s*/i, "");
  return /^per\s+\S/i.test(perUnit) ? perUnit : null;
}

export type ChartHudCopy = {
  mode: ChartHudMode;
  /** "Latest reading" / "Selected reading": says honestly which reading the visitor is looking at. */
  label: string;
  /** The stored reading's own value, formatted with its currency symbol (and suffix, if any). */
  price: string;
  /** "per USD" style unit from the stored reading, or null when the price already carries it. */
  unit: string | null;
  /** The stored reading's own full WAT timestamp. */
  timestamp: string;
  /** Short delta vs the previous plotted reading, or null at the first plotted reading. */
  delta: string | null;
  /** Context for the delta line, so the HUD keeps a constant height and never implies a change. */
  deltaNote: string;
  direction: ReadingFocus["direction"];
};

/** Full floating-HUD copy for one selected stored reading. Null when nothing can be selected. */
export function focusHudCopy(
  focus: ReadingFocus | null,
  opts: {
    mode: ChartHudMode;
    formatValue: (value: number) => string;
    formatDateTime: (ms: number) => string;
    unit?: string | null;
  },
): ChartHudCopy | null {
  if (!focus) return null;
  const delta = focusDeltaShort(focus, opts.formatValue);
  return {
    mode: opts.mode,
    label: HUD_MODE_LABEL[opts.mode],
    price: opts.formatValue(focus.value),
    unit: opts.unit ?? null,
    timestamp: opts.formatDateTime(focus.timeMs),
    delta,
    deltaNote: delta === null ? HUD_FIRST_READING_NOTE : HUD_DELTA_CONTEXT,
    direction: focus.direction,
  };
}

/**
 * 0..1 position of a reading along the plot, used to anchor HTML callouts (HUD, time pill).
 *
 * Callouts use proportional anchoring: `left: f·100%` of their track and `translateX(−f·100%)` of
 * their own width. The callout therefore always covers the crosshair x and never spills past
 * either end of the track while it is narrower than the track — no measuring, no clipping.
 */
export function crosshairLabelFraction(x: number, viewWidth: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(viewWidth) || viewWidth <= 0) return 1;
  return round4(Math.min(1, Math.max(0, x / viewWidth)));
}

/** Vertical position of a reading inside the plot band, as a 0..1 fraction (0 = top of band). */
export function plotBandFraction(y: number, plotTop: number, plotBottom: number): number {
  if (!Number.isFinite(y) || !Number.isFinite(plotTop) || !Number.isFinite(plotBottom)) return 0.5;
  if (plotBottom <= plotTop) return 0.5;
  return round4(Math.min(1, Math.max(0, (y - plotTop) / (plotBottom - plotTop))));
}

/**
 * Axis price pills must stay readable when two series sit at almost the same level. Overlapping
 * pills are spread symmetrically around their true positions; the crosshair lines themselves
 * always stay on the exact stored y. Input order is preserved in the output.
 */
export function stackAxisCallouts<T extends { y: number }>(items: ReadonlyArray<T>, minGap: number): (T & { displayY: number })[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const gap = Number.isFinite(minGap) ? Math.max(0, minGap) : 0;
  const placed: (T & { displayY: number })[] = new Array(items.length);
  const sorted = items
    .map((item, order) => ({ item, order }))
    .filter((entry) => Number.isFinite(entry.item.y))
    .sort((a, b) => a.item.y - b.item.y || a.order - b.order);
  let cluster: typeof sorted = [];
  const flush = () => {
    if (!cluster.length) return;
    const centre = cluster.reduce((sum, entry) => sum + entry.item.y, 0) / cluster.length;
    const spread = ((cluster.length - 1) * gap) / 2;
    cluster.forEach((entry, i) => {
      placed[entry.order] = { ...entry.item, displayY: round2(centre - spread + i * gap) };
    });
    cluster = [];
  };
  for (const entry of sorted) {
    // A pill joins the current cluster when it would overlap the cluster's last *placed* pill.
    if (cluster.length) {
      const centre = cluster.reduce((sum, e) => sum + e.item.y, 0) / cluster.length;
      const lastPlaced = centre - ((cluster.length - 1) * gap) / 2 + (cluster.length - 1) * gap;
      if (entry.item.y - lastPlaced >= gap) flush();
    }
    cluster.push(entry);
  }
  flush();
  // Non-finite ys (filtered above) keep their own slot unchanged so callers never lose an entry.
  return items.map((item, order) => placed[order] ?? { ...item, displayY: item.y });
}

/* ---------- Scrub pointer policy (shared by every interactive chart) ---------- */

export type ScrubEventType = "pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "pointerleave" | "blur";

/**
 * What a pointer/focus event does to the crosshair. This is the documented pointer-leave policy:
 *  - "select": snap the crosshair to the stored reading nearest the pointer.
 *  - "latest": nobody is scrubbing any more → fall back to the latest stored reading ("Latest").
 *  - "keep":   leave the current state alone.
 *
 * A mouse scrubs by hovering and falls back when it leaves the plot. A finger or pen scrubs while it
 * touches the plot and falls back when it lifts — or when the browser cancels the pointer because
 * the visitor is scrolling the page vertically (the plot keeps `touch-action: pan-y`).
 */
export function scrubPointerAction(type: ScrubEventType, pointerType: string, buttons: number): "select" | "latest" | "keep" {
  const mouse = pointerType === "mouse";
  switch (type) {
    case "pointerdown":
      return "select";
    case "pointermove":
      return mouse || buttons > 0 ? "select" : "keep";
    case "pointerup":
      return mouse ? "keep" : "latest";
    case "pointercancel":
      return "latest";
    case "pointerleave":
      return mouse ? "latest" : "keep";
    case "blur":
      return "latest";
    default:
      return "keep";
  }
}
