"use client";

/**
 * Lightweight SVG history charts drawn only from observations the monitor really stored.
 *
 * Rules this component enforces:
 *  - A dataset with fewer than two real points gets an honest empty state, never a fabricated line.
 *  - Nothing is interpolated, smoothed or backfilled: the polyline joins stored readings only, and
 *    the x-axis is the reading's own source time so genuine gaps stay visible.
 *  - Series are told apart by dash pattern, marker shape and a text legend, not by colour alone.
 *  - Every count is shown as `stored / cap` (for example 9/56) next to the latest reading's WAT time.
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
import { cn, formatWatDay, formatWatDayTime, formatWatFull } from "@/lib/utils";

/** viewBox units. The plot area is inset 5% top/bottom so the HTML axis labels line up exactly. */
const VIEW = { width: 300, height: 140, paddingTop: 7, paddingBottom: 7, paddingLeft: 3, paddingRight: 3 };
const PLOT_TOP = VIEW.paddingTop;
const PLOT_BOTTOM = VIEW.height - VIEW.paddingBottom;
const PLOT_MID = (PLOT_TOP + PLOT_BOTTOM) / 2;
const PLOT_INSET_PCT = ((VIEW.paddingTop / VIEW.height) * 100).toFixed(3);

export type SeriesMarker = "circle" | "square" | "triangle" | "diamond";
export type SeriesTone = "primary" | "amber" | "sky" | "violet";

export type ChartSeriesSpec = {
  /** Dataset id in data/history.json, e.g. "parallel-usd-ngn-buy". */
  dataset: string;
  label: string;
  /** Shorter label used in tight legends. */
  shortLabel?: string;
  /** Appended to formatted values, e.g. "/L". */
  unitSuffix?: string;
  fractionDigits?: number;
  marker: SeriesMarker;
  /** stroke-dasharray; keeps series distinguishable without relying on colour. */
  dash?: string;
  tone: SeriesTone;
  sourceUrl?: string;
  sourceName?: string;
};

export type ChartSeries = { spec: ChartSeriesSpec; points: HistoryPoint[] };

const TONE_CLASS: Record<SeriesTone, string> = {
  primary: "text-primary",
  amber: "text-amber-600 dark:text-amber-400",
  sky: "text-sky-700 dark:text-sky-400",
  violet: "text-violet-700 dark:text-violet-400",
};

const WINDOW_LABEL: Record<HistoryWindow, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  all: "all stored readings",
};

const group3 = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Deterministic naira formatting (no Intl) so server HTML and client hydration always match. */
export function formatChartValue(value: number, fractionDigits?: number, unitSuffix?: string): string {
  if (!Number.isFinite(value)) return "Unavailable";
  const digits = fractionDigits ?? (Number.isInteger(value) ? 0 : 2);
  const fixed = Math.abs(value).toFixed(digits);
  const [whole, decimal] = fixed.split(".");
  return `₦${group3(whole)}${decimal ? `.${decimal}` : ""}${unitSuffix ?? ""}`;
}

/** Axis labels stay narrow on phones: fewer decimals when the plotted range is wide. */
function axisDigits(span: number): number {
  if (span <= 0) return 0;
  if (span >= 20) return 0;
  if (span >= 2) return 1;
  return 2;
}

function SeriesMarkerGlyph({ shape, x, y }: { shape: SeriesMarker; x: number; y: number }) {
  switch (shape) {
    case "square":
      return <rect x={x - 2.4} y={y - 2.4} width={4.8} height={4.8} fill="currentColor" />;
    case "triangle":
      return <path d={`M${x},${y - 3.1} L${x + 2.9},${y + 2.2} L${x - 2.9},${y + 2.2} Z`} fill="currentColor" />;
    case "diamond":
      return <path d={`M${x},${y - 3.3} L${x + 3.3},${y} L${x},${y + 3.3} L${x - 3.3},${y} Z`} fill="currentColor" />;
    case "circle":
    default:
      return <circle cx={x} cy={y} r={2.6} fill="currentColor" />;
  }
}

type PreparedSeries = {
  spec: ChartSeriesSpec;
  points: HistoryPoint[];
  stats: HistorySeriesStats | null;
  projected: ReturnType<typeof projectHistorySeries>;
};

