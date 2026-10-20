"use client";

/**
 * Shared SVG history chart used on /status, the fuel pages and every /charts/* page.
 *
 * Rules this component enforces:
 *  - A dataset with fewer than two real points gets an honest empty state, never a fabricated line.
 *  - Nothing is interpolated, smoothed or backfilled: the polyline joins stored readings only, and
 *    the x-axis is the reading's own source time so genuine gaps stay visible.
 *  - Interaction (hover, touch scrub, arrow keys) only *selects* a stored reading. The detail row
 *    under the plot repeats that reading's own WAT time, value and its change against the previous
 *    plotted reading — it never estimates a value between points.
 *  - 7D / 30D / ALL always appear. A range that holds fewer than two stored readings is disabled
 *    and says so in visible text instead of quietly showing an empty or fake line.
 *  - Series are told apart by dash pattern, marker shape and a text legend, not by colour alone.
 *  - No animation is used anywhere in the chart, so `prefers-reduced-motion: reduce` is respected
 *    by construction (and no transition classes are emitted).
 */

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  CHART_MIN_POINTS,
  HISTORY_WINDOWS,
  MAX_HISTORY_POINTS_PER_DATASET,
  describeHistorySeries,
  filterHistoryWindow,
  historyMarkerStride,
  historyPointTimeMs,
  historyPolylinePoints,
  historySeriesDomain,
  projectHistorySeries,
  summarizeHistorySeries,
  type HistoryPoint,
  type HistorySeriesStats,
  type HistoryWindow,
} from "@/lib/history";
import {
  CHART_FOCUS_KEYS,
  chartFocusAt,
  chartWindowStatuses,
  cursorFromPointer,
  nearestProjectedIndex,
  stepFocusIndex,
  type ChartFocus,
  type ChartFocusKey,
} from "@/lib/chart-interaction";
import {
  TONE_CLASS,
  axisDigits,
  formatChartValue,
  type ChartSeries,
  type ChartSeriesSpec,
  type SeriesMarker,
} from "@/lib/chart-series";
import { cn, formatWatDay, formatWatDayTime, formatWatFull } from "@/lib/utils";

export { formatChartValue } from "@/lib/chart-series";
export type { ChartSeries, ChartSeriesSpec, SeriesMarker, SeriesTone } from "@/lib/chart-series";

type ViewBox = {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

/** viewBox units. The plot area is inset 5% top/bottom so the HTML axis labels line up exactly. */
const COMPACT_VIEW: ViewBox = { width: 300, height: 140, paddingTop: 7, paddingBottom: 7, paddingLeft: 3, paddingRight: 3 };
const LARGE_VIEW: ViewBox = { width: 480, height: 240, paddingTop: 12, paddingBottom: 12, paddingLeft: 4, paddingRight: 4 };

const WINDOW_LABEL: Record<HistoryWindow, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  all: "all stored readings",
};

function SeriesMarkerGlyph({ shape, x, y, scale = 1 }: { shape: SeriesMarker; x: number; y: number; scale?: number }) {
  const s = (n: number) => n * scale;
  switch (shape) {
    case "square":
      return <rect x={x - s(2.4)} y={y - s(2.4)} width={s(4.8)} height={s(4.8)} fill="currentColor" />;
    case "triangle":
      return <path d={`M${x},${y - s(3.1)} L${x + s(2.9)},${y + s(2.2)} L${x - s(2.9)},${y + s(2.2)} Z`} fill="currentColor" />;
    case "diamond":
      return <path d={`M${x},${y - s(3.3)} L${x + s(3.3)},${y} L${x},${y + s(3.3)} L${x - s(3.3)},${y} Z`} fill="currentColor" />;
    case "circle":
    default:
      return <circle cx={x} cy={y} r={s(2.6)} fill="currentColor" />;
  }
}

type PreparedSeries = {
  spec: ChartSeriesSpec;
  points: HistoryPoint[];
  stats: HistorySeriesStats | null;
  projected: ReturnType<typeof projectHistorySeries>;
};

function prepare(
  series: ChartSeries[],
  window: HistoryWindow,
  nowMs: number,
  domainSeries: HistoryPoint[][],
  view: ViewBox,
): PreparedSeries[] {
  const domain = historySeriesDomain(domainSeries);
  return series.map((entry) => {
    const points = filterHistoryWindow(entry.points, window, nowMs);
    const stats = summarizeHistorySeries(points);
    return {
      spec: entry.spec,
      points,
      stats,
      projected: stats && domain ? projectHistorySeries(points, domain, view) : [],
    };
  });
}

