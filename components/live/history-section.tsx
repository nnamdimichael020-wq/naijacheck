import {
  LIVE_FUEL,
  LIVE_FX,
  MAX_HISTORY_POINTS_PER_DATASET,
  datasetHistoryPoints,
} from "@/lib/live";
import { HistoryChart, type ChartSeries, type ChartSeriesSpec } from "@/components/live/history-chart";

/**
 * Server-side wiring for the history charts. Every series is read from the same bounded store
 * (data/history.json via lib/live), so charts, change badges and the daily briefing can never
 * disagree about what was actually observed.
 */

const ABOKI_URL = LIVE_FX.blackMarketSource?.url ?? "https://abokiforex.app/";
const CBN_URL = LIVE_FX.officialSource?.url ?? "https://www.cbn.gov.ng/rates/ExchRateByCurrency.html";
const AWAJIS_URL = LIVE_FUEL.source?.url ?? "https://awajis.com/fuel-price-in-nigeria-today/";

/** Both series are NGN per US$, so one shared value axis is honest. */
export const FX_HISTORY_SERIES: ChartSeriesSpec[] = [
  {
    dataset: "parallel-usd-ngn-buy",
    label: "Parallel USD buy (Aboki indicative quote)",
    shortLabel: "Parallel USD buy",
    fractionDigits: 0,
    marker: "circle",
    tone: "primary",
    sourceName: "Aboki Forex",
    sourceUrl: ABOKI_URL,
  },
  {
    dataset: "cbn-usd-ngn",
    label: "CBN NFEM USD (official closing rate)",
    shortLabel: "CBN official USD",
    fractionDigits: 2,
    marker: "square",
    dash: "6 3",
    tone: "sky",
    sourceName: "Central Bank of Nigeria",
    sourceUrl: CBN_URL,
  },
];

/** Wholesale depot medians, both NGN per litre: one shared axis. Never a pump price. */
export const FUEL_HISTORY_SERIES: ChartSeriesSpec[] = [
  {
    dataset: "fuel-depot-petrol",
    label: "Depot petrol median (PMS, wholesale)",
    shortLabel: "Depot petrol (PMS)",
    unitSuffix: "/L",
    marker: "circle",
    tone: "primary",
    sourceName: "Awajis / petroleumprice.ng",
    sourceUrl: AWAJIS_URL,
  },
  {
    dataset: "fuel-depot-diesel",
    label: "Depot diesel median (AGO, wholesale)",
    shortLabel: "Depot diesel (AGO)",
    unitSuffix: "/L",
    marker: "triangle",
    dash: "6 3",
    tone: "amber",
    sourceName: "Awajis / petroleumprice.ng",
    sourceUrl: AWAJIS_URL,
  },
];

/** LPG is priced per kg, so it gets its own axis instead of being mixed into the litre chart. */
export const LPG_HISTORY_SERIES: ChartSeriesSpec[] = [
  {
    dataset: "fuel-depot-lpg",
    label: "Depot cooking gas median (LPG, wholesale)",
    shortLabel: "Depot LPG",
    unitSuffix: "/kg",
    marker: "diamond",
    dash: "2 3",
    tone: "violet",
    sourceName: "Awajis / petroleumprice.ng",
    sourceUrl: AWAJIS_URL,
  },
];

export function HistorySection({
  id,
  title,
  description,
  unit,
  series,
  only,
  maxPoints = MAX_HISTORY_POINTS_PER_DATASET,
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
  return (
    <HistoryChart
      id={id}
      title={title}
      description={description}
      unit={unit}
      series={chartSeries}
      nowMs={nowMs}
      maxPoints={maxPoints}
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
