import {
  CHART_MIN_POINTS,
  MAX_HISTORY_POINTS_PER_DATASET,
  describeHistorySeries,
  historyPolylinePoints,
  historySeriesDomain,
  projectHistorySeries,
  summarizeHistorySeries,
} from "@/lib/history";
import { datasetHistoryPoints } from "@/lib/live";
import { cn, formatWatDay, formatWatDayShort } from "@/lib/utils";

/**
 * Compact, server-rendered sparkline for cards. It reads the same bounded history store as the
 * full charts and draws nothing at all when a dataset has fewer than two real observations.
 * No client JavaScript, no chart dependency.
 */

const MINI_VIEW = { width: 240, height: 36, paddingTop: 4, paddingBottom: 4, paddingLeft: 2, paddingRight: 2 };

const TONE_CLASS = {
  primary: "text-primary",
  amber: "text-amber-600 dark:text-amber-400",
  sky: "text-sky-700 dark:text-sky-400",
  violet: "text-violet-700 dark:text-violet-400",
} as const;

const group3 = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function compactValue(value: number, fractionDigits?: number, unitSuffix?: string): string {
  if (!Number.isFinite(value)) return "Unavailable";
  const digits = fractionDigits ?? (Number.isInteger(value) ? 0 : 2);
  const [whole, decimal] = Math.abs(value).toFixed(digits).split(".");
  return `₦${group3(whole)}${decimal ? `.${decimal}` : ""}${unitSuffix ?? ""}`;
}

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
  tone?: keyof typeof TONE_CLASS;
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
  const last = projected[projected.length - 1];
  const value = (n: number) => compactValue(n, fractionDigits, unitSuffix);
  const ariaLabel = describeHistorySeries({
    label,
    stats,
    formatValue: value,
    formatDate: formatWatDay,
  });

  return (
    <div className={cn("space-y-0.5", className)}>
      <svg
        viewBox={`0 0 ${MINI_VIEW.width} ${MINI_VIEW.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
        focusable="false"
      >
        <title>{`${label}: ${stats.count} of ${maxPoints} stored readings`}</title>
        <line
          x1={0}
          x2={MINI_VIEW.width}
          y1={MINI_VIEW.height - MINI_VIEW.paddingBottom}
          y2={MINI_VIEW.height - MINI_VIEW.paddingBottom}
          className="text-border"
          stroke="currentColor"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          aria-hidden="true"
        />
        <g className={TONE_CLASS[tone]}>
          <polyline
            points={historyPolylinePoints(projected)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={dash}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={last.x} cy={last.y} r={3} fill="currentColor" />
        </g>
      </svg>
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
