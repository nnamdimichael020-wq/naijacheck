import {
  CHART_MIN_POINTS,
  MAX_HISTORY_POINTS_PER_DATASET,
  describeHistorySeries,
  historySeriesDomain,
  projectHistorySeries,
  summarizeHistorySeries,
} from "@/lib/history";
import { datasetHistoryPoints } from "@/lib/live";
import { hudUnitLabel } from "@/lib/chart-interaction";
import { TONE_CLASS, formatChartValue, type SeriesTone } from "@/lib/chart-format";
import { SparklineScrub, type SparklineReading } from "@/components/live/sparkline-scrub";
import { cn, formatWatDay, formatWatDayShort } from "@/lib/utils";

/**
 * Compact sparkline for cards (homepage Daily Briefing, /status, /charts index). It reads the same
 * bounded history store as the full charts and draws nothing at all when a dataset has fewer than
 * two real observations.
 *
 * The stored points are projected here, on the server, and only each reading's own value, time and
 * viewBox position are handed to the small interactive plot (`SparklineScrub`), which adds the
 * crosshair + floating price tag. No chart dependency, no client-side data fetching.
 */

const MINI_VIEW = { width: 240, height: 36, paddingTop: 4, paddingBottom: 4, paddingLeft: 2, paddingRight: 2 };

export function MiniSparkline({
  dataset,
  label,
  tone = "primary",
  dash,
  unitSuffix,
  fractionDigits,
  maxPoints = MAX_HISTORY_POINTS_PER_DATASET,
  className,
}: {
  dataset: string;
  label: string;
  tone?: SeriesTone;
  dash?: string;
  unitSuffix?: string;
  fractionDigits?: number;
  maxPoints?: number;
  className?: string;
}) {
  const points = datasetHistoryPoints(dataset, maxPoints);
  const stats = summarizeHistorySeries(points);

  if (!stats) {
    return (
      <p className={cn("text-[10px] leading-tight text-muted-foreground", className)}>
        <span aria-hidden="true">▱</span> Chart: not enough readings yet — {points.length}/{maxPoints} stored (
        {CHART_MIN_POINTS} real observations needed). Nothing is estimated.
      </p>
    );
  }

  const domain = historySeriesDomain([points])!;
  const projected = projectHistorySeries(points, domain, MINI_VIEW);
  // Slim, serialisable readings: each is one stored observation's own value and time plus where it
  // is drawn. Nothing between readings is ever sent or computed.
  const readings: SparklineReading[] = projected.map((p) => ({ x: p.x, y: p.y, value: p.value, timeMs: p.timeMs }));
  const value = (n: number) => formatChartValue(n, fractionDigits, unitSuffix);
  const ariaLabel = describeHistorySeries({
    label,
    stats,
    formatValue: value,
    formatDate: formatWatDay,
  });

  return (
    <div className={cn("space-y-0.5", className)}>
      <SparklineScrub
        label={label}
        title={`${label}: ${stats.count} of ${maxPoints} stored readings`}
        ariaLabel={ariaLabel}
        readings={readings}
        view={MINI_VIEW}
        tone={tone}
        dash={dash}
        fractionDigits={fractionDigits}
        unitSuffix={unitSuffix}
        unitLabel={hudUnitLabel(stats.last.unit, unitSuffix)}
      />
      <p className="flex flex-wrap items-center justify-between gap-x-2 text-[10px] leading-tight tabular-nums text-muted-foreground">
        <span>
          {stats.count}/{maxPoints} real readings · {formatWatDayShort(stats.startedAtMs)}–
          {formatWatDayShort(stats.endedAtMs)}
        </span>
        <span className={cn("font-semibold", TONE_CLASS[tone])}>
          {stats.direction === "flat"
            ? "flat over window"
            : `${stats.direction} ${value(Math.abs(stats.change))} (${formatWatDayShort(stats.startedAtMs)} → latest)`}
        </span>
      </p>
    </div>
  );
}