/** Honest empty state: shown whenever a dataset has fewer than two real observations. */
export function HistoryEmptyState({
  headingId,
  title,
  entries,
  maxPoints = MAX_HISTORY_POINTS_PER_DATASET,
  className,
}: {
  headingId: string;
  title: string;
  entries: { label: string; count: number }[];
  maxPoints?: number;
  className?: string;
}) {
  const stored = entries.reduce((sum, e) => sum + e.count, 0);
  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader className="pb-2">
        <h3 id={headingId} className="text-sm font-bold tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">Not enough readings yet.</p>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <p>
          A chart needs at least {CHART_MIN_POINTS} real observations. Nothing is drawn, estimated or backfilled before
          then, so the box stays empty instead of showing a fake line.
        </p>
        <ul className="space-y-1">
          {entries.map((e) => (
            <li key={e.label} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/60 px-2 py-1">
              <span className="font-medium text-foreground/85">{e.label}</span>
              <span className="tabular-nums">
                {e.count} / {maxPoints} stored
              </span>
            </li>
          ))}
        </ul>
        <p>
          Stored so far: {stored} real reading{stored === 1 ? "" : "s"} across {entries.length} dataset
          {entries.length === 1 ? "" : "s"}. The monitor appends a point only when a source read succeeds.
        </p>
      </CardContent>
    </Card>
  );
}

/** Arrow, amount and percentage for the selected reading's change, or an honest "no earlier reading". */
function focusDeltaCopy(focus: ChartFocus, formatValue: (value: number) => string): { text: string; className: string } {
  if (!focus.previous || focus.delta === null) {
    return {
      text: "no earlier plotted reading in this range, so there is no change to show",
      className: "text-muted-foreground",
    };
  }
  const previousStamp = formatWatFull(focus.previousTimeMs ?? historyPointTimeMs(focus.previous));
  if (focus.direction === "flat") {
    return {
      text: `unchanged from ${formatValue(focus.previous.value)} (${previousStamp})`,
      className: "text-foreground/80",
    };
  }
  const pct = focus.pctChange === null ? "" : ` (${focus.pctChange > 0 ? "+" : ""}${focus.pctChange}%)`;
  const signed = `${focus.direction === "up" ? "+" : "−"}${formatValue(Math.abs(focus.delta))}`;
  return {
    text: `${focus.direction === "up" ? "▲" : "▼"} ${signed}${pct} vs previous plotted reading (${previousStamp})`,
    className: focus.direction === "up" ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300",
  };
}

export type HistoryChartProps = {
  id: string;
  title: string;
  description?: string;
  /** Shared axis unit for every series in this group, e.g. "NGN per US$" or "NGN per litre". */
  unit?: string;
  series: ChartSeries[];
  /** Fixed reference instant supplied by the server so the static HTML and hydration agree. */
  nowMs: number;
  maxPoints?: number;
  showWindowToggle?: boolean;
  /** "large" is used by the dedicated /charts/* pages; the default stays compact for /status. */
  size?: "compact" | "large";
  /** "Full chart" links to the dedicated pages for the series drawn here. */
  chartPageLinks?: { label: string; href: string }[];
  /** Range selected on first paint. Falls back to ALL when that range cannot be drawn honestly. */
  initialWindow?: HistoryWindow;
  className?: string;
};

