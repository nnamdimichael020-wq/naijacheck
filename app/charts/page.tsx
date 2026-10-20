import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ChangeBadge } from "@/components/live/change-badge";
import { MiniSparkline } from "@/components/live/sparkline";
import { ShareControls } from "@/components/share-controls";
import { CHART_PAGES, chartPagePath } from "@/lib/chart-pages";
import { formatChartValue } from "@/lib/chart-series";
import { MAX_HISTORY_POINTS_PER_DATASET, datasetHistoryPoints, latestDatasetDelta } from "@/lib/live";
import { SITE_CONFIG } from "@/config/site";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { DATASET_REGISTRY, stateLabel } from "@/lib/source-registry";

export const metadata: Metadata = pageMetadata({
  path: "/charts",
  title: "Price charts — every stored reading, no interpolation",
  description:
    "Dedicated naira charts for the parallel USD buy quote, the CBN NFEM rate and wholesale depot petrol, diesel and LPG. Only readings the monitor stored are drawn; gaps stay gaps.",
  keywords: ["naira price charts", "parallel dollar chart nigeria", "cbn nfem chart", "depot fuel price chart"],
});

export default function ChartsIndexPage() {
  const registryState = (id: string) => DATASET_REGISTRY.find((dataset) => dataset.id === id)?.state ?? "unavailable";
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Charts" }]} />
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Price charts</h1>
        <p className="text-muted-foreground">
          Each page below draws one monitored series from the readings the monitor actually stored. There is no
          smoothing, no interpolation and no backfilled point: if a source was not read, the chart shows a gap. Every
          series keeps at most its last {MAX_HISTORY_POINTS_PER_DATASET} verified observations, so{" "}
          <Link href="/status" className="font-semibold text-primary underline underline-offset-2">
            /status
          </Link>{" "}
          shows the same counts.
        </p>
        <ShareControls
          placement="inline"
          title="NaijaCheck price charts"
          url={absUrl("/charts")}
          summary={`${CHART_PAGES.length} monitored series, plotted only from stored readings`}
        />
      </header>

      <section aria-labelledby="chart-list" className="space-y-3">
        <h2 id="chart-list" className="text-xl font-bold">
          Series with a dedicated chart page
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {CHART_PAGES.map((page) => {
            const points = datasetHistoryPoints(page.dataset);
            const latest = points.at(-1);
            const delta = latestDatasetDelta(page.dataset);
            const state = registryState(page.registryId);
            return (
              <li key={page.slug}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-base font-bold leading-tight">
                        <Link href={chartPagePath(page)} className="hover:text-primary hover:underline">
                          {page.name}
                        </Link>
                      </h3>
                      <Badge variant={state === "live" || state === "recent" ? "accent" : "muted"}>{stateLabel[state]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{page.unitLabel}</p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-base font-extrabold tabular-nums">
                        {latest ? formatChartValue(latest.value, page.spec.fractionDigits, page.spec.unitSuffix) : "Unavailable"}
                      </span>
                      <ChangeBadge
                        delta={delta}
                        unitSuffix={page.spec.unitSuffix}
                        fractionDigits={page.spec.fractionDigits}
                        showNoPrior={true}
                      />
                    </div>
                    <MiniSparkline
                      dataset={page.dataset}
                      label={page.name}
                      tone={page.spec.tone}
                      unitSuffix={page.spec.unitSuffix}
                      fractionDigits={page.spec.fractionDigits}
                    />
                    <p className="tabular-nums text-muted-foreground">
                      {points.length} / {MAX_HISTORY_POINTS_PER_DATASET} stored readings ·{" "}
                      <Link href={chartPagePath(page)} className="font-semibold text-primary hover:underline">
                        Open chart
                      </Link>
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="chart-rules" className="space-y-2 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="chart-rules" className="text-base font-bold">
          What these pages will never do
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Draw a line from fewer than two stored readings. The page says so instead.</li>
          <li>Fill a missed reading, average two readings into a new one, or extend a line to “today”.</li>
          <li>Call a seeded, manual or stale figure live. Every page carries the verification label from the source registry.</li>
          <li>Mix the parallel quote with the official CBN rate, or wholesale depot medians with pump prices.</li>
        </ul>
        <p className="text-muted-foreground">
          Data status, source health and review flags stay on{" "}
          <Link href="/status" className="font-semibold text-primary underline underline-offset-2">
            /status
          </Link>
          .
        </p>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/charts", "Charts"),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "NaijaCheck price charts",
            url: absUrl("/charts"),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            description: "Dedicated pages plotting only stored monitor readings, with no interpolation.",
          },
        ]}
      />
    </div>
  );
}
