/**
 * Presentation metadata for the stored-history charts.
 *
 * This module is deliberately free of React and of any charting dependency: it only describes
 * *how* a real dataset is labelled, which tone/dash/marker distinguishes it without relying on
 * colour alone, and how a naira value is formatted. The numbers themselves always come from
 * `data/history.json` through `lib/live.ts`.
 */
import { LIVE_FUEL, LIVE_FX } from "@/lib/live";
import type { HistoryPoint } from "@/lib/history";
import type { SeriesMarker, SeriesTone } from "@/lib/chart-format";

export type { SeriesMarker, SeriesTone } from "@/lib/chart-format";

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

/* Tone classes and value formatting live in lib/chart-format.ts so browser components never need
 * the live JSON snapshots that this module imports; they are re-exported here for every caller. */
export { TONE_CLASS, axisDigits, formatChartValue } from "@/lib/chart-format";

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

/** Every series spec the site knows about, in a stable order. */
export const ALL_HISTORY_SERIES: ChartSeriesSpec[] = [
  ...FX_HISTORY_SERIES,
  ...FUEL_HISTORY_SERIES,
  ...LPG_HISTORY_SERIES,
];

export function historySeriesSpec(dataset: string): ChartSeriesSpec | null {
  return ALL_HISTORY_SERIES.find((spec) => spec.dataset === dataset) ?? null;
}