function prepare(series: ChartSeries[], window: HistoryWindow, nowMs: number, domainSeries: HistoryPoint[][]): PreparedSeries[] {
  const domain = historySeriesDomain(domainSeries);
  return series.map((entry) => {
    const points = filterHistoryWindow(entry.points, window, nowMs);
    const stats = summarizeHistorySeries(points);
    return {
      spec: entry.spec,
      points,
      stats,
      projected: stats && domain ? projectHistorySeries(points, domain, VIEW) : [],
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

export function HistoryChart({
  id,
  title,
  description,
  unit,
  series,
  nowMs,
  maxPoints = MAX_HISTORY_POINTS_PER_DATASET,
  showWindowToggle = true,
  className,
}: {
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
  className?: string;
}) {
  const [window, setWindow] = React.useState<HistoryWindow>("all");

  // Per-window counts are derived once from the stored points. A window is offered only when at
  // least one dataset holds CHART_MIN_POINTS real observations inside it, so a filter can never
  // narrow the chart down to a fabricated or single-point line.
  const windowStats = React.useMemo(
    () =>
      HISTORY_WINDOWS.map((w) => {
        const perSeries = series.map((entry) => filterHistoryWindow(entry.points, w, nowMs));
        const drawable = perSeries.filter((points) => points.length >= CHART_MIN_POINTS);
        return {
          window: w,
          offered: drawable.length > 0,
          drawableSeries: drawable.length,
          plottedReadings: drawable.reduce((sum, points) => sum + points.length, 0),
          storedReadings: perSeries.reduce((sum, points) => sum + points.length, 0),
        };
      }),
    [series, nowMs],
  );

  const offeredWindows = windowStats.filter((entry) => entry.offered).map((entry) => entry.window);
  const activeWindow: HistoryWindow = offeredWindows.includes(window) ? window : "all";
  const activeStats = windowStats.find((entry) => entry.window === activeWindow)!;

  const prepared = React.useMemo(() => {
    // The shared domain is built from the datasets that can actually be drawn in this window.
    const drawable = series
      .map((entry) => filterHistoryWindow(entry.points, activeWindow, nowMs))
      .filter((points) => summarizeHistorySeries(points) !== null);
    return prepare(series, activeWindow, nowMs, drawable);
  }, [series, activeWindow, nowMs]);

  const plotted = prepared.filter((entry) => entry.stats !== null && entry.projected.length >= CHART_MIN_POINTS);
  const insufficient = prepared.filter((entry) => entry.stats === null);
  const totalStored = series.reduce((sum, entry) => sum + entry.points.length, 0);

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
    ...insufficient.map((entry) => `${entry.spec.label}: not enough readings yet, ${entry.points.length} of ${maxPoints} stored.`),
  ].join(" ");

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 id={`${id}-heading`} className="text-sm font-bold tracking-tight">
            {title}
          </h3>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            As of {formatWatFull(latestMs)}
          </p>
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
          {showWindowToggle && offeredWindows.length > 1 ? (
            <span className="inline-flex items-center gap-1" role="group" aria-label={`${title}: time window`}>
              {offeredWindows.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWindow(w)}
                  aria-pressed={w === activeWindow}
                  title={`${WINDOW_LABEL[w]}: ${windowStats.find((entry) => entry.window === w)!.plottedReadings} of ${
                    windowStats.find((entry) => entry.window === w)!.storedReadings
                  } stored readings plotted`}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    w === activeWindow
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {w === "all" ? "All" : w}
                </button>
              ))}
            </span>
          ) : null}
          {allFlat ? (
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 font-medium">
              Flat: every stored reading is identical, so the line does not move
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="pt-1.5 pb-1.5 flex items-stretch gap-2">
          {/* Value axis: rendered as HTML so it stays crisp and readable at every viewport width. */}
          <div className="relative w-14 shrink-0" aria-hidden="true">
            <div
              className="absolute inset-x-0"
              style={{ top: `${PLOT_INSET_PCT}%`, bottom: `${PLOT_INSET_PCT}%` }}
            >
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

          <div className="min-w-0 flex-1">
            <svg
              viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
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
                    x2={VIEW.width}
                    y1={PLOT_MID}
                    y2={PLOT_MID}
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : (
                  [PLOT_TOP, PLOT_MID, PLOT_BOTTOM].map((y) => (
                    <line
                      key={y}
                      x1={0}
                      x2={VIEW.width}
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

              {plotted.map((entry) => {
                const stride = historyMarkerStride(entry.projected.length, 12);
                return (
                  <g key={entry.spec.dataset} className={TONE_CLASS[entry.spec.tone]}>
                    <polyline
                      points={historyPolylinePoints(entry.projected)}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeDasharray={entry.spec.dash}
                      vectorEffect="non-scaling-stroke"
                    />
                    {entry.projected.map((p, i) =>
                      i % stride === 0 || i === entry.projected.length - 1 ? (
                        <SeriesMarkerGlyph key={`${entry.spec.dataset}-${i}`} shape={entry.spec.marker} x={p.x} y={p.y} />
                      ) : null,
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="flex justify-between gap-2 pl-16 text-[10px] tabular-nums text-muted-foreground">
          <span>{formatWatDayTime(earliestMs)} WAT</span>
          <span className="text-right">{formatWatDayTime(latestMs)} WAT</span>
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

        {insufficient.length ? (
          <ul className="space-y-1 rounded-lg border border-dashed bg-background/50 p-2 text-[11px] text-muted-foreground">
            {insufficient.map((entry) => (
              <li key={entry.spec.dataset}>
                <span className="font-semibold text-foreground/85">{entry.spec.label}</span> — not enough readings yet (
                <span className="tabular-nums">
                  {entry.points.length}/{maxPoints}
                </span>{" "}
                stored). No line is drawn for it until a second real observation exists.
              </li>
            ))}
          </ul>
        ) : null}

        <details className="rounded-lg border bg-background/40 p-2 text-[11px]">
          <summary className="cursor-pointer font-semibold text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
