/**
 * Registry of the dedicated chart pages (`/charts/...`).
 *
 * Each page is a thin shell around one stored dataset. The dataset id must exist in
 * `data/history.json`-backed helpers; when it holds fewer than two stored readings the page shows
 * the shared honest empty state instead of a line. Nothing here invents history or changes the
 * verification state that `lib/source-registry.ts` calculates.
 */
import {
  FX_HISTORY_SERIES,
  FUEL_HISTORY_SERIES,
  LPG_HISTORY_SERIES,
  historySeriesSpec,
  type ChartSeriesSpec,
} from "@/lib/chart-series";

export type ChartPage = {
  /** URL segment under /charts/. */
  slug: string;
  /** Dataset id in data/history.json. */
  dataset: string;
  /** Matching id in lib/source-registry.ts, used for the verification badge. */
  registryId: string;
  spec: ChartSeriesSpec;
  /** Human name used in links and breadcrumbs. */
  name: string;
  /** The page's only H1. */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Short factual paragraph under the heading. */
  summary: string;
  /** Unit shown in prose, e.g. "₦ per US$". */
  unitLabel: string;
  /** Slugs of related chart pages. */
  related: string[];
};

const need = (dataset: string): ChartSeriesSpec => {
  const spec = historySeriesSpec(dataset);
  if (!spec) throw new Error(`No chart series spec for dataset "${dataset}"`);
  return spec;
};

export const CHART_PAGES: ChartPage[] = [
  {
    slug: "parallel-usd-buy",
    dataset: "parallel-usd-ngn-buy",
    registryId: "parallel-fx",
    spec: need("parallel-usd-ngn-buy"),
    name: "Parallel USD buy",
    h1: "Parallel USD buy chart (₦ per US$)",
    metaTitle: "Parallel USD buy chart — stored readings, no interpolation",
    metaDescription:
      "Every stored parallel-market USD buy reading from Aboki Forex, plotted in naira per US$ with real gaps kept as gaps. A third-party indicative quote, not a CBN rate.",
    summary:
      "The indicative parallel-market buy quote the monitor parsed from Aboki Forex. It is a third-party quote, not a CBN rate and not a guaranteed dealer price.",
    unitLabel: "₦ per US$",
    related: ["cbn-usd"],
  },
  {
    slug: "cbn-usd",
    dataset: "cbn-usd-ngn",
    registryId: "cbn-usd",
    spec: need("cbn-usd-ngn"),
    name: "CBN official USD",
    h1: "CBN NFEM USD chart (₦ per US$)",
    metaTitle: "CBN NFEM USD chart — official closing readings",
    metaDescription:
      "Official CBN NFEM USD/NGN closing readings stored by NaijaCheck, with the source's own date and time. No interpolation and no parallel-market values mixed in.",
    summary:
      "The official CBN NFEM closing rate the monitor parsed from the CBN exchange-rate page. It is a separate market from the parallel quote and is never averaged with it.",
    unitLabel: "₦ per US$",
    related: ["parallel-usd-buy"],
  },
  {
    slug: "depot-petrol",
    dataset: "fuel-depot-petrol",
    registryId: "fuel-depot",
    spec: need("fuel-depot-petrol"),
    name: "Depot petrol median",
    h1: "Depot petrol median chart (₦ per litre)",
    metaTitle: "Depot petrol median chart — wholesale PMS readings",
    metaDescription:
      "Wholesale depot petrol (PMS) medians in naira per litre, plotted only from readings the monitor parsed. These are gantry prices, not station pump prices.",
    summary:
      "A national median of the wholesale depot/gantry petrol prices published in the parsed depot tables. It is not a station pump price; fuel pages show the same series so the numbers cannot disagree.",
    unitLabel: "₦ per litre",
    related: ["depot-diesel", "depot-lpg"],
  },
  {
    slug: "depot-diesel",
    dataset: "fuel-depot-diesel",
    registryId: "fuel-depot",
    spec: need("fuel-depot-diesel"),
    name: "Depot diesel median",
    h1: "Depot diesel median chart (₦ per litre)",
    metaTitle: "Depot diesel median chart — wholesale AGO readings",
    metaDescription:
      "Wholesale depot diesel (AGO) medians in naira per litre from stored monitor readings only. Gantry prices, not pump prices, with every gap left visible.",
    summary:
      "A national median of the wholesale depot/gantry diesel (AGO) prices published in the parsed depot tables. Generator running-cost pages use the same stored series.",
    unitLabel: "₦ per litre",
    related: ["depot-petrol", "depot-lpg"],
  },
  {
    slug: "depot-lpg",
    dataset: "fuel-depot-lpg",
    registryId: "fuel-depot",
    spec: need("fuel-depot-lpg"),
    name: "Depot cooking gas median",
    h1: "Depot cooking gas (LPG) median chart (₦ per kg)",
    metaTitle: "Depot cooking gas median chart — wholesale LPG readings",
    metaDescription:
      "Wholesale depot cooking gas (LPG) medians in naira per kilogram from stored monitor readings. LPG is priced per kg, so it is never mixed into the per-litre chart.",
    summary:
      "A national median of the wholesale depot/gantry cooking gas (LPG) prices published in the parsed depot tables. LPG is priced per kilogram, so it is charted on its own axis.",
    unitLabel: "₦ per kilogram",
    related: ["depot-petrol", "depot-diesel"],
  },
];

export const CHART_PAGE_SLUGS: string[] = CHART_PAGES.map((page) => page.slug);

export function chartPageBySlug(slug: string): ChartPage | null {
  return CHART_PAGES.find((page) => page.slug === slug) ?? null;
}

export function chartPageForDataset(dataset: string): ChartPage | null {
  return CHART_PAGES.find((page) => page.dataset === dataset) ?? null;
}

export function chartPagePath(page: ChartPage): string {
  return `/charts/${page.slug}`;
}

/** Chart pages that belong to one multi-series group, in registry order. */
export function chartPagesForDatasets(datasets: string[]): ChartPage[] {
  return datasets
    .map((dataset) => chartPageForDataset(dataset))
    .filter((page): page is ChartPage => page !== null);
}

/** Only used by tests and the sitemap: every spec here must be a real stored dataset name. */
export const CHART_PAGE_DATASETS: string[] = [ ...FX_HISTORY_SERIES, ...FUEL_HISTORY_SERIES, ...LPG_HISTORY_SERIES ].map(
  (spec) => spec.dataset,
);
