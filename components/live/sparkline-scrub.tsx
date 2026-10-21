"use client";

/**
 * Interactive plot for the compact sparklines (homepage Daily Briefing, /status, /charts index).
 *
 * The same interaction model as the full HistoryChart, scaled down: touch-drag, hover or arrow keys
 * snap a crosshair (vertical + horizontal line) to the nearest STORED reading, the selected vertex
 * is emphasized, and a small floating HUD above the line shows that reading's own price, unit,
 * WAT time and change vs the previous plotted reading. A sparkline has no axes, so the HUD carries
 * both the price and the time callout.
 *
 * It receives readings already projected on the server from data/history.json (value, time and
 * viewBox position only), so nothing is fetched, estimated or interpolated in the browser.
 */
import * as React from "react";
import { ChartHud } from "@/components/live/chart-hud";
import { useCrosshairScrub } from "@/components/live/use-crosshair-scrub";
import {
  crosshairLabelFraction,
  crosshairSelection,
  focusHudCopy,
  hudModeFor,
  readingFocusAt,
} from "@/lib/chart-interaction";
import { TONE_CLASS, formatChartValue, type SeriesTone } from "@/lib/chart-format";
import { historyPolylinePoints } from "@/lib/history";
import { cn, formatWatFull } from "@/lib/utils";

/** One stored reading, projected on the server: its own value and time plus its viewBox position. */
export type SparklineReading = { x: number; y: number; value: number; timeMs: number };

export type SparklineView = {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

export function SparklineScrub({
  label,
  title,
  ariaLabel,
  readings,
  view,
  tone = "primary",
  dash,
  fractionDigits,
  unitSuffix,
  unitLabel,
}: {
  label: string;
  title: string;
  ariaLabel: string;
  readings: SparklineReading[];
  view: SparklineView;
  tone?: SeriesTone;
  dash?: string;
  fractionDigits?: number;
  unitSuffix?: string;
  /** "per USD" style unit read from the stored readings; null when the suffix already says it. */
  unitLabel?: string | null;
}) {
  const instructionsId = React.useId();
  const { cursorX, pointerHandlers, onKeyDown } = useCrosshairScrub(view.width);

  const mode = hudModeFor(cursorX);
  const scrubbing = mode === "selected";
  const selected = crosshairSelection(readings, cursorX);
  const focus = selected ? readingFocusAt(readings, selected.index) : null;
  const hud = focusHudCopy(focus, {
    mode,
    formatValue: (value) => formatChartValue(value, fractionDigits, unitSuffix),
    formatDateTime: formatWatFull,
    unit: unitLabel ?? null,
  });
  const last = readings[readings.length - 1];
  const fraction = crosshairLabelFraction(selected?.x ?? view.width, view.width);
  const toneClass = TONE_CLASS[tone] ?? TONE_CLASS.primary;

  return (
    <div className="space-y-1">
      {hud ? (
        <div aria-hidden="true">
          <ChartHud hud={hud} size="mini" fraction={fraction} />
        </div>
      ) : null}
      <div
        className="relative cursor-crosshair select-none rounded-sm outline-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ touchAction: "pan-y" }}
        tabIndex={0}
        role="group"
        aria-label={`${label}: interactive stored readings`}
        aria-describedby={instructionsId}
        data-scrubbing={scrubbing ? "true" : "false"}
        {...pointerHandlers}
        onKeyDown={(event) => onKeyDown(event, readings)}
      >
        <svg
          viewBox={`0 0 ${view.width} ${view.height}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={ariaLabel}
          focusable="false"
        >
          <title>{title}</title>
          <line
            x1={0}
            x2={view.width}
            y1={view.height - view.paddingBottom}
            y2={view.height - view.paddingBottom}
            className="text-border"
            stroke="currentColor"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            aria-hidden="true"
          />
          <g className={toneClass}>
            <polyline
              points={historyPolylinePoints(readings)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={dash}
              vectorEffect="non-scaling-stroke"
            />
            {last && selected?.index !== readings.length - 1 ? <circle cx={last.x} cy={last.y} r={3} fill="currentColor" /> : null}
          </g>
          {selected ? (
            <g data-chart-crosshair={scrubbing ? "selected" : "latest"} aria-hidden="true">
              <line
                data-crosshair="vertical"
                x1={selected.x}
                x2={selected.x}
                y1={0}
                y2={view.height}
                className={scrubbing ? "text-foreground/70" : "text-foreground/35"}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <line
                data-crosshair="horizontal"
                x1={0}
                x2={view.width}
                y1={selected.y}
                y2={selected.y}
                className={cn(toneClass, scrubbing ? "opacity-80" : "opacity-45")}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <g data-crosshair="vertex" className={toneClass}>
                <circle cx={selected.x} cy={selected.y} r={5.2} className="fill-background" />
                <circle
                  cx={selected.x}
                  cy={selected.y}
                  r={4.4}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={scrubbing ? 2 : 1.5}
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={selected.x} cy={selected.y} r={2.6} fill="currentColor" />
              </g>
            </g>
          ) : null}
        </svg>
      </div>
      <p id={instructionsId} className="sr-only">
        Touch and drag, hover, or focus and use the arrow keys to read a stored reading. The crosshair snaps to real
        readings only; letting go returns to the latest reading.
      </p>
      {/* Screen-reader read-out of the same stored reading the HUD shows. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {hud ? `${hud.label}: ${hud.price}${hud.unit ? ` ${hud.unit}` : ""}, ${hud.timestamp}. ${hud.delta ? `${hud.delta} ${hud.deltaNote}` : hud.deltaNote}.` : ""}
      </p>
    </div>
  );
}