export function HistoryChart({
  id,
  title,
  description,
  unit,
  series,
  nowMs,
  maxPoints = MAX_HISTORY_POINTS_PER_DATASET,
  showWindowToggle = true,
  size = "compact",
  chartPageLinks,
  initialWindow = "all",
  className,
}: HistoryChartProps) {
  const [window, setWindow] = React.useState<HistoryWindow>(initialWindow);
  const [cursorX, setCursorX] = React.useState<number | null>(null);

  const view = size === "large" ? LARGE_VIEW : COMPACT_VIEW;
  const markerScale = size === "large" ? 1.5 : 1;
  const plotTop = view.paddingTop;
  const plotBottom = view.height - view.paddingBottom;
  const plotMid = (plotTop + plotBottom) / 2;
  const plotInsetPct = ((view.paddingTop / view.height) * 100).toFixed(3);

  // Per-window counts are derived once from the stored points. A window is offered only when at
  // least one dataset holds CHART_MIN_POINTS real observations inside it, so a filter can never
  // narrow the chart down to a fabricated or single-point line.
  const windowStats = React.useMemo(
    () => chartWindowStatuses(series.map((entry) => entry.points), nowMs),
    [series, nowMs],
  );

  const offeredWindows = windowStats.filter((entry) => entry.offered).map((entry) => entry.window);
  const activeWindow: HistoryWindow = offeredWindows.includes(window) ? window : "all";
  const activeStats = windowStats.find((entry) => entry.window === activeWindow)!;
  const unavailableWindows = windowStats.filter((entry) => !entry.offered);

  const prepared = React.useMemo(() => {
    // The shared domain is built from the datasets that can actually be drawn in this window.
    const drawable = series
      .map((entry) => filterHistoryWindow(entry.points, activeWindow, nowMs))
      .filter((points) => summarizeHistorySeries(points) !== null);
    return prepare(series, activeWindow, nowMs, drawable, view);
  }, [series, activeWindow, nowMs, view]);

  const plotted = prepared.filter((entry) => entry.stats !== null && entry.projected.length >= CHART_MIN_POINTS);
  const insufficient = prepared.filter((entry) => entry.stats === null);
  const totalStored = series.reduce((sum, entry) => sum + entry.points.length, 0);
  // Stored totals across every range: a series excluded from a narrow window may still have plenty
  // of readings in ALL, and the copy must not imply it has almost no history.
  const storedByDataset = new Map(series.map((entry) => [entry.spec.dataset, entry.points.length]));

  if (plotted.length === 0) {
    return (
      <HistoryEmptyState
        headingId={`${id}-heading`}
        title={title}
        entries={series.map((entry) => ({ label: entry.spec.label, count: entry.points.length }))}
        maxPoints={maxPoints}
        className={className}
      />
    );
  }

  const domain = historySeriesDomain(plotted.map((entry) => entry.points))!;
  const span = domain.maxValue - domain.minValue;
  const digits = axisDigits(span);
  const midValue = (domain.maxValue + domain.minValue) / 2;
  const midTimeMs = domain.singleInstant ? domain.minTimeMs : domain.minTimeMs + (domain.maxTimeMs - domain.minTimeMs) / 2;
  const latestMs = Math.max(...plotted.map((entry) => entry.stats!.endedAtMs));
  const earliestMs = Math.min(...plotted.map((entry) => entry.stats!.startedAtMs));
  const windowReadings = plotted.reduce((sum, entry) => sum + entry.points.length, 0);
  const allFlat = plotted.every((entry) => entry.stats!.flat) && domain.flat;
  const scopePhrase = activeWindow === "all" ? "all stored readings" : `the ${WINDOW_LABEL[activeWindow]}`;

  const ariaLabel = [
    `${title}${unit ? `, ${unit}` : ""}.`,
    `Showing ${scopePhrase}: ${windowReadings} of ${activeStats.storedReadings} stored real reading${
      activeStats.storedReadings === 1 ? "" : "s"
    } plotted, from ${formatWatDay(earliestMs)} to ${formatWatDay(latestMs)}.`,
    ...plotted.map((entry) =>
      describeHistorySeries({
        label: entry.spec.label,
        stats: entry.stats!,
        formatValue: (value) => formatChartValue(value, entry.spec.fractionDigits, entry.spec.unitSuffix),
        formatDate: formatWatDay,
        windowLabel: activeWindow === "all" ? undefined : WINDOW_LABEL[activeWindow],
      }),
    ),
    ...insufficient.map((entry) => {
      const stored = storedByDataset.get(entry.spec.dataset) ?? entry.points.length;
      return activeWindow === "all"
        ? `${entry.spec.label}: not enough readings yet, ${entry.points.length} of ${maxPoints} stored.`
        : `${entry.spec.label}: only ${entry.points.length} of ${stored} stored readings fall inside the ${WINDOW_LABEL[activeWindow]}, so it is not drawn in this range.`;
    }),
  ].join(" ");

  /* ---------- selection: hover, touch scrub and keyboard all map to a stored reading ---------- */

  const primary = plotted[0];
  const primaryProjected = primary.projected;

  const detailRows = plotted.map((entry) => {
    const index =
      cursorX === null
        ? entry.projected.length - 1
        : nearestProjectedIndex(entry.projected, cursorX);
    return {
      entry,
      focus: index === null ? null : chartFocusAt(entry.points, index),
    };
  });

  const updateCursorFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = cursorFromPointer(event.clientX - rect.left, rect.width, view.width);
    if (x !== null) setCursorX(x);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    updateCursorFromPointer(event);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    updateCursorFromPointer(event);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    // Mouse users return to the latest reading when leaving the plot. A touch selection stays
    // visible after the finger lifts so the number can still be read.
    if (event.pointerType === "mouse") setCursorX(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setCursorX(null);
      return;
    }
    if (!CHART_FOCUS_KEYS.includes(event.key as ChartFocusKey)) return;
    event.preventDefault();
    const current = cursorX === null ? null : nearestProjectedIndex(primaryProjected, cursorX);
    const next = stepFocusIndex(current, primaryProjected.length, event.key as ChartFocusKey);
    if (next !== null) setCursorX(primaryProjected[next].x);
  };

  const selectWindow = (next: HistoryWindow) => {
    setWindow(next);
    setCursorX(null);
  };

  const detailIsCursor = cursorX !== null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 id={`${id}-heading`} className="text-sm font-bold tracking-tight">
            {title}
          </h3>
          <p className="text-[11px] tabular-nums text-muted-foreground">As of {formatWatFull(latestMs)}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {description ??
            `Plotted from stored monitor observations only (${unit ?? "value"}). Gaps on the time axis mean no successful reading was recorded then.`}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center rounded-md border bg-background/60 px-2 py-0.5 font-semibold tabular-nums text-foreground/85">
            {activeWindow === "all"
              ? `${windowReadings} / ${totalStored} stored readings plotted`
              : `${windowReadings} of ${activeStats.storedReadings} stored readings in the ${WINDOW_LABEL[activeWindow]}`}
          </span>
          {showWindowToggle ? (
            <span className="inline-flex items-center gap-1" role="group" aria-label={`${title}: time window`}>
              {HISTORY_WINDOWS.map((w) => {
                const status = windowStats.find((entry) => entry.window === w)!;
                const active = w === activeWindow;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => selectWindow(w)}
                    aria-pressed={active}
                    disabled={!status.offered}
                    aria-describedby={status.offered ? undefined : `${id}-window-notes`}
                    title={
                      status.offered
                        ? `${WINDOW_LABEL[w]}: ${status.plottedReadings} of ${status.storedReadings} stored readings plotted`
                        : status.reason ?? `${WINDOW_LABEL[w]}: not enough stored readings to plot`
                    }
                    className={cn(
                      "min-h-11 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 motion-reduce:transition-none sm:min-h-7 sm:px-2.5 sm:py-0.5",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      !status.offered && "cursor-not-allowed border-dashed opacity-60 hover:border-border hover:text-muted-foreground",
                    )}
                  >
                    {w === "all" ? "All" : w}
                  </button>
                );
              })}
            </span>
          ) : null}
          {allFlat ? (
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 font-medium">
              Flat: every stored reading is identical, so the line does not move
            </span>
          ) : null}
        </div>
        {showWindowToggle && unavailableWindows.length ? (
          <p id={`${id}-window-notes`} className="text-[11px] text-muted-foreground">
            Ranges without enough stored readings stay off:{" "}
            {unavailableWindows.map((entry) => entry.reason).filter(Boolean).join(" ")}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className={cn("flex items-stretch gap-2", size === "large" ? "py-2" : "py-1.5")}>
          {/* Value axis: rendered as HTML so it stays crisp and readable at every viewport width. */}
          <div className={cn("relative shrink-0", size === "large" ? "w-16" : "w-14")} aria-hidden="true">
            <div className="absolute inset-x-0" style={{ top: `${plotInsetPct}%`, bottom: `${plotInsetPct}%` }}>
              {domain.flat ? (
                <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-right text-[10px] leading-none tabular-nums text-muted-foreground">
                  {formatChartValue(domain.maxValue, digits)}
                </span>
              ) : (
                <>
                  <span className="absolute inset-x-0 top-0 -translate-y-1/2 text-right text-[10px] leading-none tabular-nums text-muted-foreground">
                    {formatChartValue(domain.maxValue, digits)}
                  </span>
                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-right text-[10px] leading-none tabular-nums text-muted-foreground">
                    {formatChartValue(midValue, digits)}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 translate-y-1/2 text-right text-[10px] leading-none tabular-nums text-muted-foreground">
                    {formatChartValue(domain.minValue, digits)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div
            className="relative min-w-0 flex-1 cursor-crosshair select-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ touchAction: "pan-y" }}
            tabIndex={0}
            role="group"
            aria-label={`${title}: interactive stored readings`}
            aria-describedby={`${id}-instructions`}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerLeave}
            onKeyDown={handleKeyDown}
          >
            <svg
              viewBox={`0 0 ${view.width} ${view.height}`}
              className="h-auto w-full"
              role="img"
              aria-labelledby={`${id}-title ${id}-desc`}
              aria-describedby={`${id}-legend`}
              focusable="false"
            >
              <title id={`${id}-title`}>{title}</title>
              <desc id={`${id}-desc`}>{ariaLabel}</desc>

              <g className="text-border" aria-hidden="true">
                {domain.flat ? (
                  <line
                    x1={0}
                    x2={view.width}
                    y1={plotMid}
                    y2={plotMid}
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : (
                  [plotTop, plotMid, plotBottom].map((y) => (
                    <line
                      key={y}
                      x1={0}
                      x2={view.width}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="3 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))
                )}
              </g>

              {cursorX !== null ? (
                <line
                  aria-hidden="true"
                  x1={cursorX}
                  x2={cursorX}
                  y1={plotTop}
                  y2={plotBottom}
                  className="text-foreground/50"
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}

              {plotted.map((entry) => {
                const stride = historyMarkerStride(entry.projected.length, 12);
                const selectedIndex =
                  cursorX === null ? entry.projected.length - 1 : nearestProjectedIndex(entry.projected, cursorX);
                const selected = selectedIndex === null ? null : entry.projected[selectedIndex];
                return (
                  <g key={entry.spec.dataset} className={TONE_CLASS[entry.spec.tone]}>
                    <polyline
                      points={historyPolylinePoints(entry.projected)}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={size === "large" ? 2.25 : 2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeDasharray={entry.spec.dash}
                      vectorEffect="non-scaling-stroke"
                    />
                    {entry.projected.map((p, i) =>
                      i % stride === 0 || i === entry.projected.length - 1 ? (
                        <SeriesMarkerGlyph
                          key={`${entry.spec.dataset}-${i}`}
                          shape={entry.spec.marker}
                          x={p.x}
                          y={p.y}
                          scale={markerScale}
                        />
                      ) : null,
                    )}
                    {selected ? (
                      <circle
                        cx={selected.x}
                        cy={selected.y}
                        r={markerScale * (cursorX === null ? 3.4 : 5)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        opacity={cursorX === null ? 0.55 : 1}
                      />
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-3 gap-2 text-[10px] tabular-nums text-muted-foreground",
            size === "large" ? "pl-[4.5rem]" : "pl-16",
          )}
        >
          <span>{formatWatDayTime(earliestMs)} WAT</span>
          <span className="text-center">{domain.singleInstant ? "" : `${formatWatDayTime(midTimeMs)} WAT`}</span>
          <span className="text-right">{formatWatDayTime(latestMs)} WAT</span>
        </div>

        {/* Detail row: the single place hover, touch scrub and keyboard readings are reported. */}
        <div
          id={`${id}-detail`}
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            "rounded-lg border bg-secondary/30 p-2 text-xs",
            detailIsCursor && "border-primary/50 bg-primary/5",
          )}
        >
          <p className="mb-1 font-semibold text-foreground/85">
            {detailIsCursor ? "Reading nearest your pointer or finger" : "Latest stored reading"}
          </p>
          <ul className="space-y-1.5">
            {detailRows.map(({ entry, focus }) => {
              if (!focus) return null;
              const value = (n: number) => formatChartValue(n, entry.spec.fractionDigits, entry.spec.unitSuffix);
              const delta = focusDeltaCopy(focus, value);
              return (
                <li key={entry.spec.dataset} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-foreground">{entry.spec.shortLabel ?? entry.spec.label}</span>
                  <span className="font-extrabold tabular-nums">{value(focus.point.value)}</span>
                  <span className="tabular-nums text-muted-foreground">{formatWatFull(focus.timeMs)}</span>
                  <span className={cn("text-[11px] tabular-nums", delta.className)}>{delta.text}</span>
                </li>
              );
            })}
          </ul>
          <p id={`${id}-instructions`} className="mt-1 text-[11px] text-muted-foreground">
            {size === "large"
              ? "Hover, drag a finger across the plot, or focus it and use the arrow keys (Home and End jump to the ends) to read a stored point. Only real readings are shown."
              : "Hover or drag across the plot, or focus it and use the arrow keys, to read a stored point. Only real readings are shown."}
          </p>
        </div>

        <ul id={`${id}-legend`} className="space-y-1.5 border-t pt-2.5 text-xs">
          {plotted.map((entry) => {
            const stats = entry.stats!;
            const value = (n: number) => formatChartValue(n, entry.spec.fractionDigits, entry.spec.unitSuffix);
            return (
              <li key={entry.spec.dataset} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true" focusable="false" className={cn("shrink-0", TONE_CLASS[entry.spec.tone])}>
                  <line x1="1" y1="6" x2="29" y2="6" stroke="currentColor" strokeWidth={2} strokeDasharray={entry.spec.dash} />
                  <g transform="translate(15 6)">
                    <SeriesMarkerGlyph shape={entry.spec.marker} x={0} y={0} />
                  </g>
                </svg>
                <span className="font-semibold text-foreground">{entry.spec.shortLabel ?? entry.spec.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  latest {value(stats.last.value)} · {stats.count}/{maxPoints} points
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    stats.direction === "up"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                      : stats.direction === "down"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                        : "border-border bg-secondary/70 text-foreground/85",
                  )}
                  title={`First plotted reading ${value(stats.first.value)} on ${formatWatFull(stats.startedAtMs)}`}
                >
                  <span aria-hidden="true">{stats.direction === "up" ? "▲" : stats.direction === "down" ? "▼" : "■"}</span>
                  <span>
                    {stats.direction === "flat"
                      ? "no change in window"
                      : `${stats.direction} ${value(Math.abs(stats.change))}${
                          stats.pctChange === null ? "" : ` (${stats.pctChange > 0 ? "+" : ""}${stats.pctChange}%)`
                        }`}
                  </span>
                </span>
                {entry.spec.sourceUrl ? (
                  <a
                    href={entry.spec.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-[10px] text-muted-foreground underline decoration-border underline-offset-2 hover:text-primary"
                  >
                    {entry.spec.sourceName ?? "source"}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>

        {chartPageLinks?.length ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-xs">
            {chartPageLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="font-semibold text-primary underline-offset-2 hover:underline">
                  Full chart: {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {insufficient.length ? (
          <ul className="space-y-1 rounded-lg border border-dashed bg-background/50 p-2 text-[11px] text-muted-foreground">
            {insufficient.map((entry) => {
              const stored = storedByDataset.get(entry.spec.dataset) ?? entry.points.length;
              return (
                <li key={entry.spec.dataset}>
                  <span className="font-semibold text-foreground/85">{entry.spec.label}</span> —{" "}
                  {activeWindow === "all" ? (
                    <>
                      not enough readings yet (
                      <span className="tabular-nums">
                        {entry.points.length}/{maxPoints}
                      </span>{" "}
                      stored). No line is drawn for it until a second real observation exists.
                    </>
                  ) : (
                    <>
                      only{" "}
                      <span className="tabular-nums">
                        {entry.points.length} of {stored}
                      </span>{" "}
                      stored readings fall inside the {WINDOW_LABEL[activeWindow]}, so it is not drawn in this range.
                      Choose ALL to plot its older readings.
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        <details className="rounded-lg border bg-background/40 p-2 text-[11px]">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0">
            Show the {windowReadings} real readings plotted ({scopePhrase})
          </summary>
          <div className="mt-2 space-y-3">
            {plotted.map((entry) => (
              <table key={entry.spec.dataset} className="w-full border-collapse text-left">
                <caption className="pb-1 text-left font-semibold text-foreground/85">
                  {entry.spec.label} · {entry.points.length} of {maxPoints} stored
                </caption>
                <thead>
                  <tr className="text-muted-foreground">
                    <th scope="col" className="border-b py-1 pr-2 font-medium">
                      Reading time (WAT)
                    </th>
                    <th scope="col" className="border-b py-1 pr-2 font-medium">
                      Value
                    </th>
                    <th scope="col" className="border-b py-1 font-medium">
                      Recorded (UTC)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entry.points.map((p, i) => (
                    <tr key={`${p.sourceTime}-${p.value}-${i}`} className="tabular-nums">
                      <th scope="row" className="border-b border-border/60 py-1 pr-2 font-normal">
                        {formatWatFull(historyPointTimeMs(p))}
                      </th>
                      <td className="border-b border-border/60 py-1 pr-2">
                        {formatChartValue(p.value, entry.spec.fractionDigits, entry.spec.unitSuffix)}
                      </td>
                      <td className="border-b border-border/60 py-1 text-muted-foreground">
                        {p.observedAt.slice(0, 16).replace("T", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
