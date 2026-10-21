import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ChangeBadge } from "@/components/live/change-badge";
import { ChartPointsTable } from "@/components/live/chart-points-table";
import { Freshness } from "@/components/live/freshness";
import { HistoryChart } from "@/components/live/history-chart";
import { ShareControls } from "@/components/share-controls";
import { SITE_CONFIG } from "@/config/site";
import {
  CHART_PAGES,
  chartPageBySlug,
  chartPagePath,
  chartPagesForDatasets,
  type ChartPage,
} from "@/lib/chart-pages";
import { formatChartValue } from "@/lib/chart-series";
import { MAX_HISTORY_POINTS_PER_DATASET, datasetHistoryPoints, latestDatasetDelta } from "@/lib/live";
import { DATASET_REGISTRY, stateLabel } from "@/lib/source-registry";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { formatShareDate } from "@/lib/share";
import { formatWatFull } from "@/lib/utils";

/** Every chart page is a static HTML file: the export knows the full slug list up front. */
export const dynamicParams = false;

export function generateStaticParams() {
  return CHART_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const chartPage = chartPageBySlug(slug);
  if (!chartPage) return {};
  return pageMetadata({
    path: chartPagePath(chartPage),
    title: chartPage.metaTitle,
    description: chartPage.metaDescription,
    keywords: [`${chartPage.name} chart`, "naira chart", "nigeria price history", chartPage.dataset],
  });
}

