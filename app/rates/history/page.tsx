import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { ChartPointsTable } from "@/components/live/chart-points-table";
import { CHART_PAGES, chartPagePath } from "@/lib/chart-pages";
import { MAX_HISTORY_POINTS_PER_DATASET, datasetHistoryPoints } from "@/lib/live";
import { SITE_CONFIG } from "@/config/site";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { DATASET_REGISTRY, stateLabel } from "@/lib/source-registry";
import { formatWatFull } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  path: "/rates/history",
  title: "Naira to Dollar History Archive — All Stored CBN & Parallel FX Readings (Nigeria)",
  description:
    "Complete archive of stored naira to dollar readings: CBN official NFEM and parallel buy quote in NGN per US$, with WAT time, source and state for every point. Only real monitor readings — no interpolation.",
  keywords: [
    "naira dollar history archive",
    "CBN rate history table",
    "parallel market history Nigeria",
    "dollar to naira past rates",
    "black market history table",
  ],
});

export default function RatesHistoryPage() {
  const parallelPoints = datasetHistoryPoints("parallel-usd-ngn-buy");
  const cbnPoints = datasetHistoryPoints("cbn-usd-ngn");
  const parallelReg = DATASET_REGISTRY.find((d) => d.id === "parallel-fx")!;
  const cbnReg = DATASET_REGISTRY.find((d) => d.id === "cbn-usd")!;
  const parallelSpec = CHART_PAGES.find((p) => p.slug === "parallel-usd-buy")!.spec;
  const cbnSpec = CHART_PAGES.find((p) => p.slug === "cbn-usd")!.spec;
  const earliest = [parallelPoints[0]?.sourceTime, cbnPoints[0]?.sourceTime].filter(Boolean).sort()[0] as string | undefined;
  const latest = [parallelPoints.at(-1)?.sourceTime, cbnPoints.at(-1)?.sourceTime].filter(Boolean).sort().pop() as string | undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FX rates & history", href: "/rates" }, { label: "History archive" }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">Archive · every stored reading</Badge>
          <span className="text-xs font-medium text-muted-foreground">{parallelPoints.length + cbnPoints.length} FX readings stored · archive from 2026-10-09</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Naira to dollar history archive — every stored CBN &amp; parallel reading</h1>
        <p className="text-muted-foreground">
          This is the FX archive: every naira-per-dollar reading the monitor actually stored for the official CBN NFEM rate
          and the indicative parallel (Aboki) buy quote. No scraping of “dollar in 2015” blogs, no interpolation between
          readings, no backfill. A day with no successful parse simply does not appear — the gap is the truth.
        </p>
        {earliest && latest ? (
          <p className="text-xs text-muted-foreground">
            Earliest stored reading {formatWatFull(Date.parse(earliest))} → latest {formatWatFull(Date.parse(latest))}. Retention: last{" "}
            {MAX_HISTORY_POINTS_PER_DATASET} per dataset; the archive grows as real checks arrive.
          </p>
        ) : null}
        <ShareControls placement="inline" title="Naira to dollar history archive" url={absUrl("/rates/history")} summary={`${parallelPoints.length} parallel + ${cbnPoints.length} CBN stored readings`} />
      </header>

      <section aria-labelledby="overview" className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Parallel USD buy (Aboki indicative)</CardTitle>
            <p className="text-xs text-muted-foreground">
              {parallelPoints.length} / {MAX_HISTORY_POINTS_PER_DATASET} readings · {stateLabel[parallelReg.state]} · {parallelReg.sourceName}
            </p>
          </CardHeader>
          <CardContent className="text-xs">
            <p className="text-muted-foreground">Newest: {parallelPoints.at(-1) ? formatWatFull(Date.parse(parallelPoints.at(-1)!.sourceTime)) : "—"} · {parallelReg.cadence}</p>
            <Link href="/charts/parallel-usd-buy" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline">Open parallel chart &amp; scrub →</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">CBN official USD (NFEM)</CardTitle>
            <p className="text-xs text-muted-foreground">
              {cbnPoints.length} / {MAX_HISTORY_POINTS_PER_DATASET} readings · {stateLabel[cbnReg.state]} · {cbnReg.sourceName}
            </p>
          </CardHeader>
          <CardContent className="text-xs">
            <p className="text-muted-foreground">Newest: {cbnPoints.at(-1) ? formatWatFull(Date.parse(cbnPoints.at(-1)!.sourceTime)) : "—"} · {cbnReg.cadence}</p>
            <Link href="/charts/cbn-usd" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline">Open CBN chart &amp; scrub →</Link>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="tables" className="space-y-6">
        <h2 id="tables" className="text-xl font-bold">Every stored reading — newest first</h2>
        <p className="text-sm text-muted-foreground">
          The same rows the charts are drawn from, with source time (WAT), value, change vs previous, source and verification
          state. Scroll horizontally on a narrow screen. See{" "}
          <Link href="/rates" className="font-semibold text-primary underline underline-offset-2">the FX hub (/rates)</Link> for
          why official ≠ parallel and how often we check, or{" "}
          <Link href="/status" className="font-semibold text-primary underline underline-offset-2">/status</Link> for live health.
        </p>

        <div className="space-y-2">
          <h3 className="text-base font-bold">Parallel USD buy — {parallelPoints.length} readings</h3>
          <ChartPointsTable id="table-parallel-archive" spec={parallelSpec} points={parallelPoints} maxPoints={MAX_HISTORY_POINTS_PER_DATASET} sourceName={parallelSpec.sourceName ?? parallelReg.sourceName} sourceUrl={parallelSpec.sourceUrl ?? parallelReg.sourceUrl} currentStateLabel={stateLabel[parallelReg.state]} />
          <p className="text-xs text-muted-foreground">
            Source: <a href="https://abokiforex.app/" target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">Aboki Forex</a> · indicative quote, not a CBN rate.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold">CBN official USD (NFEM) — {cbnPoints.length} readings</h3>
          <ChartPointsTable id="table-cbn-archive" spec={cbnSpec} points={cbnPoints} maxPoints={MAX_HISTORY_POINTS_PER_DATASET} sourceName={cbnSpec.sourceName ?? cbnReg.sourceName} sourceUrl={cbnSpec.sourceUrl ?? cbnReg.sourceUrl} currentStateLabel={stateLabel[cbnReg.state]} />
          <p className="text-xs text-muted-foreground">
            Source: <a href="https://www.cbn.gov.ng/rates/ExchRateByCurrency.html" target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">CBN rates page</a> · NFEM-rate column only.
          </p>
        </div>
      </section>

      <section aria-labelledby="retain" className="space-y-2 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="retain" className="text-base font-bold">How this archive is built (honestly)</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Every row comes from <code>data/history.json</code> — the monitor appends only after a successful parse that yields a new sourceTime/value.</li>
          <li>No point before 2026-10-09 is claimed. We do not invent a “2015 black market” series from blogs.</li>
          <li>Retention: last {MAX_HISTORY_POINTS_PER_DATASET} per dataset; oldest dropped when newest arrives. At full retention the file is about 171 KB — zero-cost, no paid DB.</li>
          <li>Gaps are real. If a source was unreachable, that time simply has no row.</li>
          <li>Charts, cards and this archive read the same store — they cannot disagree.</li>
        </ul>
      </section>

      <section aria-labelledby="fuel-link" className="space-y-2 rounded-xl border p-4 text-sm">
        <h2 id="fuel-link" className="text-base font-bold">Fuel depot history is separate</h2>
        <p className="text-muted-foreground">
          Depot (gantry) petrol, diesel and LPG are wholesale fuel medians — not pump prices. Their history lives on{" "}
          <Link href="/prices/fuel" className="font-semibold text-primary underline underline-offset-2">the fuel history hub (/prices/fuel)</Link>
          {" and "}
          {CHART_PAGES.filter((p) => p.dataset.startsWith("fuel-") || p.dataset.startsWith("fuel-depot")).map((p, i) => (
            <span key={p.slug}>{i ? ", " : null}<Link href={chartPagePath(p)} className="font-semibold text-primary underline-offset-2 hover:underline">{p.name} chart</Link></span>
          ))}
          . Depot ≠ pump is explained there with the same honesty rules.
        </p>
      </section>

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Related</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li><Link href="/rates" className="font-semibold text-primary underline-offset-2 hover:underline">FX rates &amp; history hub</Link></li>
          <li><Link href="/charts" className="font-semibold text-primary underline-offset-2 hover:underline">All price charts</Link></li>
          <li><Link href="/prices/fuel" className="font-semibold text-primary underline-offset-2 hover:underline">Fuel depot history</Link></li>
          <li><Link href="/status" className="font-semibold text-primary underline-offset-2 hover:underline">Data status</Link></li>
        </ul>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/rates/history", "FX history archive"),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Naira to Dollar History Archive — All Stored CBN & Parallel FX Readings",
            description: "Every stored naira to dollar reading for CBN NFEM and parallel buy quote, with source time and state. Only real monitor readings.",
            url: absUrl("/rates/history"),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            ...(earliest && latest ? { temporalCoverage: `${earliest}/${latest}` } : {}),
          },
        ]}
      />
    </div>
  );
}
