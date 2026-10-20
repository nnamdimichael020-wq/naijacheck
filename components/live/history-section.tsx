import { MAX_HISTORY_POINTS_PER_DATASET, datasetHistoryPoints } from "@/lib/live";
import {
  FUEL_HISTORY_SERIES,
  FX_HISTORY_SERIES,
  LPG_HISTORY_SERIES,
  type ChartSeriesSpec,
} from "@/lib/chart-series";
import { chartPagePath, chartPagesForDatasets } from "@/lib/chart-pages";
import { HistoryChart, type ChartSeries } from "@/components/live/history-chart";

/**
 * Server-side wiring for the history charts. Every series is read from the same bounded store
 * (data/history.json via lib/live), so charts, change badges and the daily briefing can never
 * disagree about what was actually observed. Presentation metadata lives in lib/chart-series so
 * the dedicated /charts/* pages and these inline charts draw the same labels and markers.
 */

export { FUEL_HISTORY_SERIES, FX_HISTORY_SERIES, LPG_HISTORY_SERIES };

export function HistorySection({
  id,
  title,
  description,
  unit,
  series,
  only,
  maxPoints = MAX_HISTORY_POINTS_PER_DATASET,
  size = "compact",
  className,
}: {
  id: string;
  title: string;
  description?: string;
  unit?: string;
  series: ChartSeriesSpec[];
  /** Restrict the group to specific dataset ids (used by the diesel-only generator page). */
  only?: string[];
  maxPoints?: number;
  /** "large" is reserved for the dedicated /charts/* pages. */
  size?: "compact" | "large";
  className?: string;
}) {
  // Fixed at build/render time on the server and passed down, so the exported HTML and the
  // hydrated client agree on which window each stored reading falls into.
  const nowMs = Date.now();
  const selected = only ? series.filter((spec) => only.includes(spec.dataset)) : series;
  const chartSeries: ChartSeries[] = selected.map((spec) => ({
    spec,
    points: datasetHistoryPoints(spec.dataset, maxPoints),
  }));
  // Every group links to the dedicated page for each plotted series, so the inline chart and the
  // full page can never drift apart.
  const chartPageLinks = chartPagesForDatasets(selected.map((spec) => spec.dataset)).map((page) => ({
    label: page.name,
    href: chartPagePath(page),
  }));
  return (
    <HistoryChart
      id={id}
      title={title}
      description={description}
      unit={unit}
      series={chartSeries}
      nowMs={nowMs}
      maxPoints={maxPoints}
      size={size}
      chartPageLinks={chartPageLinks}
      className={className}
    />
  );
}

export function FxHistorySection({ className }: { className?: string }) {
  return (
    <HistorySection
      id="chart-fx-usd"
      title="US dollar against the naira"
      unit="NGN per US$"
      series={FX_HISTORY_SERIES}
      description="Parallel-market buy quote and the official CBN NFEM closing rate are separate markets and are plotted on one shared naira axis. Each marker is a reading the monitor actually recorded; the horizontal axis is the source's own reading time, so gaps are real gaps."
      className={className}
    />
  );
}

export function FuelHistorySection({ only, className }: { only?: string[]; className?: string }) {
  return (
    <HistorySection
      id="chart-fuel-depot"
      title="Wholesale depot fuel medians"
      unit="NGN per litre"
      series={FUEL_HISTORY_SERIES}
      only={only}
      description="National depot/gantry medians parsed from published depot tables. These are wholesale prices, not station pump prices, and only successfully parsed readings are plotted."
      className={className}
    />
  );
}

export function LpgHistorySection({ className }: { className?: string }) {
  return (
    <HistorySection
      id="chart-fuel-lpg"
      title="Wholesale depot cooking gas (LPG) median"
      unit="NGN per kg"
      series={LPG_HISTORY_SERIES}
      description="LPG is priced per kilogram, so it is charted separately from the per-litre petrol and diesel medians."
      className={className}
    />
  );
}