function PageBody({ chartPage }: { chartPage: ChartPage }) {
  const registry = DATASET_REGISTRY.find((dataset) => dataset.id === chartPage.registryId);
  const state = registry?.state ?? "unavailable";
  const stateText = stateLabel[state];
  const points = datasetHistoryPoints(chartPage.dataset);
  const latest = points.at(-1) ?? null;
  const earliest = points[0] ?? null;
  const delta = latestDatasetDelta(chartPage.dataset);
  const nowMs = Date.now();
  const sourceName = chartPage.spec.sourceName ?? registry?.sourceName ?? "Monitor source";
  const sourceUrl = chartPage.spec.sourceUrl ?? registry?.sourceUrl;
  const related = chartPagesForDatasets(chartPage.related);
  const path = chartPagePath(chartPage);
  const shareSummary = latest
    ? `${points.length} stored readings · latest reading ${formatShareDate(latest.sourceTime)}`
    : "no stored readings yet";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Charts", href: "/charts" }, { label: chartPage.name }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={state === "live" || state === "recent" ? "accent" : "muted"}>{stateText}</Badge>
          <span className="text-xs font-medium text-muted-foreground">
            Plotted only from stored monitor readings · {chartPage.unitLabel}
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{chartPage.h1}</h1>
        <p className="text-muted-foreground">{chartPage.summary}</p>
        <Freshness asOf={latest?.sourceTime ?? null} label="Source as of" source={sourceName} state={state} />
        <ShareControls placement="inline" title={`${chartPage.name} chart`} url={absUrl(path)} summary={shareSummary} />
      </header>

      <section aria-labelledby="latest-reading" className="grid gap-3 sm:grid-cols-3">
        <h2 id="latest-reading" className="sr-only">
          Latest stored reading
        </h2>
        <Card className="sm:col-span-2">
          <CardHeader className="pb-2">
            <h3 className="text-sm font-bold">Latest stored reading</h3>
            <p className="text-xs text-muted-foreground">
              {points.length} of {MAX_HISTORY_POINTS_PER_DATASET} retained observations for this series
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-2xl font-extrabold tabular-nums">
                {latest
                  ? formatChartValue(latest.value, chartPage.spec.fractionDigits, chartPage.spec.unitSuffix)
                  : "Unavailable"}
              </span>
              <ChangeBadge
                delta={delta}
                unitSuffix={chartPage.spec.unitSuffix}
                fractionDigits={chartPage.spec.fractionDigits}
                showNoPrior={true}
              />
            </div>
            {latest ? (
              <p className="text-[11px] text-muted-foreground">
                Reading time {formatWatFull(Date.parse(latest.sourceTime))} · recorded{" "}
                {latest.observedAt.slice(0, 16).replace("T", " ")} UTC
                {earliest && earliest !== latest ? ` · series starts ${formatWatFull(Date.parse(earliest.sourceTime))}` : ""}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                No successful reading has been stored for this dataset yet. The chart stays empty rather than guessing.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              The change badge compares the latest reading with the immediately preceding stored reading, never with a
              build time or an estimate.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-bold">Source</h3>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="font-medium">{sourceName}</p>
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="break-all font-medium text-primary underline-offset-2 hover:underline"
              >
                Open the source page
              </a>
            ) : null}
            <p className="text-muted-foreground">{registry?.method ?? "Parsed by the NaijaCheck monitor."}</p>
            {registry?.limitation ? <p className="text-muted-foreground">Limitation: {registry.limitation}</p> : null}
            <p className="text-muted-foreground">{registry?.cadence ?? "Attempted every 3 hours."}</p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="chart" className="space-y-3">
        <h2 id="chart" className="text-xl font-bold">
          Chart
        </h2>
        <p className="text-sm text-muted-foreground">
          Hover, drag a finger across the plot, or focus it and use ← → (Home and End jump to the ends). The crosshair
          snaps to the nearest stored reading — never to a price between two readings — and the price tag above the
          plot, the pill on the value axis, the time pill under the plot and the detail row all repeat that
          reading&apos;s own value, WAT time and change against the previous plotted reading. Let go (or move the
          mouse away) and it returns to the latest reading. 7D, 30D and ALL filter to readings that actually exist; a
          range with fewer than two stored readings stays disabled and says why.
        </p>
        <HistoryChart
          id={`chart-${chartPage.slug}`}
          title={`${chartPage.name} — stored readings`}
          description={`${chartPage.summary} The horizontal axis is the source's own reading time, so a missed reading appears as a gap.`}
          unit={chartPage.unitLabel}
          series={[{ spec: chartPage.spec, points }]}
          nowMs={nowMs}
          maxPoints={MAX_HISTORY_POINTS_PER_DATASET}
          size="large"
          showWindowToggle
        />
      </section>

      <section aria-labelledby="points" className="space-y-3">
        <h2 id="points" className="text-xl font-bold">
          Every stored reading
        </h2>
        <p className="text-sm text-muted-foreground">
          The same rows the chart is drawn from, newest first, with the source and the dataset&apos;s current
          verification state. Scroll the table if it is wider than your screen.
        </p>
        <ChartPointsTable
          id={`table-${chartPage.slug}`}
          spec={chartPage.spec}
          points={points}
          maxPoints={MAX_HISTORY_POINTS_PER_DATASET}
          sourceName={sourceName}
          sourceUrl={sourceUrl}
          currentStateLabel={stateText}
        />
      </section>

      <section aria-labelledby="how" className="space-y-2 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="how" className="text-base font-bold">
          How to read this page honestly
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Retention keeps the most recent {MAX_HISTORY_POINTS_PER_DATASET} verified observations for this dataset. When a
            new reading arrives, the oldest is dropped, so this is a rolling window rather than a full archive.
          </li>
          <li>Only a successful monitor parse is appended. Duplicate readings with the same source time and value are ignored.</li>
          <li>No value is estimated between two readings, and a missing day is not filled in.</li>
          <li>
            Storage is a committed static file, not a paid database and not a KV namespace. Adding these pages did not
            introduce any scheduled write.
          </li>
        </ul>
        <p className="text-muted-foreground">
          Source health, stale flags and the datasets that are not auto-monitored live on{" "}
          <Link href="/status" className="font-semibold text-primary underline underline-offset-2">
            /status
          </Link>
          . Nothing on this page changes DNS, retention or the monitor schedule.
        </p>
      </section>

      <section aria-labelledby="faq" className="space-y-2 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="faq" className="text-base font-bold">
          Questions about this chart (true answers only)
        </h2>
        <div className="space-y-3 text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground">Why might 7D or 30D be disabled?</h3>
            <p>
              Timeframes filter only readings that actually exist. If fewer than two stored readings fall inside the last 7
              or 30 days, that toggle is disabled and the page says so (e.g. “Need 2 readings in last 7 days, have 1”).
              The archive started 2026-10-09 and grows only from real monitor parses — we do not invent older points to
              unlock the toggle.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Why does the line have a gap?</h3>
            <p>
              A gap means no successful parse was stored at that time. The horizontal axis is the source’s own reading
              time, so a missed check leaves a visible gap — we never interpolate or draw a flat line across it.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Why is the change badge “—” or “no prior reading”?</h3>
            <p>
              The change badge compares the latest reading with the immediately preceding stored reading. With fewer than
              two readings, there is no prior point to compare, so it shows “No prior reading” instead of guessing.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Can I get older history (e.g. 2015 dollar)?</h3>
            <p>
              Not from this page. We do not scrape or fabricate historical “dollar in 2015” series from blogs. The table
              below is the honest archive: collection started 2026-10-09, up to {MAX_HISTORY_POINTS_PER_DATASET} per dataset,
              and it grows as the monitor records real checks. No “complete from 1999” claim is made.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Where do I see how often this is checked?</h3>
            <p>
              On <Link href="/status" className="font-semibold text-primary underline underline-offset-2">/status</Link> — each
              dataset shows last check time, source time, cadence (every 3 hours attempted), stale/seeded flags and
              limitations. The FX hub at{" "}
              <Link href="/rates" className="font-semibold text-primary underline underline-offset-2">/rates</Link> and the
              fuel hub at{" "}
              <Link href="/prices/fuel" className="font-semibold text-primary underline underline-offset-2">/prices/fuel</Link>{" "}
              explain what is stored and what is not.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="hub-links" className="space-y-2 rounded-xl border p-4 text-sm">
        <h2 id="hub-links" className="text-base font-bold">
          More history hubs
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          <li>
            <Link href="/rates" className="font-semibold text-primary underline-offset-2 hover:underline">
              FX rates &amp; history hub (/rates)
            </Link>
          </li>
          <li>
            <Link href="/rates/history" className="font-semibold text-primary underline-offset-2 hover:underline">
              FX archive table (/rates/history)
            </Link>
          </li>
          <li>
            <Link href="/prices/fuel" className="font-semibold text-primary underline-offset-2 hover:underline">
              Fuel depot history hub (/prices/fuel)
            </Link>
          </li>
          <li>
            <Link href="/charts" className="text-muted-foreground underline-offset-2 hover:underline">
              All charts
            </Link>
          </li>
          <li>
            <Link href="/status" className="text-muted-foreground underline-offset-2 hover:underline">
              Data status
            </Link>
          </li>
        </ul>
      </section>

      {related.length ? (
        <section aria-labelledby="related" className="space-y-2">
          <h2 id="related" className="text-xl font-bold">
            Related charts
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {related.map((page) => (
              <li key={page.slug}>
                <Link href={chartPagePath(page)} className="font-semibold text-primary underline-offset-2 hover:underline">
                  {page.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/charts" className="text-muted-foreground underline-offset-2 hover:underline">
                All charts
              </Link>
            </li>
            <li>
              <Link href="/status" className="text-muted-foreground underline-offset-2 hover:underline">
                Back to data status
              </Link>
            </li>
          </ul>
        </section>
      ) : null}

      <JsonLd
        data={[
          breadcrumbSchema(path, chartPage.name),
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: chartPage.metaTitle,
            description: chartPage.metaDescription,
            url: absUrl(path),
            inLanguage: "en-NG",
            isAccessibleForFree: true,
            creator: { "@type": "Organization", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            variableMeasured: chartPage.unitLabel,
            ...(latest && earliest
              ? { temporalCoverage: `${earliest.sourceTime}/${latest.sourceTime}` }
              : {}),
            ...(sourceUrl ? { isBasedOn: sourceUrl } : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Why might 7D or 30D be disabled?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Timeframes filter only readings that actually exist. If fewer than two stored readings fall inside the last 7 or 30 days, that toggle is disabled and the page says so. The archive started 2026-10-09 and grows only from real monitor parses.",
                },
              },
              {
                "@type": "Question",
                name: "Why does the line have a gap?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "A gap means no successful parse was stored at that time. The horizontal axis is the source's own reading time, so a missed check leaves a visible gap — we never interpolate.",
                },
              },
              {
                "@type": "Question",
                name: "Can I get older history (e.g. 2015 dollar)?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Not from this page. We do not scrape or fabricate historical dollar series. The table below is the honest archive from 2026-10-09, up to 56 per dataset, growing as the monitor records real checks.",
                },
              },
            ],
          },
        ]}
      />
    </div>
  );
}

export default async function ChartPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chartPage = chartPageBySlug(slug);
  if (!chartPage) notFound();
  return <PageBody chartPage={chartPage} />;
}
